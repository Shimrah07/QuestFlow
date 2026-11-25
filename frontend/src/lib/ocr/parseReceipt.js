/**
 * Turns OCR output (one entry per visual row) into expense fields.
 *
 * Input rows look like { text, mean, box } where `mean` is the recognizer's confidence (0..1)
 * and `box` is four [x, y] points. The function is pure, so it is unit tested and runs
 * identically in the browser and in Vitest.
 *
 * Output: { merchant, total, date, currency, category, totalRowIndex, merchantRowIndex, rows }
 * where each field is { value, confidence: "high" | "medium" | "low", source } or null.
 */

export const CATEGORIES = ["Software", "Equipment", "Travel", "Meals"];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Ordered by how strongly the keyword marks the final payable amount.
const TOTAL_KEYWORDS = [
  { re: /grand\s*total/i, rank: 6 },
  { re: /(total|amount|balance)\s*(due|payable)/i, rank: 5 },
  { re: /amount\s*paid|total\s*paid/i, rank: 5 },
  { re: /net\s*(total|amount)|total\s*amount|bill\s*amount|invoice\s*total/i, rank: 4 },
  { re: /\btotal\b/i, rank: 3 },
  { re: /\b(amount|amt)\b/i, rank: 1 },
];

// Rows that mention "total" but are not the payable total, or that carry other money figures.
const NOT_TOTAL =
  /sub\s*-?\s*total|total\s*(tax|vat|gst|items?|qty|quantity|savings?|discount|saved)|\b(tax|vat|gst|cgst|sgst|igst|change|cash|tender(ed)?|tip|gratuity|rounding|round\s*off|you\s*saved|discount|card\s*no|qty|quantity)\b/i;

const NOT_MERCHANT =
  /receipt|invoice|tax|gst|vat|tel\b|phone|ph\.|mobile|www\.|http|@|address|street|\broad\b|\bst\.|avenue|date|time|bill\b|order|table|cashier|server|welcome|thank|customer|copy|no\.|#|gstin|cin\b|fssai/i;

const CATEGORY_RULES = [
  {
    category: "Travel",
    words: ["uber", "ola", "lyft", "taxi", "cab", "airline", "airways", "flight", "boarding", "airport", "railway", "irctc", "train", "metro", "bus", "hotel", "inn", "resort", "lodging", "stay", "parking", "toll", "fuel", "petrol", "diesel", "rapido", "makemytrip", "booking.com", "airbnb"],
  },
  {
    category: "Meals",
    words: ["restaurant", "cafe", "café", "coffee", "starbucks", "bistro", "kitchen", "pizza", "burger", "food", "dine", "dining", "bar", "grill", "bakery", "swiggy", "zomato", "mcdonald", "kfc", "domino", "subway", "chai", "tea", "lunch", "dinner", "breakfast", "meal", "eatery", "diner", "biryani"],
  },
  {
    category: "Software",
    words: ["subscription", "license", "licence", "saas", "software", "cloud", "github", "gitlab", "aws", "amazon web services", "azure", "google workspace", "figma", "notion", "slack", "jetbrains", "adobe", "microsoft 365", "openai", "vercel", "netlify", "heroku", "digitalocean", "domain", "hosting", "api", "plan"],
  },
  {
    category: "Equipment",
    words: ["electronics", "croma", "reliance digital", "best buy", "apple store", "laptop", "monitor", "keyboard", "mouse", "headphone", "headset", "webcam", "printer", "cable", "adapter", "charger", "dock", "ssd", "hard drive", "router", "chair", "desk", "hardware", "stationery", "office supplies"],
  },
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", re: /₹|\brs\.?(?=\s*\d)|\binr\b/i },
  { code: "EUR", symbol: "€", re: /€|\beur\b/i },
  { code: "GBP", symbol: "£", re: /£|\bgbp\b/i },
  { code: "USD", symbol: "$", re: /\$|\busd\b/i },
];

/* ---------------- helpers ---------------- */

/** NFKC folds full-width digits and punctuation (common in PaddleOCR output) to ASCII. */
export const normalizeText = (s = "") => s.normalize("NFKC").replace(/\s+/g, " ").trim();

const boxTop = (box) => (box ? Math.min(...box.map((p) => p[1])) : 0);
const boxCenterY = (box) => (box ? box.reduce((s, p) => s + p[1], 0) / box.length : 0);
const boxCenterX = (box) => (box ? box.reduce((s, p) => s + p[0], 0) / box.length : 0);
const boxLeft = (box) => (box ? Math.min(...box.map((p) => p[0])) : 0);

/**
 * Receipt photos are rarely straight. The detector returns rotated boxes, so the slope of each
 * box's top edge is the text angle; the median across rows is the page skew. Rows are then
 * compared by their de-skewed vertical position, so a price at the far right still lines up
 * with its label on the left.
 */
