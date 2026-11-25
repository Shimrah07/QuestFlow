import { useDeferredValue, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkle, Lightning, Check, UserCirclePlus } from "@phosphor-icons/react";
import { Avatar } from "../ui/primitives";
import { buildIndex, suggestAssignees, suggestXp, tokenize } from "../../lib/taskAssistant";

const CONFIDENCE_LABEL = { high: "Strong match", medium: "Partial match", low: "Rough estimate" };

/**
 * Live suggestions for the New task dialog: an XP reward from similar past tasks and the people
 * best placed to take the work. Nothing changes until the manager clicks a suggestion.
 */
const TaskAssistantPanel = ({ title, description, projectId, tasks, staff, xp, assignedToId, onApplyXp, onAssign }) => {
  const reduce = useReducedMotion();
  // Deferred so typing stays instant; suggestions catch up a frame later.
  const dTitle = useDeferredValue(title);
  const dDescription = useDeferredValue(description);
  const dProject = useDeferredValue(projectId);
  const draft = useMemo(() => ({ title: dTitle, description: dDescription, projectId: dProject }), [dTitle, dDescription, dProject]);
  const index = useMemo(() => buildIndex(tasks), [tasks]);
  const ready = tokenize(draft.title).length > 0 && tasks.length > 0;

  const xpSuggestion = useMemo(() => (ready ? suggestXp(draft, tasks, index) : null), [ready, draft, tasks, index]);
  const people = useMemo(() => (ready ? suggestAssignees(draft, tasks, staff, { index }) : []), [ready, draft, tasks, staff, index]);

  const xpApplied = xpSuggestion && Number(xp) === xpSuggestion.xp;

  return (
    <AnimatePresence initial={false}>
      {ready && xpSuggestion && (
        <motion.section
          key="assistant"
          aria-label="Suggestions"
          data-testid="assistant-panel"
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden"
        >
          <div className="rounded-[14px] border border-accent/25 bg-accent/[0.05] p-3.5">
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-fg">
              <Sparkle size={14} weight="fill" className="text-accent-text" />
              Suggestions
              <span className="font-normal text-fg-subtle">from your team's past tasks</span>
            </p>

            {/* XP */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="num inline-flex items-center gap-1 rounded-[8px] bg-surface px-2 py-1 text-sm font-semibold text-fg ring-1 ring-line" data-testid="assistant-xp">
                <Lightning size={14} weight="fill" className="text-accent-text" />
                {xpSuggestion.xp} XP
              </span>
              <span className="min-w-0 flex-1 text-xs text-fg-muted">
                {xpSuggestion.reason}
                <span className="text-fg-subtle"> · {CONFIDENCE_LABEL[xpSuggestion.confidence]}</span>
              </span>
              <button
                type="button"
                onClick={() => onApplyXp(xpSuggestion.xp)}
                disabled={xpApplied}
                data-testid="assistant-apply-xp"
                className={`btn btn-sm ${xpApplied ? "btn-ghost !text-success" : "btn-secondary"}`}
              >
                {xpApplied ? (
                  <>
                    <Check size={14} weight="bold" /> Applied
                  </>
                ) : (
                  `Use ${xpSuggestion.xp}`
                )}
              </button>
            </div>
            {xpSuggestion.basis.length > 0 && (
              <p className="mt-1.5 truncate text-[0.6875rem] text-fg-subtle" title={xpSuggestion.basis.map((b) => `${b.title} (${b.xp} XP)`).join("\n")}>
                Like {xpSuggestion.basis.map((b) => `"${b.title}" (${b.xp})`).join(", ")}
              </p>
            )}

            {/* Assignees */}
            {people.length > 0 && (
              <div className="mt-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                  <UserCirclePlus size={14} weight="bold" />
                  Best placed to take it
                </p>
                <div role="radiogroup" aria-label="Suggested assignees" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {people.map(({ user, reasons }, i) => {
                    const selected = String(user.id) === String(assignedToId);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onAssign(String(user.id))}
                        data-testid="assistant-assignee"
                        data-user-id={user.id}
                        className={`flex min-w-0 items-start gap-2.5 rounded-[11px] border p-2.5 text-left transition-[border-color,background-color] duration-150 ${
                          selected ? "border-accent/60 bg-accent/[0.09]" : "border-line bg-surface hover:border-line-strong"
                        }`}
                      >
                        <Avatar name={user.first_name} size={28} highlight={selected || i === 0} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-[0.8125rem] font-semibold text-fg">
                            <span className="truncate">{user.first_name}</span>
                            {selected && <Check size={12} weight="bold" className="shrink-0 text-accent-text" />}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug text-fg-subtle" title={reasons.join(" · ")}>
                            {reasons.slice(0, 2).join(" · ")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default TaskAssistantPanel;
