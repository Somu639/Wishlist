const { db } = require('../db/database');

const VALID_EVENTS = new Set([
  'wishlist_view',
  'wishlist_product_selected',
  'try_on_started',
  'photo_uploaded',
  'ai_analysis_completed',
  'ai_analysis_failed',
  'style_recommendation_viewed',
  'add_to_cart_after_ai',
  'buy_now_after_ai',
  'try_another_product',
  'save_styling',
  'add_to_cart',
  'buy_now',
  'conversion_after_ai',
]);

function trackEvent({ eventName, productId, productCategory, aiScore, analysisLatencyMs, metadata }) {
  if (!VALID_EVENTS.has(eventName)) {
    console.warn(`[Analytics] Unknown event: ${eventName}`);
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO analytics_events (event_name, product_id, product_category, ai_score, analysis_latency_ms, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      eventName,
      productId || null,
      productCategory || null,
      aiScore != null ? parseInt(aiScore) : null,
      analysisLatencyMs || null,
      metadata ? JSON.stringify(metadata) : null
    );
  } catch (err) {
    // Analytics failures should never break the main flow
    console.error('[Analytics Error]', err.message);
  }
}

function getAnalyticsSummary() {
  try {
    const eventCounts = db.prepare(`
      SELECT event_name, COUNT(*) as count
      FROM analytics_events
      GROUP BY event_name
      ORDER BY count DESC
    `).all();

    const avgScore = db.prepare(`
      SELECT AVG(ai_score) as avg_score, COUNT(*) as total_analyses
      FROM analytics_events
      WHERE event_name = 'ai_analysis_completed' AND ai_score IS NOT NULL
    `).get();

    const avgLatency = db.prepare(`
      SELECT AVG(analysis_latency_ms) as avg_latency_ms
      FROM analytics_events
      WHERE event_name = 'ai_analysis_completed' AND analysis_latency_ms IS NOT NULL
    `).get();

    const conversionAfterAI = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM analytics_events WHERE event_name IN ('add_to_cart_after_ai', 'buy_now_after_ai')) as conversions,
        (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'ai_analysis_completed') as analyses
    `).get();

    return {
      eventCounts,
      avgScore: avgScore?.avg_score ? Math.round(avgScore.avg_score) : null,
      totalAnalyses: avgScore?.total_analyses || 0,
      avgLatencyMs: avgLatency?.avg_latency_ms ? Math.round(avgLatency.avg_latency_ms) : null,
      conversionRate: conversionAfterAI?.analyses > 0
        ? ((conversionAfterAI.conversions / conversionAfterAI.analyses) * 100).toFixed(1)
        : null,
    };
  } catch (err) {
    console.error('[Analytics Summary Error]', err.message);
    return null;
  }
}

module.exports = { trackEvent, getAnalyticsSummary };
