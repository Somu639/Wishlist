const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const { upload } = require('../middleware/upload');
const { analysisLimiter } = require('../middleware/rateLimiter');
const { getAIProvider } = require('../providers');
const { trackEvent } = require('../services/analyticsService');
const { buildReconsiderSignals, gatherReconsiderContext } = require('../services/reconsiderSignals');
const { db } = require('../db/database');

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

async function processUserImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    const err = new Error('The uploaded file is not a valid image. Please upload a JPG, PNG, or WEBP photo.');
    err.code = 'INVALID_IMAGE';
    throw err;
  }

  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    const err = new Error('Unsupported image format. Please upload JPG, JPEG, PNG, or WEBP.');
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  return processedBuffer;
}

async function fetchProductImage(imageUrl) {
  if (!imageUrl) return { productImageUrl: null, productImageBase64: null };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return { productImageUrl: imageUrl, productImageBase64: null };
    }

    const arrayBuf = await res.arrayBuffer();
    const processed = await sharp(Buffer.from(arrayBuf))
      .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return { productImageUrl: null, productImageBase64: processed.toString('base64') };
  } catch {
    // Fall back to remote URL so Groq can still fetch the product photo
    return { productImageUrl: imageUrl, productImageBase64: null };
  }
}

// POST /api/analyze-style
router.post(
  '/',
  analysisLimiter,
  upload.single('userPhoto'),
  async (req, res, next) => {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required', code: 'VALIDATION_ERROR' });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload a photo to get your style analysis.',
        code: 'MISSING_IMAGE',
      });
    }

    const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    }

    const reconsiderContext = gatherReconsiderContext(product_id);

    trackEvent({ eventName: 'photo_uploaded', productId: product_id, productCategory: product.category });
    trackEvent({ eventName: 'try_on_started', productId: product_id, productCategory: product.category });

    try {
      const processedBuffer = await processUserImage(req.file.buffer);
      const base64Image = processedBuffer.toString('base64');
      const { productImageUrl, productImageBase64 } = await fetchProductImage(product.image_url);

      const preview = await getAIProvider().preview({
        userImageBase64: base64Image,
        userImageMimeType: 'image/jpeg',
        productImageUrl,
        productImageBase64,
        product,
      });

      trackEvent({
        eventName: 'ai_analysis_completed',
        productId: product_id,
        productCategory: product.category,
        aiScore: preview.analysis.overall_score,
        analysisLatencyMs: preview.latency_ms,
        metadata: {
          experience_mode: preview.experience_mode,
          tryon_status: preview.try_on.processing_status,
        },
      });

      res.json({
        success: true,
        product: {
          product_id: product.product_id,
          product_name: product.product_name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          image_url: product.image_url,
          color: product.color,
        },
        analysis: preview.analysis,
        reconsider: buildReconsiderSignals(product, reconsiderContext),
        try_on: preview.try_on,
        experience_mode: preview.experience_mode,
        experience_label: preview.experience_label,
        latency_ms: preview.latency_ms,
      });
    } catch (err) {
      trackEvent({
        eventName: 'ai_analysis_failed',
        productId: product_id,
        productCategory: product.category,
        metadata: { error: err.code || 'UNKNOWN' },
      });
      next(err);
    }
  }
);

router.post('/save', (req, res, next) => {
  try {
    const { product_id, analysis_result } = req.body;

    if (!product_id || !analysis_result) {
      return res.status(400).json({ error: 'product_id and analysis_result are required', code: 'VALIDATION_ERROR' });
    }

    db.prepare(`
      INSERT INTO style_saves (product_id, analysis_result)
      VALUES (?, ?)
    `).run(product_id, JSON.stringify(analysis_result));

    trackEvent({ eventName: 'save_styling', productId: product_id });

    res.status(201).json({ success: true, message: 'Style saved successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
