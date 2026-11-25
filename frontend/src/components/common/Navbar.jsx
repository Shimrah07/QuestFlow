import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  List,
  SignOut,
  CaretDown,
  CheckCircle,
  WarningCircle,
  Info,
  Checks,
  Trash,
  Lightning,
} from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import ThemeToggle from "./ThemeToggle";
import { Avatar, XpMeter, levelProgress, timeAgo } from "../ui/primitives";

/** Small anchored popover that closes on outside click and Escape. Scales from its top-right corner. */
const Popover = ({ open, onClose, children, className = "", label }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.parentElement.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-label={label}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          style={{ transformOrigin: "top right" }}
          className={`absolute right-0 top-full mt-2 z-50 surface bg-surface-2 !rounded-[14px] ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const NOTIF_ICON = {
  success: <CheckCircle size={18} weight="fill" className="text-success" />,
  warning: <WarningCircle size={18} weight="fill" className="text-accent-text" />,
  info: <Info size={18} weight="fill" className="text-info" />,
};

const Navbar = ({ pageTitle = "Dashboard", onOpenMenu }) => {
  const { user, logout } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearAll, hasUnread, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const currentXP = user?.points || 0;
  const { inLevel } = levelProgress(currentXP);

  // "+N XP" pop when points go up during the session (not on sign-in or page load).
  const [seenPoints, setSeenPoints] = useState({ id: user?.id, points: user?.points });
  const [gain, setGain] = useState(null);
  if (user && (seenPoints.id !== user.id || seenPoints.points !== user.points)) {
    if (seenPoints.id === user.id && seenPoints.points != null && user.points > seenPoints.points) {
      setGain({ amount: user.points - seenPoints.points, key: `${user.id}-${user.points}` });
    }
    setSeenPoints({ id: user.id, points: user.points });
  }
  useEffect(() => {
    if (!gain) return;
    const t = setTimeout(() => setGain(null), 1900);
    return () => clearTimeout(t);
  }, [gain]);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Mobile menu + title */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="btn btn-ghost btn-icon -ml-2 lg:hidden"
        aria-label="Open navigation"
      >
        <List size={20} weight="bold" />
      </button>
      <p className="min-w-0 truncate text-[0.9375rem] font-semibold text-fg">
        <span className="hidden text-fg-subtle sm:inline">QuestFlow</span>
        <span className="hidden px-2 text-fg-subtle/60 sm:inline">/</span>
        {pageTitle}
      </p>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        {/* Level meter */}
        {user && (
          <div
            className={`relative mr-2 hidden items-center gap-3 rounded-[10px] border bg-surface px-3 py-1.5 transition-[border-color,box-shadow] duration-300 md:flex ${
              gain ? "border-accent/60 shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_18%,transparent)]" : "border-line"
            }`}
            title={`${inLevel} of 500 XP toward level ${user.level + 1}`}
            data-testid="xp-meter"
          >
            <AnimatePresence>
              {gain && (
                <motion.span
                  key={gain.key}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: -18, scale: 1 }}
                  exit={{ opacity: 0, y: -26, transition: { duration: 0.3 } }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.35 }}
                  className="num pointer-events-none absolute -top-1 right-3 rounded-[6px] bg-accent px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent-ink shadow-sm"
                  data-testid="xp-gain"
                  aria-live="polite"
                >
                  +{gain.amount} XP
                </motion.span>
              )}
            </AnimatePresence>
            <span className="flex items-center gap-1 text-xs font-semibold text-accent-text">
              <Lightning size={14} weight="fill" />
              <span className="num">Lv {user.level}</span>
            </span>
            <XpMeter points={currentXP} className="w-28" />
            <span className="num text-[0.6875rem] text-fg-subtle">{inLevel}/500</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="btn btn-ghost btn-icon relative"
            aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={notifOpen}
            data-testid="notif-bell"
          >
            <Bell size={19} weight="bold" />
            <AnimatePresence>
              {hasUnread && (
                <motion.span
                  key="count"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0.4 }}
                  className="num absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-accent-ink ring-2 ring-bg"
                  data-testid="notif-count"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <Popover open={notifOpen} onClose={() => setNotifOpen(false)} label="Notifications" className="w-[min(22rem,calc(100vw-2rem))]">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-fg">Notifications</span>
              {notifications.length > 0 && (
                <div className="flex gap-1">
                  <button type="button" onClick={markAllAsRead} title="Mark all as read" aria-label="Mark all as read" className="btn btn-ghost btn-sm btn-icon">
                    <Checks size={16} weight="bold" />
                  </button>
                  <button type="button" onClick={clearAll} title="Clear all" aria-label="Clear all notifications" className="btn btn-ghost btn-sm btn-icon hover:!text-danger">
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-[min(24rem,60dvh)] overflow-y-auto p-1.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Bell size={26} weight="duotone" className="text-fg-subtle" />
                  <span className="text-sm text-fg-muted">You're all caught up</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    type="button"
                    key={notif.id}
                    data-testid="notif-item"
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.link) {
                        setNotifOpen(false);
                        navigate(notif.link);
                      }
                    }}
                    className={`row-hover flex w-full items-start gap-3 rounded-[10px] px-2.5 py-2.5 text-left ${notif.read ? "" : "bg-accent/[0.06]"}`}
                  >
                    <span className="mt-0.5 shrink-0">{NOTIF_ICON[notif.type] || NOTIF_ICON.info}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[0.8125rem] font-semibold ${notif.read ? "text-fg-muted" : "text-fg"}`}>{notif.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-fg-muted break-words">{notif.description}</span>
                      <span className="mt-1 block text-[0.6875rem] text-fg-subtle">{notif.createdAt ? timeAgo(notif.createdAt) : notif.time}</span>
                    </span>
                    {!notif.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                  </button>
                ))
              )}
            </div>
          </Popover>
        </div>

        <ThemeToggle />

        {/* Profile menu (kept as the last header button) */}
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              data-testid="profile-menu"
              className="ml-1 flex h-10 items-center gap-2 rounded-[10px] border border-transparent pl-1 pr-2 transition-colors hover:border-line hover:bg-surface"
            >
              <Avatar name={user.first_name} size={30} highlight />
              <span className="hidden flex-col items-start text-left leading-tight md:flex">
                <span className="text-[0.8125rem] font-semibold text-fg">{user.first_name}</span>
                <span className="text-[0.6875rem] text-fg-subtle">{user.role}</span>
              </span>
              <CaretDown size={13} weight="bold" className={`text-fg-subtle transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            <Popover open={dropdownOpen} onClose={() => setDropdownOpen(false)} label="Account" className="w-60 p-1.5">
              <div className="px-2.5 pb-2.5 pt-2">
                <p className="text-xs text-fg-subtle">Signed in as</p>
                <p className="truncate text-sm font-semibold text-fg">{user.email}</p>
              </div>
              <div className="h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="row-hover mt-1 flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm font-medium text-danger"
              >
                <SignOut size={16} weight="bold" />
                Sign out
              </button>
            </Popover>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
