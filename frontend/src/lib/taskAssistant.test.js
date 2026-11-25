import { describe, it, expect } from "vitest";
import { tokenize, buildIndex, cosine, similarTasks, suggestXp, suggestAssignees } from "./taskAssistant";

const NOW = new Date("2026-11-24T12:00:00Z").getTime();
const day = 86400000;

const staff = [
  { id: 1, first_name: "Aisha", role: "Employee", is_active: true },
  { id: 2, first_name: "Rohan", role: "Employee", is_active: true },
  { id: 3, first_name: "Meera", role: "Employee", is_active: true },
  { id: 4, first_name: "Kabir", role: "Employee", is_active: false },
  { id: 5, first_name: "Admin", role: "Admin", is_active: true },
];

let id = 100;
const task = (over) => ({ id: id++, title: "", description: "", xp: 100, status: "Completed", project_id: null, assigned_to_id: null, due_date: null, ...over });

const history = [
  task({ title: "Design landing page in Figma", xp: 300, assigned_to_id: 1, project_id: 1, project: { name: "Website Revamp" } }),
  task({ title: "Design pricing page mockups", xp: 250, assigned_to_id: 1, project_id: 1 }),
  task({ title: "Fix accessibility issues on signup form", xp: 200, assigned_to_id: 2, project_id: 1 }),
  task({ title: "Build nightly ETL pipeline", xp: 500, assigned_to_id: 3, project_id: 2 }),
  task({ title: "Backfill sales data into warehouse", xp: 350, assigned_to_id: 3, project_id: 2 }),
  task({ title: "Write help-center articles", xp: 100, assigned_to_id: 2, project_id: 3 }),
];

describe("tokenize", () => {
  it("drops filler words and stems simple suffixes", () => {
    expect(tokenize("Designing the new landing pages for a task")).toEqual(["design", "land", "page"]);
    expect(tokenize("Fixed bugs; processes, fixes")).toEqual(["fix", "bug", "process", "fix"]);
    // singular and plural forms must meet at the same stem
    expect(tokenize("page")).toEqual(tokenize("pages"));
    expect(tokenize("process")).toEqual(tokenize("processes"));
  });
});

describe("similarity", () => {
  it("scores related titles above unrelated ones", () => {
    const idx = buildIndex(history);
    const q = idx.vectorize("Design about page in Figma", "");
    const sims = history.map((t) => cosine(q, idx.vectors.get(t.id)));
    expect(sims[0]).toBeGreaterThan(0.4);
    expect(sims[0]).toBeGreaterThan(sims[3]);
    expect(sims[3]).toBe(0);
  });

  it("handles tasks whose description is null, as the API returns them", () => {
    const fromApi = [
      { id: 1, title: "Configure kubernetes ingress for production", description: null, xp: 450, status: "Completed", assigned_to_id: 1 },
      { id: 2, title: "Configure kubernetes ingress for preview", description: null, xp: 450, status: "Completed", assigned_to_id: 1 },
    ];
    expect(tokenize(null)).toEqual([]);
    expect(suggestXp({ title: "Configure kubernetes ingress for staging", description: null }, fromApi).xp).toBe(450);
    expect(suggestAssignees({ title: "Configure kubernetes ingress", description: null }, fromApi, staff, { now: NOW })[0].user.first_name).toBe("Aisha");
  });

  it("returns nothing for a title of only filler words", () => {
    expect(similarTasks({ title: "the new task" }, history)).toEqual([]);
  });
});

describe("suggestXp", () => {
  it("averages the XP of similar tasks, weighted by similarity, rounded to 25", () => {
    const s = suggestXp({ title: "Design careers page in Figma", description: "" }, history);
    expect(s.xp).toBeGreaterThanOrEqual(250);
    expect(s.xp).toBeLessThanOrEqual(300);
    expect(s.xp % 25).toBe(0);
    expect(s.basis[0].title).toBe("Design landing page in Figma");
    expect(s.reason).toMatch(/similar task/);
  });

  it("falls back to the project's typical reward when nothing is similar", () => {
    const s = suggestXp({ title: "Quarterly vendor review", projectId: "2" }, history);
    expect(s).toMatchObject({ xp: 425, confidence: "low", basis: [] });
    expect(s.reason).toMatch(/Typical for/);
  });

  it("falls back to the team median otherwise, and handles empty input", () => {
    expect(suggestXp({ title: "Quarterly vendor review" }, history)).toMatchObject({ xp: 275, reason: "Typical task reward" });
    expect(suggestXp({ title: "" }, history)).toBeNull();
    expect(suggestXp({ title: "Anything" }, [])).toBeNull();
  });

  it("never leaves the allowed 10 to 5000 range", () => {
    const big = [task({ title: "Migrate legacy data", xp: 5000 }), task({ title: "Migrate legacy data again", xp: 5000 })];
    expect(suggestXp({ title: "Migrate legacy data" }, big).xp).toBe(5000);
  });
});

describe("suggestAssignees", () => {
  it("puts the person with related finished work first and explains why", () => {
    const [first] = suggestAssignees({ title: "Design careers page in Figma", projectId: "1" }, history, staff, { now: NOW });
    expect(first.user.first_name).toBe("Aisha");
    expect(first.reasons[0]).toBe('Finished "Design landing page in Figma"');
    expect(first.reasons).toContain("2 tasks in this project");
  });

  it("prefers someone free when experience is equal", () => {
    const busy = [...history, ...[1, 2, 3, 4].map((n) => task({ title: `Open item ${n}`, status: "Todo", assigned_to_id: 3 }))];
    const ranked = suggestAssignees({ title: "Unrelated chore" }, busy, staff, { now: NOW });
    expect(ranked.at(-1).user.first_name).toBe("Meera");
    expect(ranked.find((r) => r.user.first_name === "Meera").reasons).toContain("4 open tasks");
  });

  it("penalises overdue work and mentions it", () => {
    const late = [...history, task({ title: "Overdue thing", status: "In Progress", assigned_to_id: 2, due_date: new Date(NOW - 3 * day).toISOString() })];
    const rohan = suggestAssignees({ title: "Help-center articles refresh" }, late, staff, { now: NOW }).find((r) => r.user.first_name === "Rohan");
    expect(rohan.reasons).toContain("1 overdue");
  });

  it("only suggests managers who have related experience", () => {
    const withManager = [...staff, { id: 6, first_name: "Priya", role: "Manager", is_active: true }];
    const generic = suggestAssignees({ title: "Quarterly vendor review" }, history, withManager, { now: NOW, limit: 10 }).map((r) => r.user.first_name);
    expect(generic).not.toContain("Priya");
    const related = [...history, task({ title: "Quarterly vendor review notes", assigned_to_id: 6 })];
    const ranked = suggestAssignees({ title: "Quarterly vendor review" }, related, withManager, { now: NOW, limit: 10 }).map((r) => r.user.first_name);
    expect(ranked[0]).toBe("Priya");
  });

  it("skips inactive people and admins", () => {
    const names = suggestAssignees({ title: "Anything at all" }, history, staff, { now: NOW, limit: 10 }).map((r) => r.user.first_name);
    expect(names).not.toContain("Kabir");
    expect(names).not.toContain("Admin");
    expect(names).toHaveLength(3);
  });
});
