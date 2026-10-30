/**
 * model_worker.js — Proactive OCR/AI Model Preloading, Warm-up & Background Inference Engine
 *
 * Runs inside the persistent offscreen document (ws/offscreen.html).
 * Automatically initializes and warms up ONNX Runtime Web and the 3 neural models
 * (type.onnx, grid.onnx, motorcycles_b1.onnx) upon browser startup, eliminating cold-start
 * latency for the first CAPTCHA-solving request.
 */

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

let warmupPromise = null;
let retryCount = 0;
let retryTimer = null;

const state = {
  status: 'uninitialized', // 'uninitialized' | 'loading' | 'ready' | 'error'
  models: {
    type: false,
    grid: false,
    moto: false
  },
  startTime: 0,
  readyTime: 0,
  durationMs: 0,
  error: null,
  inferences: 0
};

/**
 * Broadcast current model status to background service worker for storage and state tracking.
 */
function syncStateToBackground() {
  try {
    chrome.runtime.sendMessage({
      type: 'model_state_update',
      state: { ...state }
    }, () => {
      void chrome.runtime.lastError;
    });
  } catch {}
}

/**
 * Returns a copy of the current engine status.
 */
export function getModelStatus() {
  return { ...state };
}

/**
 * Generates a minimal 100x100 JPEG base64 data image for warm-up inferences.
 */
async function generateDummyJpegBase64() {
  const cv = new OffscreenCanvas(100, 100);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#3a86ff';
  ctx.fillRect(0, 0, 100, 100);
  const blob = await cv.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Performs proactive preloading and warm-up of all three ONNX models.
 * Thread-safe and idempotent: multiple concurrent calls return the same in-flight Promise.
 */
export async function warmupModels() {
  if (state.status === 'ready') {
    return state;
  }
  if (state.status === 'loading' && warmupPromise) {
    return warmupPromise;
  }

  state.status = 'loading';
  state.error = null;
  state.startTime = Date.now();
  syncStateToBackground();

  warmupPromise = (async () => {
    try {
      console.log('[MaiRec Model Worker] Starting background model warm-up...');
      const dummyB64 = await generateDummyJpegBase64();

      // Dynamically import the core recognition module (loads ONNX Runtime Web & WebAssembly SIMD)
      const aiModUrl = chrome.runtime.getURL('captcha/recaptcha_ai.js');
      const { recognizeRecaptcha } = await import(aiModUrl);

      // 1. Warm-up Type Model (type.onnx: 3x3 challenge & single dynamic tiles)
      const tType0 = performance.now();
      await recognizeRecaptcha({
        task: 'Select all images with cars',
        image_data: [dummyB64, dummyB64, dummyB64, dummyB64, dummyB64, dummyB64, dummyB64, dummyB64, dummyB64],
        grid: '33'
      });
      state.models.type = true;
      const typeTime = Math.round(performance.now() - tType0);
      console.log(`[MaiRec Model Worker] Type model warmed up in ${typeTime}ms`);

      // 2. Warm-up Grid Model (grid.onnx: 4x4 scenes + grid.meta.json)
      const tGrid0 = performance.now();
      await recognizeRecaptcha({
        task: 'Select all squares with crosswalks',
        image_data: [dummyB64],
        grid: '4x4'
      });
      state.models.grid = true;
      const gridTime = Math.round(performance.now() - tGrid0);
      console.log(`[MaiRec Model Worker] Grid model warmed up in ${gridTime}ms`);

      // 3. Warm-up Motorcycles Model (motorcycles_b1.onnx: 4x4 motorcycle scenes + motorcycles_b1.meta.json)
      const tMoto0 = performance.now();
      await recognizeRecaptcha({
        task: 'Select all squares with motorcycles',
        image_data: [dummyB64],
        grid: '4x4'
      });
      state.models.moto = true;
      const motoTime = Math.round(performance.now() - tMoto0);
      console.log(`[MaiRec Model Worker] Motorcycles model warmed up in ${motoTime}ms`);

      state.status = 'ready';
      state.readyTime = Date.now();
      state.durationMs = state.readyTime - state.startTime;
      retryCount = 0;
      syncStateToBackground();

      console.log(`[MaiRec Model Worker] All models proactively warmed up in ${state.durationMs}ms. Ready for inference.`);
      return state;
    } catch (err) {
      console.error('[MaiRec Model Worker] Model warm-up error:', err);
      state.status = 'error';
      state.error = err.message || String(err);
      syncStateToBackground();

      // Retry mechanism with exponential backoff
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        console.warn(`[MaiRec Model Worker] Scheduling warm-up retry ${retryCount}/${MAX_RETRIES} in ${delay}ms`);
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          warmupPromise = null;
          warmupModels();
        }, delay);
      }
      throw err;
    } finally {
      warmupPromise = null;
    }
  })();

  return warmupPromise;
}

/**
 * Handles incoming recognition requests using the warmed-up models.
 */
export async function handleInference(payload) {
  // If warm-up is in progress, await its completion
  if (state.status === 'loading' && warmupPromise) {
    try {
      await warmupPromise;
    } catch {}
  }

  const aiModUrl = chrome.runtime.getURL('captcha/recaptcha_ai.js');
  const { recognizeRecaptcha } = await import(aiModUrl);
  const result = await recognizeRecaptcha(payload);
  state.inferences++;
  return result;
}

// ---- Chrome Message Listener ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;

  if (msg.type === 'model_warmup') {
    warmupModels()
      .then(res => sendResponse({ ok: true, state: res }))
      .catch(err => sendResponse({ ok: false, error: err.message, state }));
    return true; // asynchronous response
  }

  if (msg.type === 'model_status') {
    sendResponse({ ok: true, state: getModelStatus() });
    return false;
  }

  if (msg.type === 'model_recognize') {
    handleInference(msg.payload)
      .then(res => {
        if (res.error) {
          sendResponse({ ok: false, error: res.error });
        } else {
          sendResponse({ ok: true, data: res.data });
        }
      })
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // asynchronous response
  }

  return false;
});

// Auto-trigger warm-up asynchronously upon offscreen document initialization
setTimeout(() => {
  warmupModels().catch(() => {});
}, 50);
