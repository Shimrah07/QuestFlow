import { describe, it, expect } from "vitest";
import { levelForecast, projectsAtRisk, workloadBalance, spendTrend, DAY } from "./insights";

const NOW = new Date("2026-11-24T12:00:00Z").getTime();
const ago = (d) => new Date(NOW - d * DAY).toISOString();
const ahead = (d) => new Date(NOW + d * DAY).toISOString();

describe("levelForecast", () => {
  it("projects days to the next level from the average pace since joining", () => {
    const f = levelForecast({ points: 1200, level: 3, created_at: ago(60) }, NOW);
    expect(f).toMatchObject({ status: "on-track", perDay: 20, toNext: 300, nextLevel: 4, days: 15 });
  });

  it("uses at least a week of history so new accounts aren't over-optimistic", () => {
    const f = levelForecast({ points: 300, level: 1, created_at: ago(1) }, NOW);
    expect(f.perDay).toBeCloseTo(300 / 7, 1);
    expect(f.days).toBe(Math.ceil(200 / (300 / 7)));
  });

  it("asks for a first task when there is no XP yet", () => {
    expect(levelForecast({ points: 0, level: 1, created_at: ago(30) }, NOW)).toEqual({ status: "not-started", toNext: 500, nextLevel: 2 });
    expect(levelForecast(null, NOW)).toBeNull();
  });
});

describe("projectsAtRisk", () => {
  const tasks = [
    { id: 1, project_id: 1, project: { name: "Website Revamp", status: "Active" }, status: "Todo", due_date: ago(5) },
    { id: 2, project_id: 1, project: { name: "Website Revamp", status: "Active" }, status: "In Progress", due_date: ago(2) },
    { id: 3, project_id: 1, project: { name: "Website Revamp", status: "Active" }, status: "Completed", due_date: ago(9) },
    { id: 4, project_id: 2, project: { name: "Mobile App", status: "Active" }, status: "Todo", due_date: ago(1) },
    { id: 5, project_id: 2, project: { name: "Mobile App", status: "Active" }, status: "Todo", due_date: ahead(4) },
    { id: 6, project_id: 3, project: { name: "Data Platform", status: "Active" }, status: "Todo", due_date: ahead(9) },
    { id: 7, project_id: 4, project: { name: "Old CRM", status: "Archived" }, status: "Todo", due_date: ago(40) },
    { id: 8, project_id: null, status: "Todo", due_date: ago(3) },
  ];

  it("ranks active projects by overdue open work and ignores archived or unassigned work", () => {
    const r = projectsAtRisk(tasks, NOW);
    expect(r.count).toBe(2);
    expect(r.active).toBe(3);
    expect(r.atRisk.map((p) => [p.name, p.overdue, p.open])).toEqual([
      ["Website Revamp", 2, 2],
      ["Mobile App", 1, 2],
    ]);
    expect(r.atRisk[0].completion).toBeCloseTo(1 / 3);
  });

  it("does not count completed tasks as overdue", () => {
    const r = projectsAtRisk([{ id: 1, project_id: 1, project: { name: "A" }, status: "Completed", due_date: ago(3) }], NOW);
    expect(r.count).toBe(0);
  });
});

describe("workloadBalance", () => {
  const t = (id, who, name, status = "Todo", due = null) => ({ id, assigned_to_id: who, assigned_to: { first_name: name }, status, due_date: due });

  it("finds the busiest person and flags uneven load", () => {
    const tasks = [t(1, 1, "Arjun"), t(2, 1, "Arjun"), t(3, 1, "Arjun"), t(4, 1, "Arjun", "Todo", ago(2)), t(5, 2, "Sara"), t(6, 3, "Rohan"), t(7, 3, "Rohan", "Completed")];
    const w = workloadBalance(tasks, NOW);
    expect(w.busiest).toMatchObject({ name: "Arjun", open: 4, overdue: 1 });
    expect(w.median).toBe(1);
    expect(w.uneven).toBe(true);
    expect(w.people.map((p) => p.name)).toEqual(["Arjun", "Rohan", "Sara"]);
  });

  it("treats an even spread as balanced", () => {
    const tasks = [t(1, 1, "A"), t(2, 1, "A"), t(3, 2, "B"), t(4, 2, "B"), t(5, 3, "C")];
    expect(workloadBalance(tasks, NOW).uneven).toBe(false);
    expect(workloadBalance([], NOW)).toMatchObject({ people: [], busiest: null, uneven: false });
  });
});

describe("spendTrend", () => {
  const e = (amount, days, category = "Travel", status = "Approved") => ({ amount, created_at: ago(days), category, status });

  it("compares the last 30 days with the 30 before and names the top category", () => {
    const r = spendTrend([e(100, 2), e(50, 10, "Meals"), e(50, 20), e(40, 35), e(30, 40, "Meals"), e(30, 50), e(999, 5, "Travel", "Rejected")], NOW);
    expect(r).toMatchObject({ current: 200, previous: 100, count: 3 });
    expect(r.change).toBeCloseTo(1);
    expect(r.topCategory).toMatchObject({ name: "Travel", amount: 150 });
    expect(r.topCategory.share).toBeCloseTo(0.75);
  });

  it("withholds a percentage when the previous period is too small to compare", () => {
    expect(spendTrend([e(100, 2), e(20, 40)], NOW).change).toBeNull();
    expect(spendTrend([], NOW)).toMatchObject({ current: 0, previous: 0, count: 0, change: null, topCategory: null });
  });
});
