import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle, Lightning } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/common/ThemeToggle";
import { ProgressRing } from "../components/ui/primitives";

/**
 * A one-time explanatory sequence built from real product components:
 * a task completes, XP lands, the level ring fills. Shows how QuestFlow works at a glance.
 */
const QuestPreview = () => {
  const reduce = useReducedMotion();
  const ease = [0.23, 1, 0.32, 1];
  const rows = [
    { title: "Design onboarding checklist", xp: 300, done: true },
    { title: "Review Q3 travel claims", xp: 150, done: true },
    { title: "Ship mobile push alerts", xp: 350, done: false },
  ];

  return (
    <div className="relative w-full max-w-[380px]">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.15 }}
        className="surface bg-surface/90 p-4 backdrop-blur"
      >
        <div className="flex items-center justify-between pb-3">
          <span className="text-sm font-semibold text-fg">This week</span>
          <span className="num text-xs text-fg-subtle">2 of 3 done</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <motion.li
              key={r.title}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease, delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-3 rounded-[10px] bg-surface-2 px-3 py-2.5"
            >
              <CheckCircle size={18} weight={r.done ? "fill" : "regular"} className={r.done ? "text-success" : "text-fg-subtle"} />
              <span className={`min-w-0 flex-1 truncate text-[0.8125rem] ${r.done ? "text-fg-muted line-through decoration-fg-subtle/50" : "text-fg"}`}>{r.title}</span>
              <span className={`num text-xs font-semibold ${r.done ? "text-accent-text" : "text-fg-subtle"}`}>+{r.xp}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.25, delay: 0.75 }}
        className="surface absolute right-0 top-full -mt-4 flex translate-x-8 items-center gap-3 bg-surface-2 px-4 py-3 xl:translate-x-14"
      >
        <ProgressRing value={90} size={46} stroke={4}>
          <span className="num text-sm font-semibold text-fg">4</span>
        </ProgressRing>
        <div>
          <p className="flex items-center gap-1 text-[0.8125rem] font-semibold text-fg">
            <Lightning size={14} weight="fill" className="text-accent-text" />
            450 XP earned
          </p>
          <p className="text-xs text-fg-subtle">50 XP to level 5</p>
        </div>
      </motion.div>
    </div>
  );
};

const AuthLayout = () => {
  const { user } = useAuth();

  // Redirect to dashboard immediately if user is logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative grid min-h-[100dvh] bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel (desktop) */}
      <section className="relative hidden overflow-hidden border-r border-line bg-bg-sunken lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 28%, transparent), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, black, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="display text-lg font-semibold text-fg">QuestFlow</span>
        </div>

        <div className="relative max-w-[30rem]">
          <p className="display text-[2.75rem] font-semibold leading-[1.05] text-fg xl:text-[3.25rem]">
            Finish the work.
            <br />
            <span className="text-accent-text">Level up</span> the team.
          </p>
          <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-fg-muted">
            Tasks, expense claims and approvals in one workspace. Every finished task earns XP toward the team leaderboard.
          </p>
        </div>

        <div className="relative pb-16">
          <QuestPreview />
        </div>
      </section>

      {/* Form column */}
      <section className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:invisible">
            <img src="/logo.svg" alt="" className="h-7 w-7" />
            <span className="display text-[1.0625rem] font-semibold text-fg">QuestFlow</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-rise">
            <Outlet />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthLayout;
