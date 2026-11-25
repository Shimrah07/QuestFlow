import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// js-clipper (used by the OCR line splitter) ships Latin-1 encoded source, which the bundler
// rejects as invalid UTF-8. Decode that one file explicitly instead of patching node_modules.
const latin1JsClipper = {
  name: 'latin1-js-clipper',
  load(id) {
    const file = id.split('?')[0]
    if (file.replaceAll('\\', '/').endsWith('/js-clipper/clipper.js')) {
      return readFileSync(file, 'latin1')
    }
  },
}

const OCR_DEPS = ['onnxruntime', '@gutenye', '@techstark/opencv-js', 'js-clipper', 'tiny-invariant']

export default defineConfig({
  plugins: [
    latin1JsClipper,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      // In-browser OCR: use ONNX Runtime's CPU/wasm-only build. The default entry also ships the
      // WebGPU runtime, which downloads a ~29 MB wasm instead of ~15 MB.
      { find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' },
      // PaddleOCR PP-OCRv4 model files. The package only exports its Node entry, so the
      // .onnx assets are reached by path and emitted by Vite as hashed, lazily fetched files.
      {
        find: '@ocr-models',
        replacement: fileURLToPath(new URL('./node_modules/@gutenye/ocr-models/assets', import.meta.url)),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
    rolldownOptions: {
      plugins: [latin1JsClipper],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // OCR dependencies (ONNX Runtime, OpenCV.js for line splitting, the PaddleOCR wrapper)
            // are left to the scanner's dynamic import() so they form a lazy chunk. Naming them
            // here would let shared helpers land in that chunk and force a preload on every page.
            if (OCR_DEPS.some((dep) => id.includes(dep))) {
              return undefined;
            }
            if (id.includes('@phosphor-icons')) {
              return 'icons-vendor';
            }
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
})
