/*
 * Dashboard. One question at first glance: "what needs my attention, and how am I progressing?"
 * Numbers are the same ones as before (all visible tasks, role-filtered expenses, the user's XP);
 * the open-task list now prefers the signed-in user's own work and flags overdue items in place.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Kanban,
  Hourglass,
  Wallet,
  Lightning,
  WarningCircle,
  CalendarBlank,
  Trophy,
} from "@phosphor-icons/react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  ProgressRing,
  XpMeter,
  levelProgress,
  StatusBadge,
  EmptyState,
  Skeleton,
  Stagger,
  StaggerItem,
  formatMoney,
  formatDate,
} from "../../components/ui/primitives";
import { getAchievements } from "../gamification/achievements";
import InsightsPanel from "../../components/dashboard/InsightsPanel";
import QuestsCard from "../../components/dashboard/QuestsCard";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const isOverdue = (t) => t.due_date && t.status !== "Completed" && new Date(t.due_date) < new Date();

/** KPI tile: label, number, one-word baseline. An optional action link sits on the tile itself. */
const Kpi = ({ label, value, baseline, icon: Icon, tone, action, testId }) => (
  <div data-testid={testId} className="surface flex min-w-0 flex-col justify-between gap-5 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[0.8125rem] font-medium text-fg-muted">{label}</span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-line bg-surface-2 text-fg-subtle">
        <Icon size={16} weight="bold" />
      </span>
    </div>
    <div className="min-w-0">
      <p className={`num truncate text-[1.75rem] font-semibold leading-none tracking-tight ${tone === "attention" ? "text-accent-text" : "text-fg"}`}>{value}</p>
      <div className="mt-2 flex min-h-5 items-center justify-between gap-2 text-xs text-fg-subtle">
        <span className="truncate">{baseline}</span>
        {action}
      </div>
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
    <Skeleton className="h-9 w-72" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Skeleton className="h-56 !rounded-2xl lg:col-span-5" />
      <div className="grid grid-cols-2 gap-4 lg:col-span-7">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[6.5rem] !rounded-2xl sm:h-32" />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Skeleton className="h-72 !rounded-2xl lg:col-span-8" />
      <Skeleton className="h-72 !rounded-2xl lg:col-span-4" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [quests, setQuests] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [tasksRes, expensesRes, questsRes] = await Promise.all([
          api.get("/tasks"),
          api.get("/expenses").catch(() => ({ data: [] })),
          api.get("/quests/").catch(() => ({ data: null })),
        ]);
        setTasks(tasksRes.data);
        setExpenses(expensesRes.data || []);
        setQuests(questsRes.data);
      } catch {
        showToast("Couldn't load your dashboard. Refresh to try again.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardSkeleton />;

  // Same figures as the previous dashboard
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const activeTasks = tasks.filter((t) => t.status === "In Progress" || t.status === "Todo");
  const overdueTasks = activeTasks.filter(isOverdue);

  const pendingExpenses = expenses.filter((e) => e.status === "Pending");
  const approvedExpenses = expenses.filter((e) => e.status === "Approved");
  const totalApprovedLedger = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPendingLedger = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const canReview = user?.role === "Admin" || user?.role === "Manager";
  const points = user?.points || 0;
  const level = user?.level || 1;
  const { inLevel, pct, toNext } = levelProgress(points);

  // Open work: the user's own first; managers/admins without assignments see the latest open tasks.
  const byDue = (a, b) => new Date(a.due_date || "9999-12-31") - new Date(b.due_date || "9999-12-31");
  const mine = activeTasks.filter((t) => t.assigned_to_id === user?.id).sort(byDue);
  const showingMine = mine.length > 0 || user?.role === "Employee";
  const openList = (showingMine ? mine : [...activeTasks].sort(byDue)).slice(0, 5);
  const myCompleted = completedTasks.filter((t) => t.assigned_to_id === user?.id).length;

  const achievements = getAchievements(user);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <Stagger className="flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <StaggerItem className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="display text-[1.75rem] font-semibold leading-[1.1] text-fg sm:text-[2rem]">
            {greeting()}, {user?.first_name}
          </h1>
          <p className="mt-2 text-[0.9375rem] text-fg-muted">
            {user?.role} · Level {level}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReview && pendingExpenses.length > 0 && (
            <Link to="/approvals" className="btn btn-secondary">
              <Hourglass size={17} weight="bold" />
              Review claims
              <span className="num rounded-[6px] bg-accent px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent-ink">{pendingExpenses.length}</span>
            </Link>
          )}
          <Link to="/tasks" className="btn btn-primary">
            <Kanban size={17} weight="bold" />
            Open task board
          </Link>
        </div>
      </StaggerItem>

      {/* Progress + KPIs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <StaggerItem className="relative overflow-hidden surface p-5 sm:p-6 lg:col-span-5" >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-70 blur-3xl"
            style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 22%, transparent), transparent)" }}
          />
          <div className="relative flex h-full flex-col justify-between gap-6" data-testid="xp-panel">
            <div className="flex items-center justify-between">
              <span className="text-[0.8125rem] font-medium text-fg-muted">Your progress</span>
              <Link to="/gamification" className="inline-flex items-center gap-1 text-xs font-medium text-fg-subtle transition-colors hover:text-fg">
                Leaderboard <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
            <div className="flex items-center gap-5">
              <ProgressRing value={pct} size={96} stroke={7}>
                <div className="text-center leading-none">
                  <span className="block text-[0.625rem] font-medium uppercase tracking-[0.08em] text-fg-subtle">Level</span>
                  <span className="num mt-1 block text-2xl font-semibold text-fg">{level}</span>
                </div>
              </ProgressRing>
              <div className="min-w-0">
                <p className="num text-[2.25rem] font-semibold leading-none tracking-tight text-fg">
                  {points.toLocaleString()}
                  <span className="ml-1.5 text-base font-medium text-fg-subtle">XP</span>
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-muted">
                  <Lightning size={14} weight="fill" className="text-accent-text" />
                  <span className="num">{toNext}</span> XP to level {level + 1}
                </p>
              </div>
            </div>
            <div>
              <XpMeter points={points} />
              <div className="mt-2 flex justify-between text-xs text-fg-subtle">
                <span className="num">{inLevel}/500</span>
                <span>
                  <span className="num">{myCompleted}</span> tasks finished
                </span>
              </div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7">
          <Kpi testId="kpi-completed" label="Tasks done" value={completedTasks.length} baseline={user?.role === "Employee" ? `of ${tasks.length} assigned to you` : `of ${tasks.length} total`} icon={CheckCircle} />
          <Kpi
            testId="kpi-open"
            label="Open tasks"
            value={activeTasks.length}
            icon={Kanban}
            tone={overdueTasks.length ? "attention" : undefined}
            baseline={overdueTasks.length ? `${overdueTasks.length} overdue` : "none overdue"}
          />
          <Kpi
            testId="kpi-pending"
            label="Pending claims"
            value={pendingExpenses.length}
            icon={Hourglass}
            tone={canReview && pendingExpenses.length ? "attention" : undefined}
            baseline={formatMoney(totalPendingLedger)}
            action={
              canReview && pendingExpenses.length > 0 ? (
                <Link to="/approvals" className="inline-flex shrink-0 items-center gap-1 font-medium text-accent-text hover:underline underline-offset-4">
                  Review <ArrowRight size={11} weight="bold" />
                </Link>
              ) : null
            }
          />
          <Kpi testId="kpi-approved" label="Approved spend" value={formatMoney(totalApprovedLedger)} baseline={`${approvedExpenses.length} claims`} icon={Wallet} />
        </StaggerItem>
      </div>

      {/* Insights (computed in the browser from the data above) */}
      <StaggerItem>
        <InsightsPanel user={user} tasks={tasks} expenses={expenses} />
      </StaggerItem>

      {/* Open work + achievements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <StaggerItem className="surface flex flex-col lg:col-span-8 lg:self-start">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[0.9375rem] font-semibold text-fg">{showingMine ? "Your open tasks" : "Open tasks"}</h2>
            <Link to="/tasks" className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-fg-muted transition-colors hover:text-fg">
              View board <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
          {openList.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title={showingMine ? "Nothing on your plate" : "No open tasks"}
              description={showingMine ? "New tasks assigned to you will show up here." : "Create a task from the board to get the team moving."}
              className="flex-1"
            />
          ) : (
            <ul className="flex flex-col p-2">
              {openList.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <li key={task.id}>
                    <Link to="/tasks" className="row-hover flex items-center gap-3 rounded-[12px] px-3 py-3 sm:gap-4">
                      <StatusBadge status={task.status} className="hidden w-[5.5rem] justify-center sm:inline-flex" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{task.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-fg-subtle">
                          <span className="sm:hidden">{task.status === "In Progress" ? "In progress" : "To do"}</span>
                          {task.project?.name && <span className="truncate">{task.project.name}</span>}
                          {!showingMine && task.assigned_to?.first_name && <span className="truncate">{task.assigned_to.first_name}</span>}
                        </p>
                      </div>
                      {task.due_date && (
                        <span className={`hidden shrink-0 items-center gap-1 text-xs sm:inline-flex ${overdue ? "font-medium text-danger" : "text-fg-subtle"}`}>
                          {overdue ? <WarningCircle size={13} weight="fill" /> : <CalendarBlank size={13} />}
                          {overdue ? "Overdue" : formatDate(task.due_date)}
                        </span>
                      )}
                      <span className="num w-16 shrink-0 text-right text-[0.8125rem] font-semibold text-accent-text">+{task.xp}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-4 lg:col-span-4">
          <QuestsCard board={quests} />
          <div className="surface flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-[0.9375rem] font-semibold text-fg">Achievements</h2>
            <span className="num text-xs text-fg-subtle">
              {unlocked}/{achievements.length}
            </span>
          </div>
          <ul className="flex flex-1 flex-col gap-1 p-2">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border ${
                      a.unlocked ? "border-accent/30 bg-accent/12 text-accent-text" : "border-line bg-surface-2 text-fg-subtle"
                    }`}
                  >
                    <Icon size={18} weight={a.unlocked ? "fill" : "regular"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm font-medium ${a.unlocked ? "text-fg" : "text-fg-muted"}`}>{a.title}</p>
                      <span className="num shrink-0 text-[0.6875rem] text-fg-subtle">{a.unlocked ? "Unlocked" : a.meta}</span>
                    </div>
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-surface-3">
                      <div className={`h-full rounded-full ${a.unlocked ? "bg-accent" : "bg-fg-subtle/60"}`} style={{ width: `${a.progress * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <Link to="/gamification" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg-muted transition-colors hover:text-fg">
              <Trophy size={14} weight="bold" />
              See team standings
            </Link>
          </div>
          </div>
        </StaggerItem>
      </div>
    </Stagger>
  );
};

export default Dashboard;
