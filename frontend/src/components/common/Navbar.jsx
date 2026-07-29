import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Bell, Sparkles, LogOut, ChevronDown, User, CheckCircle, AlertTriangle, Info, Trash2, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { useNotifications } from "../../context/NotificationContext";

const Navbar = ({ pageTitle = "Dashboard" }) => {
  const { user, logout } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearAll, hasUnread } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Computes XP Progress within Level bounds (500 XP per level)
  const currentXP = user?.points || 0;
  const xpInLevel = currentXP % 500;
  const progressPercent = (xpInLevel / 500) * 100;

  return (
    <header className="h-16 border-b border-slate-900/60 bg-bg-deep/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Route Title Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-display font-bold text-lg text-slate-100 uppercase tracking-wider">
          {pageTitle}
        </h2>
      </div>

      {/* Action panel */}
      <div className="flex items-center gap-6">
        {/* Gamified HUD level meter */}
        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="text-xs font-semibold text-neon-emerald flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Level {user.level}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {xpInLevel} / 500 XP
              </span>
            </div>

            <div className="w-32 h-1.5 rounded-full bg-slate-950/60 border border-slate-800 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-neon-violet to-neon-emerald rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
            </div>
          </div>
        )}

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg border border-slate-900 bg-slate-950/40 hover:bg-slate-900/50 hover:border-slate-800 transition-all group cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-400 group-hover:text-neon-violet transition-colors" />
            {hasUnread && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neon-rose rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neon-rose rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              </>
            )}
          </button>

          {/* Notifications Dropdown panel */}
          <AnimatePresence>
            {notifOpen && (
              <>
                <div
                  onClick={() => setNotifOpen(false)}
                  className="fixed inset-0 z-30"
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-900 bg-bg-panel/95 backdrop-blur-md shadow-2xl p-3 z-40 flex flex-col gap-2 max-h-96"
                >
                  <div className="flex items-center justify-between border-b border-slate-900/80 pb-2 mb-1">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      System Notifications
                    </span>
                    {notifications.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={markAllAsRead}
                          title="Mark all as read"
                          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-neon-violet transition-colors cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={clearAll}
                          title="Clear all"
                          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-neon-rose transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 font-sans text-xs flex flex-col items-center gap-2">
                        <Bell className="w-8 h-8 text-slate-600 opacity-60" />
                        <span>No notifications</span>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg transition-all cursor-pointer border ${
                            notif.read
                              ? "bg-slate-950/20 border-transparent hover:bg-slate-950/40"
                              : "bg-neon-violet/5 border-neon-violet/10 hover:bg-neon-violet/10"
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {notif.type === "success" ? (
                              <CheckCircle className="w-4 h-4 text-neon-emerald" />
                            ) : notif.type === "warning" ? (
                              <AlertTriangle className="w-4 h-4 text-neon-amber" />
                            ) : (
                              <Info className="w-4 h-4 text-neon-violet" />
                            )}
                          </div>
                          <div className="flex-grow flex flex-col min-w-0">
                            <span className={`text-xs font-bold truncate ${notif.read ? "text-slate-400" : "text-slate-200"}`}>
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-snug break-words">
                              {notif.description}
                            </span>
                            <span className="text-[8px] text-slate-600 mt-1 font-mono">
                              {notif.time}
                            </span>
                          </div>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 bg-neon-violet rounded-full flex-shrink-0 mt-1.5 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 px-3 rounded-lg border border-slate-900 bg-slate-950/40 hover:bg-slate-900/50 hover:border-slate-800 transition-all"
            >
              <div className="w-7 h-7 rounded-md bg-neon-violet/10 border border-neon-violet/20 flex items-center justify-center text-neon-violet text-xs font-bold uppercase">
                {user.first_name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-xs font-semibold text-slate-200">
                  {user.first_name}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
            </button>

            {/* Profile Dropdown panel */}
            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <div
                    onClick={() => setDropdownOpen(false)}
                    className="fixed inset-0 z-30"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-900 bg-bg-panel/95 backdrop-blur-md shadow-2xl p-2 z-40"
                  >
                    <div className="px-3 py-2 border-b border-slate-900/80 mb-1">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Revoke Authorization
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
