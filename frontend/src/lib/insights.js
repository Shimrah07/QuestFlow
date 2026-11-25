/**
 * Dashboard insights, computed in the browser from data the dashboard already loads.
 * Pure functions so they can be unit tested with a fixed clock.
 */

export const DAY = 24 * 60 * 60 * 1000;
const XP_PER_LEVEL = 500;

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const isOpen = (t) => t.status !== "Completed";
const isOverdue = (t, now) => isOpen(t) && t.due_date && new Date(t.due_date).getTime() < now;

/**
 * Days to the next level at the user's average pace since joining.
 * Tasks don't record when they were completed, so the pace is an average over the whole
 * membership, counted over at least a week so a brand-new account isn't wildly optimistic.
 */
export function levelForecast(user, now = Date.now()) {
  if (!user) return null;
  const points = user.points || 0;
  const level = user.level || Math.floor(points / XP_PER_LEVEL) + 1;
  const toNext = XP_PER_LEVEL - (points % XP_PER_LEVEL);
  if (points <= 0) return { status: "not-started", toNext, nextLevel: level + 1 };
  const joined = user.created_at ? new Date(user.created_at).getTime() : now;
  const daysActive = Math.max(7, (now - joined) / DAY);
  const perDay = points / daysActive;
  return {
    status: "on-track",
    perDay: Math.round(perDay * 10) / 10,
    days: Math.max(1, Math.ceil(toNext / perDay)),
    toNext,
    nextLevel: level + 1,
  };
}

/** Active projects with overdue open work, most overdue first. */
export function projectsAtRisk(tasks, now = Date.now(), limit = 3) {
  const byProject = new Map();
  for (const t of tasks) {
    if (!t.project_id || t.project?.status === "Archived") continue;
    if (!byProject.has(t.project_id)) byProject.set(t.project_id, { id: t.project_id, name: t.project?.name || `Project ${t.project_id}`, total: 0, done: 0, open: 0, overdue: 0 });
    const p = byProject.get(t.project_id);
    p.total += 1;
    if (isOpen(t)) p.open += 1;
    else p.done += 1;
    if (isOverdue(t, now)) p.overdue += 1;
  }
  const all = [...byProject.values()].map((p) => ({ ...p, completion: p.total ? p.done / p.total : 0, overdueShare: p.open ? p.overdue / p.open : 0 }));
  const atRisk = all.filter((p) => p.overdue > 0).sort((a, b) => b.overdue - a.overdue || b.overdueShare - a.overdueShare || a.name.localeCompare(b.name));
  return { atRisk: atRisk.slice(0, limit), count: atRisk.length, active: all.length };
}

/** Open tasks per assignee and whether one person is carrying noticeably more than the rest. */
export function workloadBalance(tasks, now = Date.now()) {
  const people = new Map();
  for (const t of tasks) {
    if (!t.assigned_to_id) continue;
    if (!people.has(t.assigned_to_id)) people.set(t.assigned_to_id, { id: t.assigned_to_id, name: t.assigned_to?.first_name || `User ${t.assigned_to_id}`, open: 0, overdue: 0 });
    const p = people.get(t.assigned_to_id);
    if (isOpen(t)) p.open += 1;
    if (isOverdue(t, now)) p.overdue += 1;
  }
  const list = [...people.values()].sort((a, b) => b.open - a.open || b.overdue - a.overdue || a.name.localeCompare(b.name));
  const med = median(list.map((p) => p.open));
  const busiest = list[0] || null;
  const uneven = !!busiest && busiest.open >= 3 && busiest.open >= 2 * Math.max(1, med);
  return { people: list, median: med, busiest, uneven };
}

/** Claim spend over the last 30 days against the 30 before. Rejected claims don't count. */
export function spendTrend(expenses, now = Date.now(), windowDays = 30) {
  const counted = expenses.filter((e) => e.status !== "Rejected");
  const start = now - windowDays * DAY;
  const prevStart = now - 2 * windowDays * DAY;
  const at = (e) => new Date(e.created_at).getTime();
  const current = counted.filter((e) => at(e) > start && at(e) <= now);
  const previous = counted.filter((e) => at(e) > prevStart && at(e) <= start);
  const sum = (xs) => Math.round(xs.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  const currentTotal = sum(current);
  const previousTotal = sum(previous);

  const byCategory = new Map();
  for (const e of current) byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
  const [topName, topAmount] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];

  return {
    current: currentTotal,
    previous: previousTotal,
    count: current.length,
    // Below a meaningful base (fewer than 3 claims or under $50 last period) a percentage would mislead.
    change: previous.length >= 3 && previousTotal >= 50 ? (currentTotal - previousTotal) / previousTotal : null,
    topCategory: topName ? { name: topName, amount: Math.round(topAmount * 100) / 100, share: currentTotal ? topAmount / currentTotal : 0 } : null,
  };
}
