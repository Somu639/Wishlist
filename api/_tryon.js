/**
 * Virtual try-on engines.
 *
 * Two backends, picked automatically:
 *   - fal.ai (FASHN v1.6) when FAL_KEY is set. Paid, fastest, best quality.
 *   - Hugging Face IDM-VTON Space otherwise. Free and keyless, so the demo
 *     works with no account at all, at the cost of a public GPU queue.
 *
 * Groq is never used for image generation; it only writes the text analysis.
 * Every failure resolves rather than throws so the caller can fall back to the
 * browser-side style preview without surfacing an error to the shopper.
 */

const FAL_BASE_URL = 'https://fal.run/';
const DEFAULT_FAL_MODEL = 'fal-ai/fashn/tryon/v1.6';
const DEFAULT_HF_SPACE = 'https://yisol-idm-vton.hf.space';

function tryOnCategory(category) {
  const key = String(category || '').toLowerCase();
  if (/jean|trouser|pant|short|skirt|legging|palazzo/.test(key)) return 'bottoms';
  if (/shirt|top|blazer|jacket|blouse|tee|sweater|kurta$/.test(key)) return 'tops';
  if (/dress|saree|sari|kurti|anarkali|gown|co-ord|coord|jumpsuit|lehenga|suit/.test(key)) return 'one-pieces';
  return 'auto';
}

function ok(imageUrl, provider) {
  return { processing_status: 'completed', image_url: imageUrl, provider };
}

function failed(reason, detail, provider) {
  return { processing_status: 'failed', image_url: null, provider, reason, detail };
}

/** fal reports errors as `detail`, either a string or a list of field errors. */
function upstreamDetail(parsed, raw) {
  const detail = parsed?.detail ?? parsed?.error ?? parsed?.message;
  if (typeof detail === 'string') return detail.slice(0, 300);
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || d?.message || JSON.stringify(d)).join('; ').slice(0, 300);
  }
  return String(raw || '').slice(0, 300);
}

// --- fal.ai -----------------------------------------------------------------

async function runFalTryOn({ apiKey, personDataUrl, garmentUrl, category, signal }) {
  const model = process.env.VTON_MODEL || DEFAULT_FAL_MODEL;

  let response;
  try {
    response = await fetch(`${FAL_BASE_URL}${model}`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_image: personDataUrl,
        garment_image: garmentUrl,
        category: tryOnCategory(category),
        garment_photo_type: 'auto',
        mode: process.env.VTON_MODE || 'balanced',
        num_samples: 1,
        output_format: 'jpeg',
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') return failed('timeout', null, 'fal');
    console.error('[TryOn] fal network error:', err.message);
    return failed('network_error', err.message, 'fal');
  }

  const raw = await response.text();
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const detail = upstreamDetail(parsed, raw);
    console.error('[TryOn] fal HTTP', response.status, detail);
    if (response.status === 401 || response.status === 403) {
      // fal locks the account rather than the key when the balance runs out.
      const outOfCredit = /top_up|locked|balance|insufficient|quota/i.test(detail);
      return failed(outOfCredit ? 'needs_credits' : 'auth_failed', detail, 'fal');
    }
    if (response.status === 429) return failed('rate_limited', detail, 'fal');
    if (response.status === 422) return failed('rejected_input', detail, 'fal');
    return failed(`upstream_${response.status}`, detail, 'fal');
  }

  const image = parsed?.images?.[0]?.url || parsed?.image?.url || null;
  if (!image) return failed('no_image', upstreamDetail(parsed, raw), 'fal');
  return ok(image, 'fal');
}

// --- Hugging Face IDM-VTON Space (free) -------------------------------------

function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return new Blob([Buffer.from(match[2], 'base64')], { type: match[1] });
}

function hfHeaders() {
  return process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
}

