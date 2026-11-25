import { describe, it, expect } from "vitest";
import { assessExpenses, median, mad, robustZ, titleSimilarity, levelFor } from "./expenseRisk";

const NOW = new Date("2026-11-24T12:00:00Z").getTime();
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();
let nextId = 1;
const claim = (over) => ({
  id: nextId++,
  title: "Team lunch",
  category: "Meals",
  amount: 42.5,
  status: "Approved",
  submitted_by_id: 10,
  created_at: daysAgo(20),
  ...over,
});

// A normal history: varied amounts per category across several people, weeks apart.
const baseline = () => [
  ...[38.4, 52.1, 44.9, 61.3, 29.8, 47.2, 55.6].map((amount, i) => claim({ title: `Lunch ${i}`, amount, submitted_by_id: 20 + i, created_at: daysAgo(30 + i * 3) })),
  ...[180.2, 240.75, 96.4, 310.0 + 0.55, 145.3, 205.9].map((amount, i) => claim({ title: `Trip ${i}`, category: "Travel", amount, submitted_by_id: 30 + i, created_at: daysAgo(25 + i * 4) })),
];

describe("statistics", () => {
  it("computes median, MAD and robust z-scores", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(mad([1, 2, 3, 4, 100])).toBe(1);
    expect(robustZ(100, 3, 1)).toBeGreaterThan(3.5);
    expect(robustZ(5, 5, 0)).toBe(0);
  });

  it("measures title similarity on words", () => {
    expect(titleSimilarity("Client dinner", "client  dinner!")).toBe(1);
    expect(titleSimilarity("Client dinner", "Client lunch")).toBeCloseTo(1 / 3);
    expect(titleSimilarity("", "x")).toBe(0);
  });

  it("maps scores to levels", () => {
    expect(levelFor(80).level).toBe("high");
    expect(levelFor(30).level).toBe("medium");
    expect(levelFor(10).level).toBe("low");
    expect(levelFor(5).level).toBe("none");
  });
});

