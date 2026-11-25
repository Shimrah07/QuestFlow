import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Scan,
  Camera,
  ImageSquare,
  ArrowCounterClockwise,
  CheckCircle,
  WarningCircle,
  Sparkle,
  LockSimple,
} from "@phosphor-icons/react";
import Button from "../ui/Button";
import { Badge, formatMoney, formatDate } from "../ui/primitives";
import { parseReceipt, CATEGORIES } from "../../lib/ocr/parseReceipt";

const CONFIDENCE = {
  high: { tone: "success", label: "Confident" },
  medium: { tone: "accent", label: "Check" },
  low: { tone: "danger", label: "Unsure" },
};

const mb = (bytes) => (bytes / 1_048_576).toFixed(1);

/** Draws OCR row boxes over the receipt preview. The total row is highlighted, the merchant outlined. */
const BoxOverlay = ({ result }) => {
  const { rows, width, height, parsed } = result;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {rows.map((r, i) => {
        if (!r.box?.length) return null;
        const pts = r.box.map(([x, y]) => `${x},${y}`).join(" ");
        const isTotal = i === parsed.totalRowIndex;
        const isMerchant = i === parsed.merchantRowIndex;
        return (
          <polygon
            key={i}
            points={pts}
            fill={isTotal ? "color-mix(in oklab, var(--accent) 28%, transparent)" : "none"}
            stroke={isTotal ? "var(--accent)" : isMerchant ? "var(--info)" : "color-mix(in oklab, var(--accent) 55%, transparent)"}
            strokeWidth={isTotal || isMerchant ? 2 : 1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
};

const FieldRow = ({ label, value, field, testId }) => {
  const c = field ? CONFIDENCE[field.confidence] : null;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" data-testid={testId}>
      <div className="min-w-0">
        <p className="text-xs text-fg-subtle">{label}</p>
        <p className={`truncate text-sm font-medium ${field ? "text-fg" : "text-fg-subtle"}`} title={field?.source}>
          {field ? value : "Not found"}
        </p>
      </div>
      {c && (
        <Badge tone={c.tone} title={`Found from ${field.source}`}>
          {c.label}
        </Badge>
      )}
    </div>
  );
};

/**
 * Receipt scanner for the New claim dialog. Reads the image on this device with
 * PaddleOCR (ONNX Runtime Web), shows what it found with confidence, and hands the
 * fields to the form only when the user chooses "Use these details".
 */
const ReceiptScanner = ({ onApply, disabled }) => {
  const reduce = useReducedMotion();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [state, setState] = useState({ status: "idle" }); // idle | loading | reading | done | applied | error
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const scan = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ status: "error", message: "That file isn't an image. Use a JPG, PNG or WebP photo of the receipt." });
      return;
    }
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setState({ status: "loading", loaded: 0, total: 0 });
    try {
      const { recognizeReceipt } = await import("../../lib/ocr/engine");
      const result = await recognizeReceipt(file, (p) => {
        if (p.phase === "download") setState({ status: "loading", ...p });
        if (p.phase === "init") setState({ status: "loading", ...p, init: true });
        if (p.phase === "read") setState({ status: "reading" });
      });
      const parsed = parseReceipt(result.rows);
      if (!result.rows.length) {
        setState({ status: "error", message: "No text found. Try a sharper, well-lit photo with the whole receipt in frame." });
        return;
      }
      setState({ status: "done", result: { ...result, parsed } });
    } catch (err) {
      console.error("Receipt scan failed", err);
      setState({ status: "error", message: "The scanner couldn't start. Check your connection and try again, or fill the form by hand." });
    }
  };

  const onPick = (e) => {
    scan(e.target.files?.[0]);
    e.target.value = "";
  };

  const apply = () => {
    const { parsed } = state.result;
    onApply({
      title: parsed.merchant?.value,
      amount: parsed.total ? parsed.total.value.toFixed(2) : undefined,
      category: CATEGORIES.includes(parsed.category?.value) ? parsed.category.value : undefined,
    });
    setState({ status: "applied", merchant: parsed.merchant?.value });
  };

  const reset = () => {
    setPreview(null);
    setState({ status: "idle" });
  };

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} data-testid="receipt-file-input" tabIndex={-1} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} tabIndex={-1} />
    </>
  );

  /* ---- applied: compact confirmation ---- */
  if (state.status === "applied") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-success/25 bg-success/[0.07] px-3.5 py-2.5" data-testid="receipt-applied">
        <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-fg">
          <CheckCircle size={17} weight="fill" className="shrink-0 text-success" />
          <span className="truncate">Filled from {state.merchant ? `the ${state.merchant} receipt` : "your receipt"}. Review below.</span>
        </p>
        <button type="button" onClick={reset} className="shrink-0 text-[0.8125rem] font-medium text-fg-muted hover:text-fg">
          Scan another
        </button>
        {inputs}
      </div>
    );
  }

  /* ---- idle: drop zone ---- */
  if (state.status === "idle" || state.status === "error") {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          scan(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-[14px] border border-dashed p-4 transition-colors duration-150 ${
          dragging ? "border-accent bg-accent/[0.07]" : "border-line-strong bg-bg-sunken/60"
        }`}
        data-testid="receipt-scanner"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-accent/30 bg-accent/12 text-accent-text">
            <Scan size={20} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
              Scan a receipt
              <Sparkle size={13} weight="fill" className="text-accent-text" />
            </p>
            <p className="mt-0.5 text-xs leading-snug text-fg-muted">
              We'll read the merchant, total and category for you. Drop an image here or pick one.
            </p>
          </div>
        </div>
        {state.status === "error" && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger/10 px-3 py-2 text-xs text-danger">
            <WarningCircle size={15} weight="fill" className="mt-px shrink-0" />
            {state.message}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" icon={ImageSquare} onClick={() => fileRef.current?.click()} disabled={disabled} data-testid="receipt-choose">
            Choose image
          </Button>
          <Button size="sm" variant="ghost" icon={Camera} onClick={() => cameraRef.current?.click()} disabled={disabled} className="sm:hidden">
            Take photo
          </Button>
          <span className="ml-auto inline-flex items-center gap-1 text-[0.6875rem] text-fg-subtle">
            <LockSimple size={12} weight="bold" />
            Stays on this device
          </span>
        </div>
        {inputs}
      </div>
    );
  }

  /* ---- loading / reading / done ---- */
  const busy = state.status === "loading" || state.status === "reading";
  const pct = state.total ? Math.round((state.loaded / state.total) * 100) : 0;
  const parsed = state.result?.parsed;

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-bg-sunken/60" data-testid="receipt-scanner" aria-busy={busy}>
      <div className="grid gap-0 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Preview */}
        <div className="relative flex max-h-72 items-center justify-center overflow-hidden border-b border-line bg-black/20 sm:max-h-none sm:border-b-0 sm:border-r">
          {preview && (
            <div className="relative h-full max-h-72 w-full sm:max-h-80">
              <img src={preview} alt="Receipt preview" className="h-full max-h-72 w-full object-contain sm:max-h-80" />
              {state.status === "done" && <BoxOverlay result={state.result} />}
            </div>
          )}
          {busy && !reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent/25 to-transparent"
              initial={{ top: "-15%" }}
              animate={{ top: ["-15%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>

        {/* Status / results */}
        <div className="flex min-w-0 flex-col p-4">
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col justify-center gap-3" role="status" aria-live="polite">
                <p className="text-sm font-semibold text-fg">
                  {state.status === "reading" ? "Reading your receipt" : state.init ? "Starting the reader" : state.fromCache ? "Loading the reader" : "Downloading the reader"}
                </p>
                {state.status === "loading" && !state.init && state.total > 0 && (
                  <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="num text-xs text-fg-subtle">
                      {mb(state.loaded)} of {mb(state.total)} MB{state.fromCache ? "" : ". Only needed once; it's cached after this."}
                    </p>
                  </>
                )}
                {(state.status === "reading" || state.init) && (
                  <p className="text-xs text-fg-subtle">Finding text lines and reading them on this device.</p>
                )}
              </motion.div>
            ) : (
              <motion.div key="done" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col" data-testid="receipt-result">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-fg">What we found</p>
                  <span className="num text-[0.6875rem] text-fg-subtle">
                    {state.result.rows.length} lines · {(state.result.ms / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="mt-1 divide-y divide-line">
                  <FieldRow label="Merchant (title)" value={parsed.merchant?.value} field={parsed.merchant} testId="receipt-merchant" />
                  <FieldRow
                    label="Total (amount)"
                    value={parsed.total && (parsed.currency && parsed.currency.value !== "USD" ? `${parsed.currency.symbol}${parsed.total.value.toFixed(2)}` : formatMoney(parsed.total.value))}
                    field={parsed.total}
                    testId="receipt-total"
                  />
                  <FieldRow label="Category" value={parsed.category?.value} field={parsed.category} testId="receipt-category" />
                  <FieldRow label="Receipt date" value={parsed.date && formatDate(parsed.date.value, { month: "short", day: "numeric", year: "numeric" })} field={parsed.date} testId="receipt-date" />
                </div>
                {parsed.currency && parsed.currency.value !== "USD" && (
                  <p className="mt-1 text-[0.6875rem] leading-snug text-fg-subtle">
                    Receipt is in {parsed.currency.value}. Claims are recorded as entered, without conversion.
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Button size="sm" variant="primary" icon={CheckCircle} onClick={apply} disabled={!parsed.total && !parsed.merchant} data-testid="receipt-apply">
                    Use these details
                  </Button>
                  <Button size="sm" variant="ghost" icon={ArrowCounterClockwise} onClick={reset}>
                    Scan another
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {inputs}
    </div>
  );
};

export default ReceiptScanner;