const estimateSkew = (boxes) => {
  const slopes = boxes
    .filter((b) => b && b.length === 4 && Math.abs(b[1][0] - b[0][0]) > 30)
    .map((b) => (b[1][1] - b[0][1]) / (b[1][0] - b[0][0]))
    .filter((s) => Math.abs(s) < 0.35)
    .sort((a, b) => a - b);
  return slopes.length ? slopes[Math.floor(slopes.length / 2)] : 0;
};
const boxHeight = (box) => (box ? Math.max(...box.map((p) => p[1])) - Math.min(...box.map((p) => p[1])) : 0);

/**
 * Finds money-looking numbers in a string. Handles "1,234.56", "1.234,56", "45.20", "Rs 450".
 * Plain integers are only accepted when a currency marker sits right before them.
 */
export const extractAmounts = (text) => {
  const out = [];
  // The lookbehind/lookahead reject pieces of dates and times (12.11.2026, 10:45) and percentages.
  const re = /([$€£₹]|rs\.?|inr|usd)?\s*(?<![\d/.,:-])(\d{1,3}(?:[,.]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d+)(?![\d%]|[.,/:-]\d)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const marker = m[1];
    const raw = m[2];
    const hasDecimals = /[.,]\d{1,2}$/.test(raw);
    if (!hasDecimals && !marker) continue; // bare integers are usually quantities, codes or phone digits
    let value;
    if (hasDecimals) {
      const dec = raw.slice(-3).match(/[.,]\d{1,2}$/) ? raw.match(/[.,](\d{1,2})$/)[1] : "";
      const whole = raw.slice(0, raw.length - dec.length - 1).replace(/[.,]/g, "");
      value = Number(`${whole}.${dec}`);
    } else {
      value = Number(raw.replace(/[.,]/g, ""));
    }
    if (Number.isFinite(value) && value > 0 && value < 1_000_000) out.push({ value, hasMarker: !!marker });
  }
  return out;
};

const pad = (n) => String(n).padStart(2, "0");
const validDate = (y, mo, d) => {
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
};

/** Returns { iso, ambiguous } for the first date-like token in the text, or null. */
export const extractDate = (text, { preferMonthFirst = false } = {}) => {
  const t = text.toLowerCase();
  let m = t.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) {
    const iso = validDate(+m[1], +m[2], +m[3]);
    if (iso) return { iso, ambiguous: false };
  }
  m = t.match(/\b(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,-]*(\d{2,4})\b/);
  if (m) {
    const iso = validDate(+m[3], MONTHS.indexOf(m[2]) + 1, +m[1]);
    if (iso) return { iso, ambiguous: false };
  }
  m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{2,4})\b/);
  if (m) {
    const iso = validDate(+m[3], MONTHS.indexOf(m[1]) + 1, +m[2]);
    if (iso) return { iso, ambiguous: false };
  }
  m = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12) return (iso => iso && { iso, ambiguous: false })(validDate(y, b, a));
    if (b > 12) return (iso => iso && { iso, ambiguous: false })(validDate(y, a, b));
    const iso = preferMonthFirst ? validDate(y, a, b) : validDate(y, b, a);
    if (iso) return { iso, ambiguous: a !== b };
  }
  return null;
};

