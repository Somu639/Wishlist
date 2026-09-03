const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { trackEvent } = require('../services/analyticsService');

// GET /api/cart
router.get('/', (req, res, next) => {
  try {
    const items = db.prepare(`
      SELECT
        c.id,
        c.product_id,
        c.size,
        c.quantity,
        c.added_at,
        c.source,
        p.product_name,
        p.brand,
        p.price,
        p.image_url,
        p.color
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      ORDER BY c.added_at DESC
    `).all();

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.json({ success: true, items, count: items.length, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart — add item to cart
router.post('/', (req, res, next) => {
  try {
    const { product_id, size, quantity = 1, source = 'direct' } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required', code: 'VALIDATION_ERROR' });
    }

    const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    }

    // Validate size if provided
    if (size) {
      const sizes = safeParseJSON(product.available_sizes, []);
      if (sizes.length > 0 && !sizes.includes(size)) {
        return res.status(400).json({
          error: `Size ${size} is not available. Available: ${sizes.join(', ')}`,
          code: 'INVALID_SIZE',
        });
      }
    }

    db.prepare(`
      INSERT INTO cart (product_id, size, quantity, source)
      VALUES (?, ?, ?, ?)
    `).run(product_id, size || null, quantity, source);

    // Track conversion events
    const eventName = source === 'ai_preview' ? 'add_to_cart_after_ai' : 'add_to_cart';
    trackEvent({ eventName, productId: product_id, productCategory: product.category });
    if (source === 'ai_preview') {
      trackEvent({ eventName: 'conversion_after_ai', productId: product_id, productCategory: product.category });
    }

    res.status(201).json({ success: true, message: 'Added to cart', product_name: product.product_name });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/:id
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM cart WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cart item not found', code: 'NOT_FOUND' });
    }
    res.json({ success: true, message: 'Removed from cart' });
  } catch (err) {
    next(err);
  }
});

function safeParseJSON(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;
