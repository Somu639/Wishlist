/**
 * Photoreal virtual try-on via fal.ai (FASHN v1.6 by default).
 *
 * Groq is never used for image generation; it only writes the text analysis.
 * Every failure resolves rather than throws so the caller can fall back to the
 * browser-side style preview without surfacing an error to the shopper.
 */

const FAL_BASE_URL = 'https://fal.run/';
const DEFAULT_MODEL = 'fal-ai/fashn/tryon/v1.6';

function tryOnCategory(category) {
  const key = String(category || '').toLowerCase();
  if (/jean|trouser|pant|short|skirt|legging|palazzo/.test(key)) return 'bottoms';
  if (/shirt|top|blazer|jacket|blouse|tee|sweater|kurta$/.test(key)) return 'tops';
  if (/dress|saree|sari|kurti|anarkali|gown|co-ord|coord|jumpsuit|lehenga|suit/.test(key)) return 'one-pieces';
  return 'auto';
}

function unavailable(reason) {
  return { processing_status: 'unavailable', image_url: null, provider: 'fal', reason };
}

function failed(reason, detail) {
  return { processing_status: 'failed', image_url: null, provider: 'fal', reason, detail };
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

/**
 * @returns {Promise<{processing_status: 'completed'|'failed'|'unavailable', image_url: string|null, provider: string, reason?: string}>}
 */
async function runTryOn({ personDataUrl, garmentUrl, category, signal }) {
  const apiKey = process.env.FAL_KEY || process.env.VTON_API_KEY;
  if (!apiKey) return unavailable('not_configured');
  if (!personDataUrl || !garmentUrl) return failed('missing_images');

  const model = process.env.VTON_MODEL || DEFAULT_MODEL;

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
        // Catalog images are a mix of on-model and product shots.
        garment_photo_type: 'auto',
        mode: process.env.VTON_MODE || 'balanced',
        num_samples: 1,
        output_format: 'jpeg',
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') return failed('timeout');
    console.error('[TryOn] network error:', err.message);
    return failed('network_error');
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
      return failed(outOfCredit ? 'needs_credits' : 'auth_failed', detail);
    }
    if (response.status === 429) return failed('rate_limited', detail);
    if (response.status === 422) return failed('rejected_input', detail);
    return failed(`upstream_${response.status}`, detail);
  }

  const image = parsed?.images?.[0]?.url || parsed?.image?.url || null;
  if (!image) {
    console.error('[TryOn] no image in response:', raw.slice(0, 400));
    return failed('no_image', upstreamDetail(parsed, raw));
  }

  return { processing_status: 'completed', image_url: image, provider: 'fal', model };
}

module.exports = { runTryOn, tryOnCategory };