/** Gradio needs files uploaded first; the call then references server paths. */
async function hfUpload(space, blob, filename, signal) {
  const form = new FormData();
  form.append('files', blob, filename);
  const res = await fetch(`${space}/upload`, {
    method: 'POST',
    body: form,
    signal,
    headers: hfHeaders(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`upload ${res.status}: ${text.slice(0, 200)}`);
  const paths = JSON.parse(text);
  if (!paths?.[0]) throw new Error('upload returned no path');
  return paths[0];
}

const gradioFile = (path) => ({ path, meta: { _type: 'gradio.FileData' } });

/**
 * The Space writes results to the GPU worker's own /tmp, but `/file=` requests
 * are load-balanced across replicas, so the URL 404s whenever it lands on a
 * replica that never saw the file. Retrying reaches a different replica, and
 * inlining the bytes means the browser never has to hit that lottery at all.
 */
async function inlineGradioImage(url, signal, attempts = 5) {
  const forms = [url, url.replace('/file=', '/file/')];
  let lastError = 'not found';

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(forms[attempt % forms.length], { signal, headers: hfHeaders() });
      const type = (res.headers.get('content-type') || '').split(';')[0];
      if (res.ok && type.startsWith('image/')) {
        const bytes = Buffer.from(await res.arrayBuffer());
        return `data:${type};base64,${bytes.toString('base64')}`;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }

  console.error('[TryOn] could not download the Space result:', lastError);
  return null;
}

/** Reads the Gradio SSE stream and resolves with the completed payload. */
async function hfAwaitResult(space, eventId, signal) {
  const res = await fetch(`${space}/call/tryon/${eventId}`, { signal, headers: hfHeaders() });
  if (!res.ok) throw new Error(`stream ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let split;
    while ((split = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const event = /^event: (.*)$/m.exec(chunk)?.[1];
      const data = /^data: (.*)$/m.exec(chunk)?.[1] || '';

      if (event === 'error') throw new Error(data.slice(0, 200) || 'space error');
      if (event === 'complete') {
        const payload = JSON.parse(data);
        return payload?.[0]?.url || null;
      }
    }
  }
  throw new Error('stream ended before completion');
}

function garmentDescription(product) {
  return [product?.color, product?.material, product?.product_name]
    .filter(Boolean)
    .join(' ')
    .slice(0, 200) || 'the selected garment';
}

async function runHuggingFaceTryOn({ personDataUrl, garmentUrl, product, signal }) {
  const space = process.env.VTON_HF_SPACE || DEFAULT_HF_SPACE;

  try {
    const personBlob = dataUrlToBlob(personDataUrl);
    if (!personBlob) return failed('missing_images', 'could not decode the photo', 'huggingface');

    const garmentRes = await fetch(garmentUrl, { signal });
    if (!garmentRes.ok) {
      return failed('missing_images', `garment image ${garmentRes.status}`, 'huggingface');
    }
    const garmentBlob = new Blob([await garmentRes.arrayBuffer()], {
      type: garmentRes.headers.get('content-type') || 'image/jpeg',
    });

    const [personPath, garmentPath] = await Promise.all([
      hfUpload(space, personBlob, 'person.jpg', signal),
      hfUpload(space, garmentBlob, 'garment.jpg', signal),
    ]);

    const call = await fetch(`${space}/call/tryon`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', ...hfHeaders() },
      body: JSON.stringify({
        data: [
          { background: gradioFile(personPath), layers: [], composite: null },
          gradioFile(garmentPath),
          garmentDescription(product),
          true, // auto-generate the body mask
          false, // do not crop-and-resize the photo
          Number(process.env.VTON_HF_STEPS || 20),
          42,
        ],
      }),
    });

    const callText = await call.text();
    if (!call.ok) {
      console.error('[TryOn] hf call', call.status, callText.slice(0, 300));
      if (call.status === 429) return failed('rate_limited', 'the free GPU queue is busy', 'huggingface');
      return failed(`upstream_${call.status}`, callText.slice(0, 300), 'huggingface');
    }

    const eventId = JSON.parse(callText).event_id;
    const imageUrl = await hfAwaitResult(space, eventId, signal);
    if (!imageUrl) return failed('no_image', null, 'huggingface');

    const inlined = await inlineGradioImage(imageUrl, signal);
    if (!inlined) return failed('image_expired', 'the free Space dropped the result image', 'huggingface');
    return ok(inlined, 'huggingface');
  } catch (err) {
    if (err.name === 'AbortError') {
      return failed('timeout', 'the free GPU queue took too long', 'huggingface');
    }
    console.error('[TryOn] hf error:', err.message);
    if (/gpu|quota|exceeded/i.test(err.message)) {
      return failed('rate_limited', err.message.slice(0, 200), 'huggingface');
    }
    return failed('network_error', err.message.slice(0, 200), 'huggingface');
  }
}

// --- dispatch ---------------------------------------------------------------

function activeEngine() {
  const configured = (process.env.VTON_PROVIDER || '').toLowerCase();
  if (configured === 'none') return 'none';
  if (configured === 'fal') return 'fal';
  if (configured === 'huggingface' || configured === 'hf') return 'huggingface';
  return process.env.FAL_KEY ? 'fal' : 'huggingface';
}

async function runTryOn({ personDataUrl, garmentUrl, product, category, signal }) {
  if (!personDataUrl || !garmentUrl) return failed('missing_images', null, activeEngine());

  const engine = activeEngine();
  if (engine === 'none') {
    return { processing_status: 'unavailable', image_url: null, provider: 'none', reason: 'disabled' };
  }

  if (engine === 'fal') {
    const apiKey = process.env.FAL_KEY || process.env.VTON_API_KEY;
    if (!apiKey) return failed('not_configured', null, 'fal');
    const result = await runFalTryOn({ apiKey, personDataUrl, garmentUrl, category, signal });

    // A paid account that is locked or empty should still show a real try-on.
    if (result.processing_status === 'completed') return result;
    if (['needs_credits', 'auth_failed', 'rate_limited'].includes(result.reason)) {
      console.warn(`[TryOn] fal unusable (${result.reason}); falling back to the free Space.`);
      const free = await runHuggingFaceTryOn({ personDataUrl, garmentUrl, product, signal });
      if (free.processing_status === 'completed') return free;
      // The free engine is the one that was actually expected to work, so its
      // failure is the useful message; the paid account's state is a footnote.
      return { ...free, detail: free.detail || `the paid engine is also unusable (${result.reason})` };
    }
    return result;
  }

  return runHuggingFaceTryOn({ personDataUrl, garmentUrl, product, signal });
}

module.exports = { runTryOn, tryOnCategory, activeEngine };
