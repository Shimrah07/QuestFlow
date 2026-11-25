/**
 * In-browser OCR engine: PaddleOCR PP-OCRv4 (the model family RapidOCR runs) on ONNX Runtime Web.
 *
 * - Nothing here is loaded until the receipt scanner asks for it (this module is imported lazily).
 * - Model files (~16 MB) and the wasm runtime are emitted by Vite as hashed static assets, fetched
 *   once with progress, and kept in Cache Storage so later visits start instantly.
 * - Inference runs in ONNX Runtime's proxy worker, so the page stays responsive while it reads.
 * - No image ever leaves the browser.
 */
import * as ort from "onnxruntime-web";
import Ocr from "@gutenye/ocr-browser";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import detectionUrl from "@ocr-models/ch_PP-OCRv4_det_infer.onnx?url";
import recognitionUrl from "@ocr-models/ch_PP-OCRv4_rec_infer.onnx?url";
import dictionaryUrl from "@ocr-models/ppocr_keys_v1.txt?url";

const CACHE_NAME = "questflow-ocr-v1";
const MAX_SIDE = 1600; // receipts are tall; 1600px keeps small print legible and inference fast

ort.env.wasm.wasmPaths = { wasm: ortWasmUrl };
ort.env.wasm.proxy = true;
ort.env.wasm.numThreads = 1; // multi-threading needs cross-origin isolation headers; not worth it here

/** Approximate download sizes, used for progress when a server omits Content-Length. */
const ASSETS = [
  { url: detectionUrl, size: 4_745_517 },
  { url: recognitionUrl, size: 10_822_323 },
  { url: dictionaryUrl, size: 26_249 },
];

async function openCache() {
  try {
    return "caches" in window ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null; // private windows or blocked storage: fall back to plain network fetches
  }
}

/** Fetches a file as a blob URL, reporting bytes as they arrive; serves from Cache Storage when present. */
async function fetchWithProgress(url, cache, onBytes) {
  const cached = cache && (await cache.match(url));
  if (cached) {
    const blob = await cached.blob();
    onBytes(blob.size, true);
    return URL.createObjectURL(blob);
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Couldn't download ${url.split("/").pop()} (${res.status}).`);
  const reader = res.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.byteLength, false);
  }
  const blob = new Blob(chunks);
  try {
    await cache?.put(url, new Response(blob));
  } catch {
    // quota exceeded or storage disabled: still usable for this session
  }
  return URL.createObjectURL(blob);
}

let enginePromise = null;

/**
 * Loads the engine once per page session. `onProgress({ phase, loaded, total, fromCache })`
 * reports download progress and the final model-initialisation phase.
 */
export function loadOcrEngine(onProgress = () => {}) {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const cache = await openCache();
    const total = ASSETS.reduce((s, a) => s + a.size, 0);
    let loaded = 0;
    let allCached = true;
    const report = (bytes, fromCache) => {
      loaded += bytes;
      allCached = allCached && fromCache;
      onProgress({ phase: "download", loaded: Math.min(loaded, total), total, fromCache: allCached });
    };
    const [det, rec, dict] = await Promise.all(ASSETS.map((a) => fetchWithProgress(a.url, cache, report)));
    onProgress({ phase: "init", loaded: total, total, fromCache: allCached });
    const ocr = await Ocr.create({
      models: { detectionPath: det, recognitionPath: rec, dictionaryPath: dict },
    });
    return ocr;
  })().catch((err) => {
    enginePromise = null; // allow a retry after a failed download
    throw err;
  });
  return enginePromise;
}

/** Decodes an image file and scales it so the longest side is at most MAX_SIDE. */
async function fileToImageData(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff"; // transparent PNGs read better on white
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return { imageData: ctx.getImageData(0, 0, width, height), width, height };
}

/**
 * Reads a receipt image. Returns rows in the coordinate space of the returned width/height,
 * so callers can draw boxes over a preview of the same image.
 */
export async function recognizeReceipt(file, onProgress) {
  const ocr = await loadOcrEngine(onProgress);
  const { imageData, width, height } = await fileToImageData(file);
  onProgress?.({ phase: "read" });
  const started = performance.now();
  const result = await ocr.detect({ data: imageData.data, width, height });
  // Boxes come back in the detector's resized space (dimensions rounded to multiples of 32).
  const sx = width / (result.resizedImageWidth || width);
  const sy = height / (result.resizedImageHeight || height);
  const rows = (result.texts || []).map((t) => ({
    text: t.text,
    mean: t.mean,
    box: (t.box || []).map(([x, y]) => [x * sx, y * sy]),
  }));
  return { rows, width, height, ms: Math.round(performance.now() - started) };
}
