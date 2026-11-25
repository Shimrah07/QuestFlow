import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import api from "../services/api";

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

const STREAM_START_DELAY_MS = 2500;

/** Server shape -> the shape the bell renders. */
const toItem = (n) => ({
  id: n.id,
  key: n.key,
  title: n.title,
  description: n.description,
  type: n.type,
  link: n.link,
  read: n.is_read,
  createdAt: n.created_at,
});

/** Parses one server-sent-events block ("event: x\ndata: {...}"). */
const parseEvent = (block) => {
  let event = "message";
  const data = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return data.length ? { event, data: data.join("\n") } : null;
};

/**
 * Notifications are created by the server when things happen (tasks assigned or finished,
 * claims submitted or decided, level-ups, deadlines). This provider loads the list, keeps a
 * live server-sent-events stream open so new ones arrive within seconds, and syncs read state.
 */
export const NotificationProvider = ({ children }) => {
  const { user, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  // The list carries its owner's id so a sign-out or user switch never shows someone else's list.
  const [state, setState] = useState({ userId: null, items: [] });
  const lastIdRef = useRef(0);

  if ((user?.id ?? null) !== state.userId) {
    setState({ userId: user?.id ?? null, items: [] });
  }

  const addItems = useCallback((incoming) => {
    if (!incoming.length) return;
    lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((n) => n.id));
    setState((prev) => {
      const known = new Set(prev.items.map((n) => n.id));
      const fresh = incoming.filter((n) => !known.has(n.id));
      return fresh.length ? { ...prev, items: [...fresh, ...prev.items].sort((a, b) => b.id - a.id).slice(0, 50) } : prev;
    });
  }, []);

  /** Full reload of the list (also picks up read state changed on another device). */
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/");
      const items = data.map(toItem);
      lastIdRef.current = items.reduce((m, n) => Math.max(m, n.id), lastIdRef.current);
      setState((prev) => ({ ...prev, items }));
    } catch {
      // offline or signed out; the stream or the next focus will retry
    }
  }, []);

  // Load on sign-in, re-sync whenever the tab comes back into view.
  useEffect(() => {
    if (!user) return;
    lastIdRef.current = 0;
    // refresh() only sets state after the network request resolves, which this rule can't see.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // Tidy up storage left by the earlier browser-only version.
    try {
      localStorage.removeItem(`notifications_${user.id}`);
      localStorage.removeItem(`qf_snapshot_${user.id}`);
    } catch {
      /* storage unavailable */
    }
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refresh]);

  // Live stream. The server ends it every few minutes on purpose; we reconnect with a fresh token.
  useEffect(() => {
    if (!user) return;
    let stopped = false;
    let controller = null;
    let timer = null;
    let backoff = 1000;

    // Quest results deserve a moment: a toast, fresh XP in the header (which also lets the
    // level-up celebration fire), and a nudge for any open Quests page to reload.
    const onLiveEvent = (item) => {
      if (!item.key?.startsWith("quest-")) return;
      window.dispatchEvent(new Event("quests-updated"));
      if (item.key.endsWith("-complete")) {
        showToast(`${item.title}. ${item.description}`, "success", 6000);
        refreshUserProfile?.();
      }
    };

    const schedule = (ms) => {
      if (!stopped) timer = setTimeout(connect, ms);
    };

    async function connect() {
      if (stopped) return;
      controller = new AbortController();
      try {
        const token = localStorage.getItem("cyber_access_token");
        const res = await fetch(`${api.defaults.baseURL}/notifications/stream?after=${lastIdRef.current}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (res.status === 401) {
          // Let the API client refresh the access token, then reconnect.
          await api.get("/users/me").catch(() => {});
          throw new Error("unauthorized");
        }
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        backoff = 1000;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf("\n\n")) >= 0) {
            const evt = parseEvent(buffer.slice(0, cut));
            buffer = buffer.slice(cut + 2);
            if (evt?.event === "notification") {
              try {
                const item = toItem(JSON.parse(evt.data));
                addItems([item]);
                onLiveEvent(item);
              } catch {
                /* ignore a malformed event */
              }
            }
          }
        }
        schedule(500); // planned end of stream: reconnect right away
      } catch (err) {
        if (stopped || err?.name === "AbortError") return;
        schedule(backoff);
        backoff = Math.min(backoff * 2, 30000);
      }
    }

    // Open the live channel once the page's own data has loaded. Nothing is missed meanwhile: the
    // stream starts after the newest notification already fetched by refresh().
    schedule(STREAM_START_DELAY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, addItems]);

  const setItems = useCallback((fn) => setState((prev) => (prev.userId ? { ...prev, items: fn(prev.items) } : prev)), []);

  const markAsRead = useCallback(
    (id) => {
      setItems((items) => items.map((n) => (n.id === id ? { ...n, read: true } : n)));
      api.put(`/notifications/${id}/read`).catch(() => {});
    },
    [setItems]
  );
  const markAllAsRead = useCallback(() => {
    setItems((items) => items.map((n) => ({ ...n, read: true })));
    api.put("/notifications/read-all").catch(() => {});
  }, [setItems]);
  const clearAll = useCallback(() => {
    setItems(() => []);
    api.delete("/notifications/").catch(() => {});
  }, [setItems]);

  const notifications = state.userId === user?.id ? state.items : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        markAsRead,
        markAllAsRead,
        clearAll,
        hasUnread: unreadCount > 0,
        unreadCount,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
