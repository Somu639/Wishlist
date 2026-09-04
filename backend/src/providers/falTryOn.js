/**
 * fal.ai virtual try-on call shared by the Express provider.
 *
 * Resolves on every failure path so a try-on outage degrades to the written
 * AI Style analysis instead of breaking the request.
 */

const FAL_BASE_URL = 'https://fal.run/';

function tryOnCategory(category) {
  const key = String(category || '').toLowerCase();
  if (/jean|trouser|pant|short|skirt|legging|palazzo/.test(key)) return 'bottoms';
  if (/shirt|top|blazer|jacket|blouse|tee|sweater|kurta$/.test(key)) return 'tops';
  if (/dress|saree|sari|kurti|anarkali|gown|co-ord|coord|jumpsuit|lehenga|suit/.test(key)) return 'one-pieces';
  return 'auto';
}

function failed(reason) {
  return { processing_status: 'failed', image_url: null, reason };
}

async function runTryOn({ apiKey, model, personDataUrl, garmentUrl, category, signal, mode }) {
  if (!apiKey) return { processing_status: 'unavailable', image_url: null, reason: 'not_configured' };
  if (!personDataUrl || !garmentUrl) return failed('missing_images');

  let response;
  try {
    response = await fetch(`${FAL_BASE_URL}${model || 'fal-ai/fashn/tryon/v1.6'}`, {
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
        mode: mode || process.env.VTON_MODE || 'balanced',
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

  return { processing_status: 'completed', image_url: image };
}

module.exports = { runTryOn, tryOnCategory };
