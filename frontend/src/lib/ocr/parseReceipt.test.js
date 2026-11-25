import { describe, it, expect } from "vitest";
import { parseReceipt, extractAmounts, extractDate, guessCategory, normalizeText } from "./parseReceipt";

// Builds OCR-like rows: one per visual line, stacked top to bottom. `h` is the text height in px.
const rows = (lines) => {
  let y = 10;
  return lines.map((l) => {
    const [text, h = 20, mean = 0.95] = Array.isArray(l) ? l : [l];
    const box = [[10, y], [300, y], [300, y + h], [10, y + h]];
    y += h + 12;
    return { text, mean, box };
  });
};

describe("extractAmounts", () => {
  it("reads common money formats", () => {
    expect(extractAmounts("TOTAL $45.20").map((a) => a.value)).toEqual([45.2]);
    expect(extractAmounts("Grand Total 1,234.56").map((a) => a.value)).toEqual([1234.56]);
    expect(extractAmounts("Totale 1.234,56").map((a) => a.value)).toEqual([1234.56]);
    expect(extractAmounts("Rs 450").map((a) => a.value)).toEqual([450]);
  });

  it("ignores dates, times, percentages and bare integers", () => {
    expect(extractAmounts("12.11.2026 10:45")).toEqual([]);
    expect(extractAmounts("GST 18%")).toEqual([]);
    expect(extractAmounts("Table 12 Guests 4")).toEqual([]);
  });
});

describe("extractDate", () => {
  it("parses ISO, written and numeric dates", () => {
    expect(extractDate("Date: 2026-11-12")).toEqual({ iso: "2026-11-12", ambiguous: false });
    expect(extractDate("12 Nov 2026 19:04")).toEqual({ iso: "2026-11-12", ambiguous: false });
    expect(extractDate("Nov 12, 2026")).toEqual({ iso: "2026-11-12", ambiguous: false });
    expect(extractDate("25/11/2026")).toEqual({ iso: "2026-11-25", ambiguous: false });
  });

  it("flags day/month ambiguity and respects the locale hint", () => {
    expect(extractDate("03/04/2026")).toEqual({ iso: "2026-04-03", ambiguous: true });
    expect(extractDate("03/04/2026", { preferMonthFirst: true })).toEqual({ iso: "2026-03-04", ambiguous: true });
  });

  it("rejects impossible dates", () => {
    expect(extractDate("31/02/2026")).toBeNull();
  });
});

