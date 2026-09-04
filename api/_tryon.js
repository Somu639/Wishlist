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

function failed(reason) {
  return { processing_status: 'failed', image_url: null, provider: 'fal', reason };
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
    console.error('[TryOn] fal HTTP', response.status, raw.slice(0, 400));
    if (response.status === 401 || response.status === 403) return failed('auth_failed');
    if (response.status === 429) return failed('rate_limited');
    return failed(`upstream_${response.status}`);
  }

  const image = parsed?.images?.[0]?.url || parsed?.image?.url || null;
  if (!image) {
    console.error('[TryOn] no image in response:', raw.slice(0, 400));
    return failed('no_image');
  }

  return { processing_status: 'completed', image_url: image, provider: 'fal', model };
}

module.exports = { runTryOn, tryOnCategory };
