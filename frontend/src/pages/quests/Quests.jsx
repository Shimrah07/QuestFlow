import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, Plus, CheckCircle, Lightning, Clock, UsersThree, FolderSimple, X, CalendarCheck } from "@phosphor-icons/react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import { PageHeader, ProgressRing, Avatar, Badge, EmptyState, Skeleton, Stagger, StaggerItem, formatDate } from "../../components/ui/primitives";

const DAY = 86400000;

/** "3 days left", "Ends today", "Ended Nov 22". */
const timeLeft = (ends) => {
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return `Ended ${formatDate(ends)}`;
  if (ms < DAY) return "Ends today";
  const days = Math.ceil(ms / DAY);
  return `${days} day${days === 1 ? "" : "s"} left`;
};

const STATUS = {
  active: { tone: "info", label: "Active" },
  completed: { tone: "success", label: "Completed" },
  expired: { tone: "neutral", label: "Expired" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};

const unitFor = (metric, n) => (metric === "xp_earned" ? `${n.toLocaleString()} XP` : `${n} task${n === 1 ? "" : "s"}`);

/* ---------- Weekly quest card ---------- */

const WeeklyCard = ({ quest }) => {
  const pct = Math.min(100, (quest.progress / quest.target) * 100);
  return (
    <article
      data-testid="weekly-quest"
      data-code={quest.code}
      className={`surface flex w-full flex-col gap-4 p-5 ${quest.completed ? "!border-success/35" : ""}`}
    >
      <div className="flex items-start gap-4">
        <ProgressRing value={pct} size={58} stroke={5}>
          {quest.completed ? (
            <CheckCircle size={22} weight="fill" className="text-success" />
          ) : (
            <span className="num text-[0.8125rem] font-semibold text-fg">{Math.round(pct)}%</span>
          )}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[0.9375rem] font-semibold text-fg">{quest.title}</h3>
            <span className="num inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-accent/12 px-1.5 py-0.5 text-xs font-semibold text-accent-text">
              <Lightning size={12} weight="fill" />+{quest.reward_xp}
            </span>
          </div>
          <p className="mt-1 text-[0.8125rem] leading-snug text-fg-muted">{quest.description}</p>
        </div>
      </div>
      <p className={`mt-auto text-xs ${quest.completed ? "font-medium text-success" : "text-fg-subtle"}`} data-testid="weekly-progress">
        {quest.completed ? (
          <>Bonus earned: +{quest.reward_paid} XP</>
        ) : (
          <>
            <span className="num font-medium text-fg-muted">{unitFor(quest.metric, quest.progress)}</span> of {unitFor(quest.metric, quest.target)}
          </>
        )}
      </p>
    </article>
  );
};

/* ---------- Team quest card ---------- */

const TeamCard = ({ quest, userId, onCancel }) => {
  const s = STATUS[quest.status] || STATUS.active;
  const active = quest.status === "active";
  return (
    <article data-testid="team-quest" data-quest-id={quest.id} className={`surface flex flex-col gap-4 p-5 ${active ? "" : "opacity-80"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold text-fg">{quest.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
            {quest.project && (
              <span className="inline-flex items-center gap-1">
                <FolderSimple size={13} />
                {quest.project.name}
              </span>
            )}
            {quest.created_by_name && <span>Set by {quest.created_by_name}</span>}
          </p>
        </div>
        <Badge tone={s.tone} data-testid="team-quest-status">
          {s.label}
        </Badge>
      </div>

      {quest.description && <p className="text-[0.8125rem] leading-snug text-fg-muted">{quest.description}</p>}

      {/* Progress split by contributor; your share in the accent colour */}
      <div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${quest.progress} of ${quest.target} tasks done`}>
          {quest.contributors.map((c) => (
            <span
              key={c.user_id}
              title={`${c.name}: ${c.count}`}
              className={`h-full border-r border-surface last:border-r-0 ${c.user_id === userId ? "bg-accent" : quest.status === "completed" ? "bg-success/70" : "bg-fg-subtle/55"}`}
              style={{ width: `${(Math.min(c.count, quest.target) / quest.target) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-fg-muted" data-testid="team-quest-progress">
            <span className="num font-semibold text-fg">{quest.progress}</span> of <span className="num">{quest.target}</span> tasks
            {quest.my_contribution > 0 && <span className="text-accent-text"> · you {quest.my_contribution}</span>}
          </span>
          <span className="inline-flex items-center gap-1 text-fg-subtle">
            <Clock size={13} />
            {active ? timeLeft(quest.ends_at) : quest.status === "completed" ? `Done ${formatDate(quest.completed_at)}` : `Ended ${formatDate(quest.ends_at)}`}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {quest.contributors.length ? (
            <>
              <div className="flex -space-x-1.5">
                {quest.contributors.slice(0, 5).map((c) => (
                  <span key={c.user_id} title={`${c.name}: ${c.count} task${c.count === 1 ? "" : "s"}${c.reward_paid ? `, +${c.reward_paid} XP` : ""}`} className="rounded-[10px] ring-2 ring-surface">
                    <Avatar name={c.name} size={24} highlight={c.user_id === userId} />
                  </span>
                ))}
              </div>
              <span className="truncate text-xs text-fg-subtle">
                {quest.contributors.length} contributor{quest.contributors.length === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
              <UsersThree size={14} /> No contributions yet
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {quest.status === "completed" && quest.my_reward > 0 ? (
            <span className="num inline-flex items-center gap-1 text-xs font-semibold text-success">
              <CheckCircle size={14} weight="fill" />+{quest.my_reward} XP earned
            </span>
          ) : (
            <span className="num inline-flex items-center gap-1 rounded-[6px] bg-accent/12 px-1.5 py-0.5 text-xs font-semibold text-accent-text">
              <Lightning size={12} weight="fill" />+{quest.reward_xp} shared
            </span>
          )}
          {quest.can_cancel && (
            <button type="button" onClick={() => onCancel(quest)} className="btn btn-ghost btn-sm btn-icon hover:!text-danger" title="Cancel quest" aria-label={`Cancel ${quest.title}`} data-testid="cancel-quest">
              <X size={15} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

/* ---------- Page ---------- */

const isoDate = (d) => d.toISOString().slice(0, 10);

const Quests = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canCreate = user?.role === "Admin" || user?.role === "Manager";

  const [board, setBoard] = useState(null);
  const [error, setError] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ project_id: "", target: 5, reward_xp: 300, ends_on: "", title: "", description: "" });
  const [dateLimits, setDateLimits] = useState({ min: "", max: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/quests/");
      setBoard(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // load() sets state after the request resolves; refresh when a quest notification arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const onUpdate = () => load();
    window.addEventListener("quests-updated", onUpdate);
    return () => window.removeEventListener("quests-updated", onUpdate);
  }, [load]);

  const openCreate = async () => {
    const now = Date.now();
    const nextWeek = new Date(now + 7 * DAY);
    setDateLimits({ min: isoDate(new Date(now + DAY)), max: isoDate(new Date(now + 90 * DAY)) });
    setForm({ project_id: "", target: 5, reward_xp: 300, ends_on: isoDate(nextWeek), title: "", description: "" });
    setShowCreate(true);
    if (!projects.length) {
      try {
        const { data } = await api.get("/projects");
        setProjects(data.filter((p) => p.status === "Active"));
      } catch {
        showToast("Couldn't load projects.", "error");
      }
    }
  };

  const selectedProject = projects.find((p) => String(p.id) === String(form.project_id));
  const autoTitle = selectedProject ? `Finish ${form.target || "N"} ${selectedProject.name} task${Number(form.target) === 1 ? "" : "s"}` : "Finish N tasks";

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.project_id) {
      showToast("Choose a project for the quest.", "error");
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await api.post("/quests/team", {
        project_id: Number(form.project_id),
        target: Number(form.target),
        reward_xp: Number(form.reward_xp),
        ends_at: `${form.ends_on}T18:00:00`,
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setBoard((b) => (b ? { ...b, team: [data, ...b.team] } : b));
      setShowCreate(false);
      showToast("Team quest created. The project's team has been notified.", "success");
    } catch (err) {
      const detail = err.response?.data?.detail;
      showToast(Array.isArray(detail) ? detail[0]?.msg || "Check the quest details." : detail || "Couldn't create the quest.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    try {
      setSubmitting(true);
      const { data } = await api.delete(`/quests/${cancelling.id}`);
      setBoard((b) => (b ? { ...b, team: b.team.map((q) => (q.id === data.id ? data : q)) } : b));
      showToast("Quest cancelled.", "success");
      setCancelling(null);
    } catch (err) {
      showToast(err.response?.data?.detail || "Couldn't cancel the quest.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const [activeTeam, pastTeam] = useMemo(() => {
    const team = board?.team || [];
    return [team.filter((q) => q.status === "active"), team.filter((q) => q.status !== "active")];
  }, [board]);

  const resets = board ? new Date(board.week_ends) : null;
  const doneThisWeek = board?.weekly.filter((q) => q.completed).length || 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Quests"
        description="Bonus XP for reaching goals. Weekly quests reset every Monday; team quests are set by managers on a project."
        actions={
          canCreate && (
            <Button variant="primary" icon={Plus} onClick={openCreate} data-testid="new-team-quest">
              New team quest
            </Button>
          )
        }
      />

      {error && !board ? (
        <div className="surface">
          <EmptyState icon={Flag} title="Couldn't load quests" description="Check your connection and try again." action={<Button onClick={load}>Try again</Button>} />
        </div>
      ) : !board ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 !rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-48 !rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Weekly */}
          <section aria-labelledby="weekly-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="weekly-title" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
                <CalendarCheck size={17} weight="bold" className="text-accent-text" />
                This week
                <span className="num text-xs font-normal text-fg-subtle">
                  {doneThisWeek}/{board.weekly.length} done
                </span>
              </h2>
              {resets && <span className="text-xs text-fg-subtle">Resets {resets.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>}
            </div>
            <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {board.weekly.map((q) => (
                <StaggerItem key={q.id} className="flex">
                  <div className="flex w-full">
                    <WeeklyCard quest={q} />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* Team */}
          <section aria-labelledby="team-title" className="flex flex-col gap-3">
            <h2 id="team-title" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
              <UsersThree size={17} weight="bold" className="text-accent-text" />
              Team quests
              <span className="num text-xs font-normal text-fg-subtle">{activeTeam.length} active</span>
            </h2>
            {activeTeam.length === 0 ? (
              <div className="surface">
                <EmptyState
                  icon={Flag}
                  title="No team quests right now"
                  description={canCreate ? "Set a goal on a project to rally the team. Everyone who helps shares the bonus." : "When a manager sets a team quest on your project, it shows up here."}
                  action={canCreate && <Button variant="primary" icon={Plus} onClick={openCreate}>New team quest</Button>}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {activeTeam.map((q) => (
                  <TeamCard key={q.id} quest={q} userId={user?.id} onCancel={setCancelling} />
                ))}
              </div>
            )}
            {pastTeam.length > 0 && (
              <details className="group mt-1">
                <summary className="cursor-pointer select-none text-[0.8125rem] font-medium text-fg-muted hover:text-fg">
                  Recent ({pastTeam.length})
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {pastTeam.map((q) => (
                    <TeamCard key={q.id} quest={q} userId={user?.id} onCancel={setCancelling} />
                  ))}
                </div>
              </details>
            )}
          </section>
        </>
      )}

      {/* Create team quest */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New team quest"
        description="Everyone who finishes a task in the project counts toward the goal. The bonus is shared by contribution."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" form="team-quest-form" variant="primary" icon={Flag} loading={submitting} data-testid="team-quest-submit">
              Create quest
            </Button>
          </>
        }
      >
        <form id="team-quest-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Field label="Project">
            {(p) => (
              <select {...p} className="control" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required data-testid="team-quest-project" data-autofocus>
                <option value="">Choose a project</option>
                {projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tasks to finish" hint="1 to 50">
              {(p) => (
                <input {...p} type="number" min={1} max={50} className="control num" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required data-testid="team-quest-target" />
              )}
            </Field>
            <Field label="Bonus XP" hint="Shared, 25 to 5000">
              {(p) => (
                <input {...p} type="number" min={25} max={5000} step={25} className="control num" value={form.reward_xp} onChange={(e) => setForm({ ...form, reward_xp: e.target.value })} required data-testid="team-quest-reward" />
              )}
            </Field>
            <Field label="Ends on" hint="At 6 PM">
              {(p) => (
                <input
                  {...p}
                  type="date"
                  className="control"
                  value={form.ends_on}
                  min={dateLimits.min}
                  max={dateLimits.max}
                  onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
                  required
                />
              )}
            </Field>
          </div>
          <Field label="Title" optional hint={`Leave blank for "${autoTitle}".`}>
            {(p) => <input {...p} type="text" className="control" maxLength={150} placeholder={autoTitle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
          </Field>
          <Field label="Description" optional>
            {(p) => (
              <textarea {...p} className="control" rows={2} maxLength={300} placeholder="Why this goal matters" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            )}
          </Field>
        </form>
      </Modal>

      {/* Cancel confirm */}
      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this quest?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button variant="danger" icon={X} onClick={handleCancel} loading={submitting} data-testid="confirm-cancel-quest">
              Cancel quest
            </Button>
          </>
        }
      >
        {cancelling && (
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">{cancelling.title}</span> will stop counting progress, and nobody will receive the bonus. This can't be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default Quests;
