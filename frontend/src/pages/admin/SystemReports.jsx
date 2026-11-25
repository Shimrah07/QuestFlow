/*
 * Reports: "How is the workspace doing?"
 * Deviations from dashboard-design defaults, on purpose:
 * - No deltas: /reports/summary has no previous period, so no baseline is invented.
 * - Pending claims is the only "needs attention" tile; it carries the accent and its action (Review).
 * - Shares are drawn as length (segmented bar + slim 3px row bars), not a pie.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UsersThree, FolderSimple, CheckCircle, Receipt, ArrowRight, ChartBar } from "@phosphor-icons/react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Card from "../../components/common/Card";
import { PageHeader, Skeleton, EmptyState, formatMoney } from "../../components/ui/primitives";

const pct = (part, total) => (total > 0 ? (part / total) * 100 : 0);
const pctLabel = (part, total) => {
  if (!total) return "-";
  const v = pct(part, total);
  return v > 0 && v < 0.1 ? "<0.1%" : `${Math.round(v)}%`;
};

const KpiTile = ({ label, icon: Icon, value, sub, attention = false, action }) => (
  <Card padding="p-5" className={`flex min-w-0 flex-col ${attention ? "border-accent/35" : ""}`}>
    <div className="flex items-center justify-between gap-3">
      <span className="truncate text-[0.8125rem] font-medium text-fg-muted">{label}</span>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border ${
          attention ? "border-accent/30 bg-accent/10 text-accent-text" : "border-line bg-surface-2 text-fg-subtle"
        }`}
      >
        <Icon size={16} weight="bold" />
      </span>
    </div>
    <span className="num mt-3 truncate text-[1.75rem] font-semibold leading-none tracking-tight text-fg">{value}</span>
    <div className="mt-2.5 flex min-h-5 items-center justify-between gap-2 text-xs text-fg-subtle">
      <span className="truncate">{sub}</span>
      {action}
    </div>
  </Card>
);

/** One horizontal bar split into segments; length encodes share. */
const ShareBar = ({ segments, total, label }) => (
  <div className="flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full" role="img" aria-label={label}>
    {total > 0 ? (
      segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <span
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full transition-[flex-grow] duration-700"
            style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
            title={`${s.label}: ${s.display}`}
          />
        ))
    ) : (
      <span className="h-full w-full rounded-full bg-surface-3" />
    )}
  </div>
);

const BreakdownRow = ({ color, label, display, share, value, total }) => (
  <li className="relative py-3">
    <div className="flex items-center gap-3 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-fg-muted">{label}</span>
      <span className="num w-12 text-right text-xs text-fg-subtle">{share}</span>
      <span className="num min-w-[5.5rem] text-right font-medium text-fg">{display}</span>
    </div>
    <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-surface-2" aria-hidden>
      <span
        className="block h-full rounded-full opacity-70 transition-[width] duration-700"
        style={{ width: `${pct(value, total)}%`, background: color }}
      />
    </span>
  </li>
);

const ReportsSkeleton = () => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} padding="p-5" className="flex flex-col gap-3">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-20" />
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="flex flex-col gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-2.5 w-full" />
          {Array.from({ length: 3 }).map((__, j) => (
            <Skeleton key={j} className="h-5 w-full" />
          ))}
        </Card>
      ))}
    </div>
  </>
);

const SystemReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await api.get("/reports/summary");
        setData(response.data);
      } catch {
        showToast("Couldn't load reports.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Reports" />
        {loading ? (
          <ReportsSkeleton />
        ) : (
          <Card>
            <EmptyState icon={ChartBar} title="Reports unavailable" description="The summary couldn't be loaded. Refresh to try again." />
          </Card>
        )}
      </div>
    );
  }

  const taskCompletionRate = data.tasks.total > 0
    ? Math.round((data.tasks.completed / data.tasks.total) * 100)
    : 0;

  const totalExpenseBudget = data.expenses.approved_amount + data.expenses.pending_amount + data.expenses.rejected_amount;

  const taskSegments = [
    { key: "done", label: "Done", value: data.tasks.completed, color: "var(--success)" },
    { key: "progress", label: "In progress", value: data.tasks.in_progress, color: "var(--info)" },
    { key: "todo", label: "To do", value: data.tasks.todo, color: "var(--fg-subtle)" },
  ].map((s) => ({ ...s, display: s.value.toLocaleString() }));

  const expenseSegments = [
    { key: "approved", label: "Approved", value: data.expenses.approved_amount, color: "var(--success)" },
    { key: "pending", label: "Pending", value: data.expenses.pending_amount, color: "var(--accent)" },
    { key: "rejected", label: "Rejected", value: data.expenses.rejected_amount, color: "var(--danger)" },
  ].map((s) => ({ ...s, display: formatMoney(s.value) }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="People" icon={UsersThree} value={data.users_count.toLocaleString()} sub="Registered accounts" />
        <KpiTile label="Projects" icon={FolderSimple} value={data.projects_count.toLocaleString()} sub="Active and archived" />
        <KpiTile
          label="Tasks done"
          icon={CheckCircle}
          value={data.tasks.total > 0 ? `${taskCompletionRate}%` : "-"}
          sub={
            <span className="num">
              {data.tasks.completed} of {data.tasks.total}
            </span>
          }
        />
        <KpiTile
          label="Pending claims"
          icon={Receipt}
          value={formatMoney(data.expenses.pending_amount)}
          sub="Awaiting review"
          attention={data.expenses.pending_amount > 0}
          action={
            data.expenses.pending_amount > 0 && (
              <Link
                to="/approvals"
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-text underline-offset-4 hover:underline"
              >
                Review
                <ArrowRight size={12} weight="bold" />
              </Link>
            )
          }
        />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-fg">Tasks by status</h2>
            <span className="num text-xs text-fg-subtle">{data.tasks.total} total</span>
          </div>
          <p className="num mt-4 text-[2rem] font-semibold leading-none tracking-tight text-fg">
            {data.tasks.completed.toLocaleString()}
            <span className="ml-1.5 text-base font-medium text-fg-subtle">done</span>
          </p>
          <div className="mt-5">
            <ShareBar segments={taskSegments} total={data.tasks.total} label="Task status distribution" />
          </div>
          <ul className="mt-3">
            {taskSegments.map((s) => (
              <BreakdownRow
                key={s.key}
                color={s.color}
                label={s.label}
                display={s.display}
                value={s.value}
                total={data.tasks.total}
                share={pctLabel(s.value, data.tasks.total)}
              />
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-fg">Expense claims by status</h2>
            <span className="num text-xs text-fg-subtle">{data.expenses.total_count} claims</span>
          </div>
          <p className="num mt-4 truncate text-[2rem] font-semibold leading-none tracking-tight text-fg">
            {formatMoney(totalExpenseBudget)}
            <span className="ml-1.5 font-sans text-base font-medium text-fg-subtle">logged</span>
          </p>
          <div className="mt-5">
            <ShareBar segments={expenseSegments} total={totalExpenseBudget} label="Expense amount by status" />
          </div>
          <ul className="mt-3">
            {expenseSegments.map((s) => (
              <BreakdownRow
                key={s.key}
                color={s.color}
                label={s.label}
                display={s.display}
                value={s.value}
                total={totalExpenseBudget}
                share={pctLabel(s.value, totalExpenseBudget)}
              />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default SystemReports;
