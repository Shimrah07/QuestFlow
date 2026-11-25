import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkle, Hourglass, FolderSimple, UsersThree, Wallet, Info, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { formatMoney } from "../ui/primitives";
import { levelForecast, projectsAtRisk, workloadBalance, spendTrend } from "../../lib/insights";

const pct = (x) => `${Math.round(x * 100)}%`;

/** One insight: label, headline number, a short baseline. The explanation lives in the tooltip. */
const Tile = ({ icon: Icon, label, info, children, testId }) => (
  <div className="surface flex min-w-0 flex-col gap-3 p-4" data-testid={testId}>
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-fg-muted">
        <Icon size={15} weight="bold" className="text-fg-subtle" />
        {label}
      </span>
      {info && (
        <span className="text-fg-subtle" title={info} aria-label={info} role="img">
          <Info size={14} weight="bold" />
        </span>
      )}
    </div>
    {children}
  </div>
);

/** Slim share bar along a row's bottom edge (3px, no filled track behind it). */
const ShareBar = ({ value, tone = "bg-fg-subtle/50" }) => (
  <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full" aria-hidden>
    <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }} />
  </span>
);

const InsightsPanel = ({ user, tasks, expenses }) => {
  // One clock per visit, so the figures (and their memos) stay stable across re-renders.
  const [now] = useState(() => Date.now());
  const canReview = user?.role === "Admin" || user?.role === "Manager";
  const forecast = useMemo(() => levelForecast(user, now), [user, now]);
  const risk = useMemo(() => projectsAtRisk(tasks, now), [tasks, now]);
  const load = useMemo(() => workloadBalance(tasks, now), [tasks, now]);
  const spend = useMemo(() => spendTrend(expenses, now), [expenses, now]);
  const mine = load.people.find((p) => p.id === user?.id);

  const spendScope =
    user?.role === "Admin"
      ? "All claims in the last 30 days, compared with the 30 days before. Rejected claims are left out."
      : user?.role === "Manager"
        ? "Your own claims plus pending team claims in the last 30 days, compared with the 30 days before. Rejected claims are left out."
        : "Your claims in the last 30 days, compared with the 30 days before. Rejected claims are left out.";

  return (
    <section aria-labelledby="insights-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkle size={15} weight="fill" className="text-accent-text" />
        <h2 id="insights-title" className="text-[0.9375rem] font-semibold text-fg">
          Insights
        </h2>
        <span className="text-xs text-fg-subtle" title="Worked out in your browser from the tasks and claims on this page.">
          from your workspace data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {/* Next level forecast */}
        <Tile
          icon={Hourglass}
          label="Next level"
          testId="insight-forecast"
          info="Based on your average XP per day since you joined (counted over at least a week). Tasks don't record when they were finished, so this is a long-run average."
        >
          {forecast?.status === "on-track" ? (
            <>
              <p className="num text-[1.5rem] font-semibold leading-none text-fg">
                ~{forecast.days} {forecast.days === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-fg-subtle">
                to level {forecast.nextLevel} at <span className="num">{forecast.perDay}</span> XP a day
              </p>
            </>
          ) : (
            <>
              <p className="num text-[1.5rem] font-semibold leading-none text-fg">{forecast?.toNext ?? 500} XP</p>
              <p className="text-xs text-fg-subtle">to level {forecast?.nextLevel ?? 2}. Finish a task to start a forecast.</p>
            </>
          )}
        </Tile>

        {/* Projects at risk */}
        <Tile
          icon={FolderSimple}
          label="Projects at risk"
          testId="insight-projects"
          info={canReview ? "Active projects with open tasks past their due date, most overdue first." : "Projects where your open tasks are past their due date."}
        >
          {risk.count === 0 ? (
            <>
              <p className="flex items-center gap-1.5 text-[1.5rem] font-semibold leading-none text-fg">
                <CheckCircle size={20} weight="fill" className="text-success" />
                <span className="num">0</span>
              </p>
              <p className="text-xs text-fg-subtle">{risk.active ? `All ${risk.active} active projects on schedule` : "No active projects yet"}</p>
            </>
          ) : (
            <>
              <p className="num text-[1.5rem] font-semibold leading-none text-accent-text">
                {risk.count}
                <span className="ml-1.5 text-sm font-medium text-fg-subtle">of {risk.active}</span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {risk.atRisk.slice(0, 2).map((p) => (
                  <li key={p.id} className="min-w-0 text-xs">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-fg-muted">{p.name}</span>
                      <span className="num shrink-0 font-medium text-danger">{p.overdue} overdue</span>
                    </span>
                    <ShareBar value={p.overdueShare} tone="bg-danger/70" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tile>

        {/* Workload */}
        <Tile
          icon={UsersThree}
          label={canReview ? "Workload" : "Your workload"}
          testId="insight-workload"
          info={canReview ? "Open tasks per person. Flagged when the busiest person has at least 3 open tasks and twice the team median." : "Your open tasks and how many are past their due date."}
        >
          {!load.busiest ? (
            <>
              <p className="num text-[1.5rem] font-semibold leading-none text-fg">0</p>
              <p className="text-xs text-fg-subtle">No assigned work yet</p>
            </>
          ) : canReview ? (
            <>
              <p className={`text-[1.5rem] font-semibold leading-none ${load.uneven ? "text-accent-text" : "text-fg"}`}>
                <span className="truncate">{load.busiest.name}</span>
                <span className="num ml-1.5 text-sm font-medium text-fg-subtle">{load.busiest.open} open</span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {load.people.slice(0, 3).map((p) => (
                  <li key={p.id} className="text-xs">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-fg-muted">{p.name}</span>
                      <span className="num shrink-0 text-fg-subtle">{p.open}</span>
                    </span>
                    <ShareBar value={load.busiest.open ? p.open / load.busiest.open : 0} tone={p === load.busiest && load.uneven ? "bg-accent" : "bg-fg-subtle/50"} />
                  </li>
                ))}
              </ul>
              <p className="text-[0.6875rem] text-fg-subtle">
                Team median <span className="num">{load.median}</span>
                {load.uneven ? ". Consider rebalancing." : ""}
              </p>
            </>
          ) : (
            <>
              <p className="num text-[1.5rem] font-semibold leading-none text-fg">
                {mine?.open ?? 0}
                <span className="ml-1.5 text-sm font-medium text-fg-subtle">open</span>
              </p>
              <p className={`text-xs ${mine?.overdue ? "font-medium text-danger" : "text-fg-subtle"}`}>
                {mine?.overdue ? `${mine.overdue} overdue` : "Nothing overdue"}
              </p>
            </>
          )}
        </Tile>

        {/* Spend trend */}
        <Tile icon={Wallet} label="Spend, last 30 days" testId="insight-spend" info={spendScope}>
          <p className="num text-[1.5rem] font-semibold leading-none text-fg">{formatMoney(spend.current)}</p>
          <p className="text-xs text-fg-subtle">
            {spend.change === null ? (
              spend.previous > 0 ? (
                <>
                  was <span className="num">{formatMoney(spend.previous)}</span> the 30 days before
                </>
              ) : (
                "No earlier claims to compare"
              )
            ) : spend.change >= 1 ? (
              // More than double reads better as a multiple than as "+1189%".
              <>
                <span className="num font-medium text-fg-muted">{(1 + spend.change).toFixed(1)}x</span> the 30 days before
              </>
            ) : (
              <>
                <span className="num font-medium text-fg-muted">
                  {spend.change >= 0 ? "+" : "-"}
                  {pct(Math.abs(spend.change))}
                </span>{" "}
                vs the 30 days before
              </>
            )}
          </p>
          {spend.topCategory && (
            <div className="text-xs">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-fg-muted">Top: {spend.topCategory.name}</span>
                <span className="num text-fg-subtle">{pct(spend.topCategory.share)}</span>
              </span>
              <ShareBar value={spend.topCategory.share} />
            </div>
          )}
          {canReview && (
            <Link to="/expenses" className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-fg-subtle transition-colors hover:text-fg">
              View claims <ArrowRight size={11} weight="bold" />
            </Link>
          )}
        </Tile>
      </div>
    </section>
  );
};

export default InsightsPanel;
