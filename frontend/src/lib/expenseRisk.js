/**
 * Expense risk engine. Runs in the browser on the claims the reviewer can already see.
 *
 * Each signal is a small, explainable rule with a weight. A claim's score is the capped sum of
 * its signals, and every point on the score comes with a plain-language reason, so a reviewer
 * can see exactly why something was flagged. Scores are hints for prioritising review, never
 * automatic decisions.
 *
 * Baselines use robust statistics (median and MAD) so one huge claim can't hide another.
 */

export const RISK_LEVELS = [
  { level: "high", min: 50, label: "High risk" },
  { level: "medium", min: 25, label: "Medium risk" },
  { level: "low", min: 10, label: "Low risk" },
];

export const WEIGHTS = {
  duplicate: 50, // a probable double claim is high risk on its own
  nearDuplicate: 20,
  categoryOutlierStrong: 35,
  categoryOutlier: 15,
  personalOutlier: 15,
  highValue: 15,
  burst: 10,
  roundAmount: 10,
};

export const HIGH_VALUE_THRESHOLD = 1000;
const DAY = 24 * 60 * 60 * 1000;

/* ---------------- statistics ---------------- */

export const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Median absolute deviation. */
export const mad = (xs, med = median(xs)) => median(xs.map((x) => Math.abs(x - med)));

/** Modified z-score (Iglewicz and Hoaglin). Above 3.5 is a strong outlier. */
export const robustZ = (x, med, madValue) => (madValue > 0 ? (0.6745 * (x - med)) / madValue : x > med ? Infinity : 0);

/* ---------------- helpers ---------------- */

