import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X, SealCheck, Receipt, Code, Desktop, AirplaneTilt, ForkKnife, ShieldWarning, CaretDown, Info } from "@phosphor-icons/react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import { PageHeader, Avatar, Badge, EmptyState, Skeleton, Segmented, formatMoney, formatDate, timeAgo } from "../../components/ui/primitives";
import { assessExpenses } from "../../lib/expenseRisk";

const CATEGORY_ICON = { Software: Code, Equipment: Desktop, Travel: AirplaneTilt, Meals: ForkKnife };
const RISK_TONE = { high: "danger", medium: "accent", low: "neutral" };

/** Risk badge that toggles the "why" panel. Renders nothing for unflagged claims. */
const RiskToggle = ({ risk, open, onToggle, id }) => {
  if (!risk || risk.level === "none") return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={id}
      data-testid="risk-badge"
      data-level={risk.level}
      className="inline-flex rounded-[6px] transition-opacity hover:opacity-85"
      title="Show why this claim was flagged"
    >
      <Badge tone={RISK_TONE[risk.level]}>
        <ShieldWarning size={12} weight="fill" />
        {risk.label}
        <span className="num opacity-75">{risk.score}</span>
        <CaretDown size={11} weight="bold" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </Badge>
    </button>
  );
};

const Approvals = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const reduce = useReducedMotion();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]); // every claim visible to the reviewer, used as the risk baseline
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("risk");
  const [openReasons, setOpenReasons] = useState(() => new Set());

  // Load the pending queue once on mount; stale responses are ignored (StrictMode double-mount safe).
  useEffect(() => {
    let ignore = false;
    api
      .get("/expenses")
      .then((response) => {
        // Filter for only pending expenses; keep the full list as history for the risk engine
        if (!ignore) {
          setHistory(response.data);
          setItems(response.data.filter((e) => e.status === "Pending"));
        }
      })
      .catch(() => {
        if (!ignore) showToast("Couldn't load the review queue.", "error");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [showToast]);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/expenses/${id}/status`, {
        status: action,
      });
      showToast(`Claim ${action === "Approved" ? "approved" : "rejected"}.`, action === "Approved" ? "success" : "error");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setHistory((prev) => prev.map((e) => (e.id === id ? { ...e, status: action } : e)));
      window.dispatchEvent(new Event("approvals-updated"));
    } catch (error) {
      showToast(error.response?.data?.detail || "Couldn't save that decision. Try again.", "error");
    }
  };

  const total = items.reduce((s, e) => s + e.amount, 0);

  // Risk is worked out in the browser from the claims this reviewer can already see.
  const risk = useMemo(() => assessExpenses(items, history), [items, history]);
  const flagged = items.filter((e) => risk.get(e.id)?.level !== "none");
  const counts = flagged.reduce((acc, e) => {
    const level = risk.get(e.id).level;
    return { ...acc, [level]: (acc[level] || 0) + 1 };
  }, {});
  const ordered = useMemo(() => {
    const list = [...items];
    if (sort === "risk") {
      return list.sort((a, b) => (risk.get(b.id)?.score || 0) - (risk.get(a.id)?.score || 0) || new Date(a.created_at) - new Date(b.created_at));
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [items, risk, sort]);

  const toggleReasons = (id) =>
    setOpenReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approvals"
        description="Pending expense claims waiting for a decision. You can't review your own claims."
        actions={
          !loading &&
          items.length > 0 && (
            <div className="flex items-baseline gap-2 rounded-[10px] border border-line bg-surface px-3.5 py-2">
              <span className="num text-sm font-semibold text-fg">{items.length}</span>
              <span className="text-xs text-fg-subtle">pending</span>
              <span className="mx-1 h-3 w-px self-center bg-line-strong" aria-hidden />
              <span className="num text-sm font-semibold text-accent-text">{formatMoney(total)}</span>
            </div>
          )
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surface flex items-center gap-4 p-5">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="hidden h-9 w-48 sm:block" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={SealCheck}
            title="The queue is clear"
            description="New claims from your team will appear here as soon as they're submitted."
          />
        </div>
      ) : (
        <>
          {/* Review assistant summary */}
          <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="risk-summary">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border ${
                  flagged.length ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success"
                }`}
              >
                {flagged.length ? <ShieldWarning size={18} weight="fill" /> : <SealCheck size={18} weight="fill" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">
                  {flagged.length ? `${flagged.length} of ${items.length} claims worth a closer look` : "Nothing unusual in this queue"}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  {["high", "medium", "low"]
                    .filter((l) => counts[l])
                    .map((l) => (
                      <span key={l} className="num">
                        {counts[l]} {l}
                      </span>
                    ))}
                  <span
                    className="inline-flex items-center gap-1"
                    title="Checks for duplicates, amounts unusual for the category or the person, large or round figures, and bursts of claims. Worked out in your browser from the claims you can see. Flags are prompts to look closer, not decisions."
                  >
                    <Info size={12} weight="bold" />
                    Checked in your browser against {history.length} claims
                  </span>
                </p>
              </div>
            </div>
            <Segmented
              ariaLabel="Sort the queue"
              layoutId="approvals-sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "risk", label: "Highest risk" },
                { value: "newest", label: "Newest" },
              ]}
              className="self-start sm:self-auto"
            />
          </div>

          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {ordered.map((item) => {
                const Icon = CATEGORY_ICON[item.category] || Receipt;
                const isMine = item.submitted_by_id === user?.id;
                const name = item.submitted_by?.first_name || "Unknown";
                const r = risk.get(item.id);
                const showWhy = openReasons.has(item.id);
                const reasonsId = `risk-reasons-${item.id}`;
                return (
                  <motion.li
                    key={item.id}
                    layout={!reduce}
                    data-testid="approval-item"
                    data-risk={r?.level}
                    initial={false}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                    className={`surface relative overflow-hidden p-4 sm:p-5 ${r?.level === "high" ? "!border-danger/35" : ""}`}
                  >
                    {r?.level === "high" && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-danger" />}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      {/* Submitter + claim */}
                      <div className="flex min-w-0 flex-1 items-start gap-3.5">
                        <Avatar name={name} size={40} highlight={isMine} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-fg">{isMine ? "You" : name}</span>
                            {isMine && <Badge tone="neutral">Your claim</Badge>}
                            <RiskToggle risk={r} open={showWhy} onToggle={() => toggleReasons(item.id)} id={reasonsId} />
                            <span className="text-xs text-fg-subtle">{timeAgo(item.created_at)}</span>
                          </div>
                          <p className="mt-1 truncate text-[0.9375rem] text-fg">{item.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon size={14} aria-hidden />
                              {item.category}
                            </span>
                            <span>{formatDate(item.created_at, { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="num text-fg-subtle">EXP-{item.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Amount + decision */}
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4 md:flex-nowrap md:border-t-0 md:pt-0">
                        <span className="num text-lg font-semibold text-fg md:min-w-[7rem] md:text-right">{formatMoney(item.amount)}</span>
                        <div
                          className="grid w-full grid-cols-2 gap-2 min-[420px]:flex min-[420px]:w-auto"
                          title={isMine ? "Another manager or an admin has to review your own claim." : undefined}
                        >
                          <Button
                            variant="danger"
                            icon={X}
                            data-testid="reject-btn"
                            aria-label={`Reject ${item.title}`}
                            disabled={isMine}
                            onClick={() => handleAction(item.id, "Rejected")}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            icon={Check}
                            data-testid="approve-btn"
                            aria-label={`Approve ${item.title}`}
                            disabled={isMine}
                            onClick={() => handleAction(item.id, "Approved")}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Why this claim was flagged */}
                    <AnimatePresence initial={false}>
                      {showWhy && r?.reasons.length > 0 && (
                        <motion.div
                          id={reasonsId}
                          data-testid="risk-reasons"
                          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-4 flex flex-col gap-2.5 rounded-[12px] border border-line bg-bg-sunken/60 p-3.5">
                            {r.reasons.map((reason) => (
                              <li key={reason.code + reason.title} className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[0.8125rem] font-semibold text-fg">{reason.title}</p>
                                  <p className="text-xs leading-snug text-fg-muted">{reason.detail}</p>
                                </div>
                                <span className="num shrink-0 text-xs font-semibold text-fg-subtle" title="Points added to the risk score">
                                  +{reason.weight}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}
    </div>
  );
};

export default Approvals;