describe("assessExpenses", () => {
  it("leaves ordinary claims unflagged", () => {
    const history = baseline();
    const normal = claim({ title: "Working lunch", amount: 46.25, status: "Pending", created_at: daysAgo(1), submitted_by_id: 99 });
    const r = assessExpenses([normal], [...history, normal]).get(normal.id);
    expect(r.score).toBe(0);
    expect(r.level).toBe("none");
    expect(r.reasons).toEqual([]);
  });

  it("flags a duplicate submission as high risk and names the original", () => {
    const history = baseline();
    const first = claim({ title: "Client dinner", amount: 142.5, status: "Pending", submitted_by_id: 7, created_at: daysAgo(3) });
    const second = claim({ title: "Client dinner", amount: 142.5, status: "Pending", submitted_by_id: 7, created_at: daysAgo(2) });
    const r = assessExpenses([second], [...history, first, second]).get(second.id);
    expect(r.level).toBe("high");
    expect(r.reasons[0]).toMatchObject({ code: "duplicate", relatedId: first.id });
    expect(r.reasons[0].detail).toContain(`EXP-${first.id}`);
    expect(r.reasons[0].detail).toContain("1 day apart");
  });

  it("does not treat a rejected original as a duplicate", () => {
    const first = claim({ title: "Client dinner", amount: 142.5, status: "Rejected", submitted_by_id: 7, created_at: daysAgo(3) });
    const second = claim({ title: "Client dinner", amount: 142.5, status: "Pending", submitted_by_id: 7, created_at: daysAgo(2) });
    const r = assessExpenses([second], [...baseline(), first, second]).get(second.id);
    expect(r.reasons.find((x) => x.code === "duplicate")).toBeUndefined();
  });

  it("flags a category outlier and a large amount together as high risk", () => {
    const flight = claim({ title: "Business class flight to Singapore", category: "Travel", amount: 2450, status: "Pending", submitted_by_id: 5, created_at: daysAgo(1) });
    const r = assessExpenses([flight], [...baseline(), flight]).get(flight.id);
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain("category-outlier");
    expect(codes).toContain("high-value");
    expect(r.level).toBe("high");
    expect(r.reasons.find((x) => x.code === "category-outlier").detail).toMatch(/x the typical amount for Travel claims/);
  });

  it("compares like with like when similar past claims exist", () => {
    // Travel is mostly cheap cab rides, but hotel stays are normally a few hundred dollars.
    const cabs = [12.4, 18.9, 22.1, 15.6, 31.2, 19.8, 25.5].map((amount, i) =>
      claim({ title: `Uber to office ${i}`, category: "Travel", amount, submitted_by_id: 40 + i, created_at: daysAgo(40 + i) })
    );
    const hotels = [210.5, 188.2, 246.9].map((amount, i) =>
      claim({ title: "Hotel stay - client visit", category: "Travel", amount, submitted_by_id: 50 + i, created_at: daysAgo(35 + i) })
    );
    const stay = claim({ title: "Hotel stay - client visit", category: "Travel", amount: 255.27, status: "Pending", submitted_by_id: 60, created_at: daysAgo(1) });
    const r = assessExpenses([stay], [...cabs, ...hotels, stay]).get(stay.id);
    expect(r.reasons.find((x) => x.code === "category-outlier")).toBeUndefined();

    // With just one earlier similar claim at a comparable amount, it is still not an outlier.
    const r1 = assessExpenses([stay], [...cabs, hotels[0], stay]).get(stay.id);
    expect(r1.reasons.find((x) => x.code === "category-outlier")).toBeUndefined();

    const pricey = claim({ title: "Hotel stay - client visit", category: "Travel", amount: 1890, status: "Pending", submitted_by_id: 61, created_at: daysAgo(1) });
    const r2 = assessExpenses([pricey], [...cabs, ...hotels, pricey]).get(pricey.id);
    expect(r2.reasons.find((x) => x.code === "category-outlier").detail).toContain('"Hotel stay - client visit" claims');
  });

  it("flags a round, high meal claim as medium risk", () => {
    const dinner = claim({ title: "Team offsite dinner", amount: 500, status: "Pending", submitted_by_id: 5, created_at: daysAgo(4) });
    const r = assessExpenses([dinner], [...baseline(), dinner]).get(dinner.id);
    expect(r.reasons.map((x) => x.code)).toEqual(["category-outlier", "round-amount"]);
    expect(r.level).toBe("medium");
  });

  it("flags a burst of claims from one person", () => {
    const burst = [1, 2, 3].map((h) =>
      claim({ title: `Taxi ${h}`, category: "Travel", amount: 20 + h * 7.3, status: "Pending", submitted_by_id: 8, created_at: new Date(NOW - h * 3600000).toISOString() })
    );
    const r = assessExpenses(burst, [...baseline(), ...burst]);
    for (const b of burst) expect(r.get(b.id).reasons.map((x) => x.code)).toContain("burst");
  });

  it("caps the score at 100 and orders reasons by weight", () => {
    const history = baseline();
    const orig = claim({ title: "Laptop 5000", category: "Travel", amount: 5000, status: "Approved", submitted_by_id: 3, created_at: daysAgo(2) });
    const copy = claim({ title: "Laptop 5000", category: "Travel", amount: 5000, status: "Pending", submitted_by_id: 3, created_at: daysAgo(1) });
    const r = assessExpenses([copy], [...history, orig, copy]).get(copy.id);
    expect(r.score).toBe(100);
    const weights = r.reasons.map((x) => x.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it("needs enough history before judging a category", () => {
    const lone = claim({ title: "Monitor", category: "Equipment", amount: 899, status: "Pending" });
    const r = assessExpenses([lone], [lone]).get(lone.id);
    expect(r.reasons.find((x) => x.code === "category-outlier")).toBeUndefined();
  });
});