const tokens = (s) =>
  new Set(
    String(s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );

/** Jaccard similarity of title word sets, 0..1. */
export const titleSimilarity = (a, b) => {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
};

const time = (e) => new Date(e.created_at).getTime();
const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const daysApart = (a, b) => Math.abs(time(a) - time(b)) / DAY;
const describeGap = (d) => (d < 1 ? "the same day" : `${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"} apart`);
const amountsMatch = (a, b) => Math.abs(a - b) <= Math.max(1, 0.01 * Math.max(a, b));

export const levelFor = (score) => RISK_LEVELS.find((l) => score >= l.min) || { level: "none", min: 0, label: "No flags" };

/* ---------------- main ---------------- */

/**
 * @param {Array} targets   claims to score (e.g. the pending queue)
 * @param {Array} history   every claim the reviewer can see, used for baselines and duplicates
 * @returns {Map<number, { score, level, label, reasons: Array<{ code, title, detail, weight }> }>}
 */
export function assessExpenses(targets, history = targets) {
  const all = history.length ? history : targets;
  const byCategory = new Map();
  for (const e of all) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category).push(e);
  }

  const results = new Map();
  for (const claim of targets) {
    const reasons = [];
    const others = all.filter((e) => e.id !== claim.id);
    const mine = others.filter((e) => e.submitted_by_id === claim.submitted_by_id);

    // 1. Duplicates: same person, same or very similar title, same amount, within two weeks.
    const dup = mine
      .filter((e) => e.status !== "Rejected" && daysApart(e, claim) <= 14 && amountsMatch(e.amount, claim.amount))
      .map((e) => ({ e, sim: titleSimilarity(e.title, claim.title) }))
      .filter((x) => x.sim >= 0.6)
      .sort((a, b) => b.sim - a.sim || daysApart(a.e, claim) - daysApart(b.e, claim))[0];
    if (dup) {
      reasons.push({
        code: "duplicate",
        title: "Possible duplicate",
        detail: `Same ${dup.sim === 1 ? "title" : "description"} and amount as EXP-${dup.e.id}, submitted ${describeGap(daysApart(dup.e, claim))}.`,
        weight: WEIGHTS.duplicate,
        relatedId: dup.e.id,
      });
    } else {
      // Same person, same category, same amount, within 3 days, but a different title.
      const near = mine.find(
        (e) => e.status !== "Rejected" && e.category === claim.category && daysApart(e, claim) <= 3 && amountsMatch(e.amount, claim.amount)
      );
      if (near) {
        reasons.push({
          code: "near-duplicate",
          title: "Repeated amount",
          detail: `${money(claim.amount)} in ${claim.category} was also claimed as EXP-${near.id}, ${describeGap(daysApart(near, claim))}.`,
          weight: WEIGHTS.nearDuplicate,
          relatedId: near.id,
        });
      }
    }

    // 2. Unusually high compared with like-for-like claims (robust z-score).
    //    Categories are broad (Travel holds both $12 cabs and $250 hotels), so when there are at
    //    least 3 earlier claims with a similar title we compare against those instead.
    const categoryPeers = (byCategory.get(claim.category) || []).filter((e) => e.id !== claim.id);
    // A suspected duplicate must not vouch for its own copy.
    const similarPeers = categoryPeers.filter((e) => e.id !== dup?.e.id && titleSimilarity(e.title, claim.title) >= 0.5);
    const useSimilar = similarPeers.length >= 3;
    const peers = (useSimilar ? similarPeers : categoryPeers).map((e) => e.amount);
    const peerLabel = useSimilar ? `"${claim.title}" claims` : `${claim.category} claims`;
    // Even one or two earlier similar claims at a comparable amount make it ordinary.
    const inLineWithSimilar =
      !useSimilar && similarPeers.length > 0 && claim.amount <= 1.5 * Math.max(...similarPeers.map((e) => e.amount));
    if (!inLineWithSimilar && peers.length >= (useSimilar ? 3 : 5)) {
      const med = median(peers);
      const z = robustZ(claim.amount, med, mad(peers, med));
      const ratio = med > 0 ? claim.amount / med : 0;
      if (z >= 3.5 && ratio >= 2) {
        reasons.push({
          code: "category-outlier",
          title: useSimilar ? "Unusually high for this kind of claim" : `Unusually high for ${claim.category}`,
          detail: `${ratio.toFixed(1)}x the typical amount for ${peerLabel} (${money(med)}).`,
          weight: WEIGHTS.categoryOutlierStrong,
        });
      } else if (z >= 2.5 && ratio >= 1.5) {
        reasons.push({
          code: "category-outlier",
          title: useSimilar ? "Above normal for this kind of claim" : `Above normal for ${claim.category}`,
          detail: `${ratio.toFixed(1)}x the typical amount for ${peerLabel} (${money(med)}).`,
          weight: WEIGHTS.categoryOutlier,
        });
      }
    }

    // 3. Unusually high for this person in this category.
    const personal = mine.filter((e) => e.category === claim.category).map((e) => e.amount);
    if (personal.length >= 3) {
      const med = median(personal);
      if (med > 0 && claim.amount >= 3 * med) {
        reasons.push({
          code: "personal-outlier",
          title: "High for this person",
          detail: `${(claim.amount / med).toFixed(1)}x their usual ${claim.category} claim (${money(med)}).`,
          weight: WEIGHTS.personalOutlier,
        });
      }
    }

    // 4. Large amount.
    if (claim.amount >= HIGH_VALUE_THRESHOLD) {
      reasons.push({
        code: "high-value",
        title: "Large amount",
        detail: `Above the ${money(HIGH_VALUE_THRESHOLD)} review threshold.`,
        weight: WEIGHTS.highValue,
      });
    }

    // 5. Several claims from one person within 24 hours.
    const sameDay = mine.filter((e) => Math.abs(time(e) - time(claim)) <= DAY).length + 1;
    if (sameDay >= 3) {
      reasons.push({
        code: "burst",
        title: "Burst of claims",
        detail: `${sameDay} claims from this person within 24 hours.`,
        weight: WEIGHTS.burst,
      });
    }

    // 6. Suspiciously round amount (receipts rarely total exactly $500.00).
    if (claim.amount >= 100 && claim.amount % 50 === 0) {
      reasons.push({
        code: "round-amount",
        title: "Round amount",
        detail: `${money(claim.amount)} is an exact round figure. Receipts rarely total that.`,
        weight: WEIGHTS.roundAmount,
      });
    }

    reasons.sort((a, b) => b.weight - a.weight);
    const score = Math.min(100, reasons.reduce((s, r) => s + r.weight, 0));
    const { level, label } = levelFor(score);
    results.set(claim.id, { score, level, label, reasons });
  }
  return results;
}
