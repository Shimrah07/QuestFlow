import React, { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";
import { pageTitleFor } from "../components/common/navigation";
import LevelUpCelebration from "../components/gamification/LevelUpCelebration";
import ErrorBoundary from "../components/common/ErrorBoundary";

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (adjusted during render, no effect needed)...
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }
  // ...or when Escape is pressed.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Redirect to login if user is not authenticated
  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const pageTitle = pageTitleFor(location.pathname);

  return (
    <div className="flex min-h-[100dvh] bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 self-stretch border-r border-line bg-bg lg:block">
        <div className="sticky top-0 h-[100dvh]">
          <Sidebar idPrefix="desktop" />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 w-[17.5rem] max-w-[85vw] border-r border-line bg-bg shadow-2xl"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="btn btn-ghost btn-sm btn-icon absolute right-3 top-4 z-10"
                aria-label="Close navigation"
              >
                <X size={16} weight="bold" />
              </button>
              <Sidebar idPrefix="mobile" onNavigate={() => setMenuOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar pageTitle={pageTitle} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" className="flex-1">
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
          >
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </motion.div>
        </main>
        <footer className="mx-auto w-full max-w-[1320px] px-4 pb-6 text-xs text-fg-subtle sm:px-6 lg:px-10">
          © 2026 QuestFlow
        </footer>
      </div>

      {/* Celebrates level increases from anywhere in the workspace */}
      <LevelUpCelebration />
    </div>
  );
};

export default DashboardLayout;
