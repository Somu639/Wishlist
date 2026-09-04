const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const product = db.prepare('SELECT image_url FROM products WHERE product_id = ?').get(req.query.id);
    if (!product?.image_url) {
      return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(product.image_url, { signal: controller.signal });
    clearTimeout(timer);

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Could not load product image' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
