/**
 * Task assistant: suggests an XP reward and assignees for a new task from the team's own history.
 *
 * Runs in the browser on tasks the page already loaded. Similarity is TF-IDF over title and
 * description (titles count double), compared with cosine similarity. Every suggestion carries
 * the evidence behind it so the manager can judge it at a glance.
 */

const STOP = new Set(
  "a an and are as at be by for from has have in into is it its of on or our the this to up we with will task tasks new add make set do get use via per all any".split(" ")
);

/** Lowercase words with light stemming, so "designing", "designs" and "design" match. */
export const tokenize = (text) =>
  // API tasks created without a description carry `null`, not undefined, so default explicitly.
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => {
      if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
      if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
      if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2); // processes, fixes, matches
      if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1); // pages, bugs
      return w;
    });

const docTokens = (title = "", description = "") => [...tokenize(title), ...tokenize(title), ...tokenize(description)];

/** Builds IDF weights and a vectoriser over a set of tasks. */
export function buildIndex(tasks) {
  const docs = tasks.map((t) => docTokens(t.title, t.description));
  const df = new Map();
  for (const tokens of docs) for (const w of new Set(tokens)) df.set(w, (df.get(w) || 0) + 1);
  const n = docs.length;
  const idf = (w) => Math.log((n + 1) / ((df.get(w) || 0) + 1)) + 1;

  const vectorize = (tokens) => {
    const tf = new Map();
    for (const w of tokens) tf.set(w, (tf.get(w) || 0) + 1);
    const v = new Map();
    let norm = 0;
    for (const [w, c] of tf) {
      const x = c * idf(w);
      v.set(w, x);
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [w, x] of v) v.set(w, x / norm);
    return v;
  };

  const vectors = new Map(tasks.map((t, i) => [t.id, vectorize(docs[i])]));
  return { vectorize: (title, description) => vectorize(docTokens(title, description)), vectors };
}

export const cosine = (a, b) => {
  let s = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [w, x] of small) {
    const y = large.get(w);
    if (y) s += x * y;
  }
  return s;
};

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const roundXp = (x) => Math.min(5000, Math.max(10, Math.round(x / 25) * 25));
const isOpen = (t) => t.status !== "Completed";
const isOverdue = (t, now) => isOpen(t) && t.due_date && new Date(t.due_date).getTime() < now;

/** Ranks past tasks by similarity to the draft. A shared project adds a small bonus. */
export function similarTasks(draft, tasks, index = buildIndex(tasks), { min = 0.25, limit = 5 } = {}) {
  const q = index.vectorize(draft.title, draft.description);
  if (!q.size) return [];
  const projectId = draft.projectId ? Number(draft.projectId) : null;
  return tasks
    .filter((t) => t.id !== draft.id)
    .map((t) => ({ task: t, score: cosine(q, index.vectors.get(t.id)) + (projectId && t.project_id === projectId ? 0.05 : 0) }))
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Suggests an XP reward.
 * @returns {{ xp, confidence, basis: Array<{title, xp}>, reason } | null}
 */
export function suggestXp(draft, tasks, index = buildIndex(tasks)) {
  if (!tasks.length || tokenize(draft.title).length === 0) return null;
  const near = similarTasks(draft, tasks, index);
  if (near.length) {
    const weight = near.reduce((s, x) => s + x.score, 0);
    const xp = roundXp(near.reduce((s, x) => s + x.task.xp * x.score, 0) / weight);
    const top = near[0].score;
    const confidence = top >= 0.5 && near.length >= 2 ? "high" : top >= 0.3 ? "medium" : "low";
    return {
      xp,
      confidence,
      basis: near.slice(0, 3).map((x) => ({ title: x.task.title, xp: x.task.xp })),
      reason: near.length === 1 ? "From 1 similar task" : `From ${near.length} similar tasks`,
    };
  }
  const projectId = draft.projectId ? Number(draft.projectId) : null;
  const inProject = projectId ? tasks.filter((t) => t.project_id === projectId) : [];
  if (inProject.length >= 2) {
    return {
      xp: roundXp(median(inProject.map((t) => t.xp))),
      confidence: "low",
      basis: [],
      reason: `Typical for ${inProject[0].project?.name || "this project"}`,
    };
  }
  return { xp: roundXp(median(tasks.map((t) => t.xp))), confidence: "low", basis: [], reason: "Typical task reward" };
}

/**
 * Ranks people to assign the task to.
 * Score = 0.5 related experience + 0.2 project familiarity + 0.3 availability, minus an overdue penalty.
 * Managers appear only when they have related experience.
 * @returns Array<{ user, score, reasons: string[] }>
 */
export function suggestAssignees(draft, tasks, staff, { now = Date.now(), limit = 3, index = buildIndex(tasks) } = {}) {
  const q = index.vectorize(draft.title, draft.description);
  const projectId = draft.projectId ? Number(draft.projectId) : null;
  const people = staff.filter((u) => u.is_active !== false && u.role !== "Admin");

  const ranked = people.map((user) => {
    const theirs = tasks.filter((t) => t.assigned_to_id === user.id && t.id !== draft.id);
    const open = theirs.filter(isOpen).length;
    const overdue = theirs.filter((t) => isOverdue(t, now)).length;

    // Related experience: best matches among their tasks; finished work counts fully, open work at 60%.
    const matches = q.size
      ? theirs
          .map((t) => ({ t, s: cosine(q, index.vectors.get(t.id)) * (t.status === "Completed" ? 1 : 0.6) }))
          .filter((x) => x.s >= 0.2)
          .sort((a, b) => b.s - a.s)
      : [];
    const experience = matches.length ? Math.min(1, (matches.slice(0, 2).reduce((s, x) => s + x.s, 0) / Math.min(2, matches.length)) / 0.6) : 0;
    const inProject = projectId ? theirs.filter((t) => t.project_id === projectId).length : 0;
    const familiarity = Math.min(1, inProject / 3);
    const availability = 1 / (1 + open);
    const score = 0.5 * experience + 0.2 * familiarity + 0.3 * availability - 0.1 * (Math.min(overdue, 3) / 3);

    const reasons = [];
    const best = matches[0]?.t;
    if (best) reasons.push(best.status === "Completed" ? `Finished "${best.title}"` : `Working on "${best.title}"`);
    if (inProject) reasons.push(`${inProject} task${inProject === 1 ? "" : "s"} in this project`);
    reasons.push(open === 0 ? "No open tasks" : `${open} open task${open === 1 ? "" : "s"}`);
    if (overdue) reasons.push(`${overdue} overdue`);

    return { user, score: Math.round(score * 100) / 100, reasons, open, overdue, experience };
  });

  // Managers are only suggested when they have related experience, not just a free calendar.
  return ranked
    .filter((r) => r.user.role !== "Manager" || r.experience > 0).sort((a, b) => b.score - a.score || a.open - b.open || a.user.first_name.localeCompare(b.user.first_name)).slice(0, limit);
}
