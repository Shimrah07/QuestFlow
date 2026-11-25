import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Flag, Lightning } from "@phosphor-icons/react";
import { ProgressRing } from "../ui/primitives";

/** Compact "This week's quests" card for the Dashboard. Renders nothing until the board has loaded. */
const QuestsCard = ({ board }) => {
  if (!board) return null;
  const done = board.weekly.filter((q) => q.completed).length;
  const activeTeam = board.team.filter((q) => q.status === "active").length;

  return (
    <section className="surface flex flex-col" aria-labelledby="dash-quests-title" data-testid="dashboard-quests">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="dash-quests-title" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
          <Flag size={16} weight="fill" className="text-accent-text" />
          This week's quests
        </h2>
        <span className="num text-xs text-fg-subtle">
          {done}/{board.weekly.length}
        </span>
      </div>
      <ul className="flex flex-col gap-1 p-2">
        {board.weekly.map((q) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          return (
            <li key={q.id} className="flex items-center gap-3 rounded-[12px] px-3 py-2">
              <ProgressRing value={pct} size={34} stroke={3.5}>
                {q.completed ? <CheckCircle size={15} weight="fill" className="text-success" /> : <span className="num text-[0.625rem] font-semibold text-fg-muted">{Math.round(pct)}%</span>}
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${q.completed ? "text-fg-muted" : "text-fg"}`}>{q.title}</p>
                <p className="truncate text-xs text-fg-subtle">{q.description}</p>
              </div>
              <span className={`num inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold ${q.completed ? "text-success" : "text-accent-text"}`}>
                <Lightning size={11} weight="fill" />+{q.reward_xp}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line px-5 py-3">
        <Link to="/quests" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg-muted transition-colors hover:text-fg">
          {activeTeam ? `${activeTeam} team quest${activeTeam === 1 ? "" : "s"} running` : "All quests"}
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
    </section>
  );
};

export default QuestsCard;
