const express = require('express');
const { db } = require('../db/database');
const { createVirtualTryOnProvider } = require('../providers/VirtualTryOnProvider');

const router = express.Router();
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function stripDataUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match ? match[1] : text;
}

router.get('/', (req, res) => {
  res.json({
    configured: Boolean(process.env.FAL_KEY || process.env.VTON_API_KEY),
    model: process.env.VTON_MODEL || 'fal-ai/fashn/tryon/v1.6',
    mode: process.env.VTON_MODE || 'balanced',
  });
});

router.post('/', async (req, res, next) => {
  try {
    const imageBase64 = stripDataUrl(req.body?.image_base64);
    const product = db
      .prepare('SELECT product_id, category, image_url FROM products WHERE product_id = ?')
      .get(req.body?.product_id || '');

    if (!product || !imageBase64) {
      return res.status(400).json({
        error: 'product_id and image_base64 are required.',
        code: 'VALIDATION_ERROR',
      });
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ error: 'Photo is too large.', code: 'IMAGE_TOO_LARGE' });
    }

    const mime = ALLOWED_MIME.has(req.body?.image_mime) ? req.body.image_mime : 'image/jpeg';
    const provider = createVirtualTryOnProvider();

    const result = await provider.generate({
      user_image: `data:${mime};base64,${imageBase64}`,
      product_image_url: product.image_url,
      product_metadata: { category: product.category },
    });

    // Always 200: the client falls back to the browser-side style preview.
    return res.status(200).json({
      processing_status: result.processing_status,
      image_url: result.generated_tryon_image,
      provider: result.provider,
      reason: result.reason,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
