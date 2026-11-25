import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ---------- Status badges ---------- */

const STATUS = {
  Todo: { tone: "neutral", label: "To do" },
  "In Progress": { tone: "info", label: "In progress" },
  Completed: { tone: "success", label: "Done" },
  Pending: { tone: "accent", label: "Pending" },
  Approved: { tone: "success", label: "Approved" },
  Rejected: { tone: "danger", label: "Rejected" },
  Active: { tone: "success", label: "Active" },
  Archived: { tone: "neutral", label: "Archived" },
};

export const Badge = ({ tone = "neutral", children, className = "", ...props }) => (
  <span className={`badge badge-${tone} ${className}`} {...props}>
    {children}
  </span>
);

/** Maps a backend status string to a consistently colored badge. Keeps the raw value in data-status. */
export const StatusBadge = ({ status, className = "" }) => {
  const s = STATUS[status] || { tone: "neutral", label: status };
  return (
    <Badge tone={s.tone} className={className} data-status={status}>
      {s.label}
    </Badge>
  );
};

/* ---------- Avatar (rounded square, initial) ---------- */

export const Avatar = ({ name = "?", size = 32, highlight = false, className = "" }) => (
  <span
    aria-hidden
    style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    className={`inline-flex shrink-0 items-center justify-center rounded-[10px] font-semibold uppercase select-none border ${
      highlight
        ? "bg-accent/15 border-accent/30 text-accent-text"
        : "bg-surface-2 border-line text-fg-muted"
    } ${className}`}
  >
    {name.charAt(0)}
  </span>
);

/* ---------- XP / level helpers ---------- */

export const XP_PER_LEVEL = 500;

export const levelProgress = (points = 0) => {
  const inLevel = points % XP_PER_LEVEL;
  return { inLevel, pct: (inLevel / XP_PER_LEVEL) * 100, toNext: XP_PER_LEVEL - inLevel };
};

/** Circular level progress. Animates stroke on value change. */
export const ProgressRing = ({ value = 0, size = 44, stroke = 4, children, className = "" }) => {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`relative inline-grid place-items-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c - (clamped / 100) * c : c }}
          animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
};

/** Segmented XP bar: 10 cells, each worth 50 XP. Reads like a game meter, not a loading bar. */
export const XpMeter = ({ points = 0, className = "" }) => {
  const { inLevel } = levelProgress(points);
  const cells = 10;
  const filled = inLevel / (XP_PER_LEVEL / cells);
  return (
    <div className={`flex gap-[3px] ${className}`} role="meter" aria-valuemin={0} aria-valuemax={XP_PER_LEVEL} aria-valuenow={inLevel} aria-label="XP toward next level">
      {Array.from({ length: cells }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, filled - i));
        return (
          <span key={i} className="relative h-1.5 flex-1 rounded-[2px] bg-surface-3 overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 bg-accent rounded-[2px] transition-[width] duration-700"
              style={{ width: `${fill * 100}%`, transitionDelay: `${i * 40}ms` }}
            />
          </span>
        );
      })}
    </div>
  );
};

/* ---------- Layout bits ---------- */

/** Page title block. Title in display type, optional supporting line and action slot. */
export const PageHeader = ({ title, description, actions, className = "" }) => (
  <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
    <div className="min-w-0">
      <h1 className="display text-[1.75rem] sm:text-[2rem] font-semibold leading-[1.1] text-fg">{title}</h1>
      {description && <p className="mt-2 text-[0.9375rem] text-fg-muted max-w-[62ch]">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

/** Composed empty state: icon, one plain sentence, optional action. */
export const EmptyState = ({ icon: Icon, title, description, action, className = "" }) => (
  <div className={`flex flex-col items-center text-center px-6 py-12 ${className}`}>
    {Icon && (
      <div className="mb-4 grid place-items-center w-12 h-12 rounded-[14px] bg-surface-2 border border-line text-fg-subtle">
        <Icon size={22} weight="duotone" />
      </div>
    )}
    <p className="text-[0.9375rem] font-semibold text-fg">{title}</p>
    {description && <p className="mt-1 text-sm text-fg-muted max-w-[42ch]">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Skeleton = ({ className = "" }) => <div className={`skeleton ${className}`} aria-hidden />;

/** Pill tab group with a sliding indicator. `options` = [{ value, label, count? }] */
export const Segmented = ({ options, value, onChange, layoutId, className = "", ariaLabel }) => (
  <div role="tablist" aria-label={ariaLabel} className={`inline-flex p-1 gap-0.5 rounded-[12px] bg-surface-2 border border-line max-w-full overflow-x-auto scrollbar-none ${className}`}>
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={`relative h-8 px-3 rounded-[8px] text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150 ${
            active ? "text-fg" : "text-fg-subtle hover:text-fg-muted"
          }`}
        >
          {active && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-[8px] bg-surface border border-line-strong shadow-sm"
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {o.label}
            {o.count !== undefined && <span className="num text-[0.6875rem] text-fg-subtle">{o.count}</span>}
          </span>
        </button>
      );
    })}
  </div>
);

/** Staggered entrance wrapper for page sections. Children animate in sequence once. */
export const Stagger = ({ children, className = "", delay = 0.05 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : delay } } }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className = "", as = "div" }) => {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.23, 1, 0.32, 1] } },
      }}
    >
      {children}
    </Comp>
  );
};

/* ---------- Formatting ---------- */

export const formatMoney = (n = 0) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (d, opts = { month: "short", day: "numeric" }) => {
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", opts);
};

/** "3 days ago" style relative time for timestamps from the API. */
export const timeAgo = (d) => {
  if (!d) return "";
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  const units = [
    [60 * 60 * 24 * 30, "mo"],
    [60 * 60 * 24 * 7, "w"],
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];
  for (const [s, u] of units) if (diff >= s) return `${Math.floor(diff / s)}${u} ago`;
  return "just now";
};
