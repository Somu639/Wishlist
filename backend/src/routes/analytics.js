const express = require('express');
const router = express.Router();
const { trackEvent, getAnalyticsSummary } = require('../services/analyticsService');

// POST /api/analytics/event — track a frontend event
router.post('/event', (req, res) => {
  const { event_name, product_id, product_category, metadata } = req.body;

  if (!event_name) {
    return res.status(400).json({ error: 'event_name is required', code: 'VALIDATION_ERROR' });
  }

  trackEvent({
    eventName: event_name,
    productId: product_id,
    productCategory: product_category,
    metadata,
  });

  res.json({ success: true });
});

// GET /api/analytics/summary — internal dashboard data
router.get('/summary', (req, res) => {
  const summary = getAnalyticsSummary();
  res.json({ success: true, summary });
});

module.exports = router;
