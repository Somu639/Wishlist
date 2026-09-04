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

function failed(reason, detail) {
  return { processing_status: 'failed', image_url: null, reason, detail };
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
    const detail = upstreamDetail(parsed, raw);
    console.error('[TryOn] fal HTTP', response.status, detail);
    if (response.status === 401 || response.status === 403) return failed('auth_failed', detail);
    if (response.status === 429) return failed('rate_limited', detail);
    if (response.status === 422) return failed('rejected_input', detail);
    return failed(`upstream_${response.status}`, detail);
  }

  const image = parsed?.images?.[0]?.url || parsed?.image?.url || null;
  if (!image) {
    console.error('[TryOn] no image in response:', raw.slice(0, 400));
    return failed('no_image', upstreamDetail(parsed, raw));
  }

  return { processing_status: 'completed', image_url: image };
}

module.exports = { runTryOn, tryOnCategory };
