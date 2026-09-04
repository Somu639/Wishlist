const { getProduct } = require('./_catalog');
const { runTryOn, activeEngine } = require('./_tryon');

const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function stripDataUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match ? match[1] : text;
}

/**
 * Describes the key without revealing it. A fal key is `<uuid>:<secret>`, and
 * pasting only the id half is the usual cause of an auth failure.
 */
function describeKeyShape(key) {
  if (!key) return 'missing';
  const trimmed = key.trim();
  if (trimmed !== key) return 'has_surrounding_whitespace';
  if (/^["'].*["']$/.test(trimmed)) return 'wrapped_in_quotes';
  const parts = trimmed.split(':');
  if (parts.length !== 2) return `expected_id:secret_but_got_${parts.length}_part(s)`;
  if (!parts[0] || !parts[1]) return 'empty_half';
  return 'looks_valid';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  // Config probe: open this in a browser to check whether the key landed.
  if (req.method === 'GET') {
    const engine = activeEngine();
    return res.status(200).json({
      engine,
      // The free Space needs no key, so try-on is on unless explicitly disabled.
      configured: engine !== 'none',
      fal_key_shape: describeKeyShape(process.env.FAL_KEY || process.env.VTON_API_KEY),
      model: engine === 'fal'
        ? process.env.VTON_MODEL || 'fal-ai/fashn/tryon/v1.6'
        : process.env.VTON_HF_SPACE || 'https://yisol-idm-vton.hf.space',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
  }

  const imageBase64 = stripDataUrl(body.image_base64);
  const product = getProduct(body.product_id);

  if (!product || !imageBase64) {
    return res.status(400).json({
      error: 'product_id and image_base64 are required.',
      code: 'VALIDATION_ERROR',
    });
  }

  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'Photo is too large.', code: 'IMAGE_TOO_LARGE' });
  }

  const mime = ALLOWED_MIME.has(body.image_mime) ? body.image_mime : 'image/jpeg';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const result = await runTryOn({
      personDataUrl: `data:${mime};base64,${imageBase64}`,
      garmentUrl: product.image_url,
      category: product.category,
      product,
      signal: controller.signal,
    });

    // Always 200: the caller falls back to the browser-side style preview and
    // the shopper still gets the full written analysis.
    return res.status(200).json(result);
  } finally {
    clearTimeout(timer);
  }
};