describe("guessCategory", () => {
  it("weights the merchant name above body text", () => {
    expect(guessCategory("cappuccino 4.50", "Blue Tokai Coffee")).toMatchObject({ value: "Meals", confidence: "high" });
    expect(guessCategory("Trip fare Airport drop", "Uber")).toMatchObject({ value: "Travel" });
    expect(guessCategory("Annual subscription renewal", "Figma Inc")).toMatchObject({ value: "Software" });
    expect(guessCategory("27-inch monitor", "Croma")).toMatchObject({ value: "Equipment" });
  });

  it("still matches when OCR merges words", () => {
    expect(guessCategory("", "Blue Tokaicoffee")).toMatchObject({ value: "Meals" });
  });

  it("does not match short keywords inside other words", () => {
    // "bar" inside "Barcode", "tea" inside "steak"... only whole words count for short keywords
    expect(guessCategory("Barcode 123 steak", "Shop")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(guessCategory("misc item 3.00", "Shop")).toBeNull();
  });
});

describe("parseReceipt", () => {
  it("reads a typical cafe receipt", () => {
    const r = parseReceipt(
      rows([
        ["THIRD WAVE COFFEE", 34],
        "12, MG Road, Bengaluru",
        "Tel: 080 4567 8910",
        "Date: 12/11/2026 Time: 10:42",
        "Cappuccino x2 ₹ 380.00",
        "Croissant ₹ 160.00",
        "Subtotal ₹ 540.00",
        "CGST 2.5% ₹ 13.50",
        "SGST 2.5% ₹ 13.50",
        "TOTAL ₹ 567.00",
        "Cash ₹ 600.00",
        "Change ₹ 33.00",
      ])
    );
    expect(r.merchant).toMatchObject({ value: "Third Wave Coffee", confidence: "high" });
    expect(r.total).toMatchObject({ value: 567, confidence: "high" });
    expect(r.date.value).toBe("2026-11-12");
    expect(r.currency.value).toBe("INR");
    expect(r.category.value).toBe("Meals");
    expect(r.rows[r.totalRowIndex].text).toContain("TOTAL");
  });

  it("prefers 'Grand Total' over a plain 'Total' and finds an amount on the next row", () => {
    const r = parseReceipt(
      rows([
        ["Hotel Sunrise Inn", 30],
        "Room 2 nights 180.00",
        "Total 180.00",
        "Service charge 18.00",
        "Grand Total",
        "$198.00",
      ])
    );
    expect(r.total.value).toBe(198);
    expect(r.category.value).toBe("Travel");
    expect(r.currency.value).toBe("USD");
  });

  it("on a tilted photo, takes the amount beside TOTAL rather than the row below", () => {
    // The amount box sits 6px higher than "TOTAL" (rotation), so it sorts before it.
    const lines = [
      { text: "Corner Bakery", mean: 0.97, box: [[40, 10], [300, 10], [300, 40], [40, 40]] },
      { text: "TOTAL", mean: 0.98, box: [[40, 106], [110, 106], [110, 126], [40, 126]] },
      { text: "Rs 934.50", mean: 0.96, box: [[220, 100], [320, 100], [320, 120], [220, 120]] },
      { text: "Paid by UPI 934.50", mean: 0.95, box: [[40, 140], [320, 140], [320, 160], [40, 160]] },
    ];
    const r = parseReceipt(lines);
    expect(r.total.value).toBe(934.5);
    expect(r.totalRowIndex).toBe(2); // the "Rs 934.50" box, not the UPI row
  });

  it("corrects for page skew using real rotated boxes from a tilted photo", () => {
    // Coordinates captured from PaddleOCR on a receipt photographed at about -3.5 degrees.
    const tilted = [
      { text: "Blue Tokai Coffee", mean: 0.96, box: [[202, 340], [560, 327], [561, 392], [203, 405]] },
      { text: "890.00", mean: 1, box: [[837, 867], [948, 862], [949, 891], [838, 896]] },
      { text: "Subtotal", mean: 1, box: [[186, 903], [329, 894], [331, 922], [187, 932]] },
      { text: "22.25", mean: 1, box: [[860, 959], [952, 956], [953, 986], [861, 989]] },
      { text: "SGST 2.5%", mean: 0.96, box: [[192, 996], [355, 988], [356, 1015], [193, 1023]] },
      { text: "Rs 934.50", mean: 1, box: [[756, 1016], [954, 1004], [955, 1035], [757, 1047]] },
      { text: "TOTAL", mean: 1, box: [[193, 1045], [304, 1040], [305, 1070], [194, 1075]] },
      { text: "934.50", mean: 1, box: [[848, 1062], [958, 1058], [959, 1087], [849, 1091]] },
      { text: "Paid by UPI", mean: 1, box: [[197, 1095], [396, 1087], [397, 1119], [198, 1128]] },
    ];
    const r = parseReceipt(tilted);
    expect(r.total.value).toBe(934.5);
    expect(tilted[r.totalRowIndex].text).toBe("Rs 934.50");
  });

  it("falls back to the largest amount with low confidence when no total keyword exists", () => {
    const r = parseReceipt(rows([["Corner Store", 28], "Pens 3.20", "Notebook 7.80", "Paid 11.00"]));
    expect(r.total).toMatchObject({ value: 11, confidence: "low" });
  });

  it("never treats tax, change or subtotal rows as the total", () => {
    const r = parseReceipt(rows([["Shop", 28], "Subtotal 90.00", "Tax total 9.00", "Change 1.00", "Amount due 99.00"]));
    expect(r.total.value).toBe(99);
  });

  it("normalizes full-width OCR characters", () => {
    expect(normalizeText("ＴＯＴＡＬ　１２．５０")).toBe("TOTAL 12.50");
    const r = parseReceipt(rows([["Cafe Mocha", 30], "ＴＯＴＡＬ　１２．５０"]));
    expect(r.total.value).toBe(12.5);
  });

  it("returns nulls for an empty scan", () => {
    const r = parseReceipt([]);
    expect(r).toMatchObject({ merchant: null, total: null, date: null, category: null });
  });
});
