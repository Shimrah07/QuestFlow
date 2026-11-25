import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { NAV_SECTIONS } from "./navigation";
import { ProgressRing, XpMeter, levelProgress } from "../ui/primitives";

/**
 * Left navigation. Rendered inline on desktop and inside a drawer on smaller screens
 * (DashboardLayout decides which). `onNavigate` lets the drawer close after a click.
 */
const Sidebar = ({ onNavigate, idPrefix = "desktop" }) => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    if (!user || user.role === "Employee") return;
    try {
      const response = await api.get("/expenses");
      const pending = response.data.filter((e) => e.status === "Pending");
      setPendingCount(pending.length);
    } catch {
      // ignore silently if network fails
    }
  };

  useEffect(() => {
    fetchPendingCount();

    const handleUpdate = () => fetchPendingCount();
    window.addEventListener("approvals-updated", handleUpdate);
    const interval = setInterval(fetchPendingCount, 10000);

    return () => {
      window.removeEventListener("approvals-updated", handleUpdate);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const badges = { pending: pendingCount };
  const points = user?.points || 0;
  const { inLevel, pct } = levelProgress(points);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className="display text-[1.0625rem] font-semibold text-fg">QuestFlow</span>
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="flex-1 overflow-y-auto scrollbar-none px-3 pb-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => item.roles.includes(user?.role));
          if (!items.length) return null;
          return (
            <div key={section.label} className="mt-5 first:mt-2">
              <p className="px-3 pb-1.5 text-[0.71875rem] font-medium text-fg-subtle">{section.label}</p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const count = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `group relative flex h-9 items-center gap-3 rounded-[10px] px-3 text-[0.875rem] font-medium transition-colors duration-150 ${
                            isActive ? "text-fg" : "text-fg-muted hover:text-fg hover:bg-surface-2/60"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.span
                                layoutId={`${idPrefix}-nav-active`}
                                className="absolute inset-0 rounded-[10px] bg-surface-2 border border-line"
                                transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
                              >
                                <span className="absolute left-0 top-2 bottom-2 w-[3px] -translate-x-[5px] rounded-full bg-accent" />
                              </motion.span>
                            )}
                            <Icon size={18} weight={isActive ? "fill" : "regular"} className={`relative shrink-0 ${isActive ? "text-accent-text" : ""}`} />
                            <span className="relative truncate">{item.label}</span>
                            {count > 0 && (
                              <span
                                className="relative ml-auto num inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] bg-accent px-1.5 text-[0.6875rem] font-semibold text-accent-ink"
                                aria-label={`${count} pending`}
                              >
                                {count}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Progress card */}
      {user && (
        <div className="shrink-0 p-3">
          <div className="rounded-[14px] border border-line bg-surface p-3">
            <div className="flex items-center gap-3">
              <ProgressRing value={pct} size={42} stroke={3.5}>
                <span className="num text-[0.8125rem] font-semibold text-fg">{user.level}</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{user.first_name}</p>
                <p className="text-xs text-fg-subtle">
                  {user.role} · Level {user.level}
                </p>
              </div>
            </div>
            <XpMeter points={points} className="mt-3" />
            <p className="mt-1.5 flex justify-between text-[0.6875rem] text-fg-subtle">
              <span>Next level</span>
              <span className="num">{inLevel}/500 XP</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