const tidyMerchant = (s) => {
  let name = s.replace(/[^\p{L}\p{N}&'.\-\s]/gu, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/^[.\-\s]+|[.\-\s]+$/g, "");
  const letters = name.replace(/[^\p{L}]/gu, "");
  if (letters && letters === letters.toUpperCase()) {
    name = name.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  }
  return name.slice(0, 60);
};

export const guessCategory = (text, merchant = "") => {
  const hay = ` ${text.toLowerCase()} `;
  const head = ` ${merchant.toLowerCase()} `;
  let best = null;
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    let hit = null;
    for (const w of rule.words) {
      // OCR often drops spaces ("Tokaicoffee"), so longer keywords match anywhere;
      // short ones (bar, tea, cab, inn) need word boundaries to avoid false hits.
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = w.length >= 5 ? new RegExp(escaped, "i") : new RegExp(`[^a-z]${escaped}[^a-z]`, "i");
      if (re.test(head)) {
        score += 3;
        hit = hit || w;
      } else if (re.test(hay)) {
        score += 1;
        hit = hit || w;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { category: rule.category, score, keyword: hit };
  }
  if (!best) return null;
  return { value: best.category, confidence: best.score >= 3 ? "high" : "medium", source: `matched "${best.keyword}"` };
};

const conf = (ocrMean, strong) => {
  if (strong && ocrMean >= 0.85) return "high";
  if (strong || ocrMean >= 0.85) return "medium";
  return "low";
};

/* ---------------- main ---------------- */

export const parseReceipt = (rawRows = []) => {
  const skew = estimateSkew(rawRows.map((r) => r.box));
  const rows = rawRows
    .map((r, i) => ({
      ...r,
      i,
      text: normalizeText(r.text),
      mean: r.mean ?? 1,
      top: boxTop(r.box),
      height: boxHeight(r.box),
      cy: boxCenterY(r.box) - skew * boxCenterX(r.box), // de-skewed line position
      left: boxLeft(r.box),
    }))
    .filter((r) => r.text)
    .sort((a, b) => a.cy - b.cy);

  const allText = rows.map((r) => r.text).join("\n");

  // Currency
  const cur = CURRENCIES.find((c) => c.re.test(allText));
  const currency = cur ? { value: cur.code, symbol: cur.symbol, confidence: "high", source: "currency marker" } : null;

  // Total: best keyword rank wins; amount on the same row, else the next row down.
  let total = null;
  let totalRowIndex = null;
  let bestRank = 0;
  rows.forEach((row, idx) => {
    if (NOT_TOTAL.test(row.text)) return;
    const kw = TOTAL_KEYWORDS.find((k) => k.re.test(row.text));
    if (!kw) return;
    let amounts = extractAmounts(row.text);
    let source = row;
    if (!amounts.length) {
      // On tilted photos the amount can be detected as its own box slightly above or below the
      // keyword. Prefer a box on the same visual line to the right; then fall back to the next row.
      const sameLine = rows
        .filter((r) => r !== row && r.left > row.left && Math.abs(r.cy - row.cy) < Math.max(row.height, r.height) * 0.8)
        .filter((r) => !NOT_TOTAL.test(r.text) && extractAmounts(r.text).length)
        .sort((a, b) => Math.abs(a.cy - row.cy) - Math.abs(b.cy - row.cy))[0];
      const next = rows[idx + 1] && !NOT_TOTAL.test(rows[idx + 1].text) ? rows[idx + 1] : null;
      const pick = sameLine || next;
      if (pick) {
        amounts = extractAmounts(pick.text);
        source = pick;
      }
    }
    if (!amounts.length) return;
    const value = Math.max(...amounts.map((a) => a.value));
    if (kw.rank > bestRank || (kw.rank === bestRank && value > total.value)) {
      bestRank = kw.rank;
      total = { value, confidence: conf(source.mean, kw.rank >= 3), source: `"${row.text}"` };
      totalRowIndex = source.i;
    }
  });

  // Fallback: the largest amount that is not change, cash, tax or a phone number.
  if (!total) {
    let best = null;
    for (const row of rows) {
      if (NOT_TOTAL.test(row.text) || /tel|phone|mobile|gstin|card/i.test(row.text)) continue;
      for (const a of extractAmounts(row.text)) {
        if (!best || a.value > best.value) best = { value: a.value, row };
      }
    }
    if (best) {
      total = { value: best.value, confidence: "low", source: "largest amount on the receipt" };
      totalRowIndex = best.row.i;
    }
  }

  // Merchant: the tallest qualifying text in the top third, with a bonus for being first.
  let merchant = null;
  let merchantRowIndex = null;
  const head = rows.slice(0, Math.max(4, Math.ceil(rows.length / 3)));
  const tallest = Math.max(1, ...head.map((r) => r.height));
  head.forEach((row, pos) => {
    const letters = (row.text.match(/\p{L}/gu) || []).length;
    if (letters < 3 || letters / row.text.length < 0.5 || NOT_MERCHANT.test(row.text) || extractAmounts(row.text).length) return;
    const score = row.height / tallest + (pos === 0 ? 0.35 : 0) - pos * 0.05;
    if (!merchant || score > merchant.score) {
      merchant = { score, value: tidyMerchant(row.text), mean: row.mean, i: row.i };
    }
  });
  if (merchant && merchant.value.length >= 2) {
    merchantRowIndex = merchant.i;
    merchant = { value: merchant.value, confidence: conf(merchant.mean, merchant.score > 0.9), source: "largest text at the top" };
  } else {
    merchant = null;
  }

  // Date: first parseable date anywhere on the receipt.
  let date = null;
  for (const row of rows) {
    const d = extractDate(row.text, { preferMonthFirst: currency?.value === "USD" });
    if (d) {
      date = { value: d.iso, confidence: d.ambiguous ? "medium" : conf(row.mean, true), source: `"${row.text}"` };
      break;
    }
  }

  const category = guessCategory(allText, merchant?.value || "");

  return { merchant, total, date, currency, category, totalRowIndex, merchantRowIndex, rows };
};

export default parseReceipt;
