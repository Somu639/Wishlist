const { getProduct } = require('./_catalog');
const { runTryOn } = require('./_tryon');

const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function stripDataUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match ? match[1] : text;
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
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
      signal: controller.signal,
    });

    // Always 200: the caller falls back to the browser-side style preview and
    // the shopper still gets the full written analysis.
    return res.status(200).json(result);
  } finally {
    clearTimeout(timer);
  }
};
