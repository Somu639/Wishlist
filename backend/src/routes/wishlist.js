const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { trackEvent } = require('../services/analyticsService');
const { classifyWishlist } = require('../services/wishlistIntelligence');

// GET /api/wishlist — fetch all wishlisted products with full details
router.get('/', (req, res, next) => {
  try {
    const items = db.prepare(`
      SELECT
        p.product_id,
        p.product_name,
        p.brand,
        p.category,
        p.price,
        p.original_price,
        p.discount_percent,
        p.image_url,
        p.color,
        p.material,
        p.available_sizes,
        p.occasion,
        p.style_tags,
        p.rating,
        p.review_count,
        w.added_at as wishlisted_at
      FROM wishlist w
      JOIN products p ON w.product_id = p.product_id
      ORDER BY w.added_at DESC
    `).all();

    // Parse JSON fields
    const enriched = items.map((item) => ({
      ...item,
      available_sizes: safeParseJSON(item.available_sizes, []),
      style_tags: safeParseJSON(item.style_tags, []),
    }));

    const cartIds = new Set(
      db.prepare('SELECT product_id FROM cart').all().map((row) => row.product_id)
    );

    const eventRows = db.prepare(`
      SELECT product_id, event_name, COUNT(*) as count
      FROM analytics_events
      WHERE product_id IS NOT NULL
      GROUP BY product_id, event_name
    `).all();

    const events = {};
    for (const row of eventRows) {
      if (!events[row.product_id]) events[row.product_id] = {};
      events[row.product_id][row.event_name] = row.count;
    }

    const intelligence = classifyWishlist(enriched, { cartIds, events });
    const byId = new Map(intelligence.classified.map((row) => [row.product_id, row]));

    const itemsWithIntelligence = enriched.map((item) => {
      const intel = byId.get(item.product_id) || {};
      return {
        ...item,
        classification: intel.classification || null,
        classification_label: intel.classification_label || null,
        intelligence_reason: intel.reason || null,
      };
    });

    trackEvent({ eventName: 'wishlist_view' });

    res.json({
      success: true,
      items: itemsWithIntelligence,
      count: itemsWithIntelligence.length,
      intelligence: {
        title: 'Your Wishlist, Reconsidered',
        saved_count: itemsWithIntelligence.length,
        summary: intelligence.summary,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist — add a product to wishlist
router.post('/', (req, res, next) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required', code: 'VALIDATION_ERROR' });
    }

    const product = db.prepare('SELECT product_id FROM products WHERE product_id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    }

    const existing = db.prepare('SELECT id FROM wishlist WHERE product_id = ?').get(product_id);
    if (existing) {
      return res.status(409).json({ error: 'Product already in wishlist', code: 'ALREADY_EXISTS' });
    }

    db.prepare('INSERT INTO wishlist (product_id) VALUES (?)').run(product_id);
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/wishlist/:productId — remove from wishlist
router.delete('/:productId', (req, res, next) => {
  try {
    const { productId } = req.params;
    const result = db.prepare('DELETE FROM wishlist WHERE product_id = ?').run(productId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found in wishlist', code: 'NOT_FOUND' });
    }
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
});

function safeParseJSON(val, fallback) {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

module.exports = router;
