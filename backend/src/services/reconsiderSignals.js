const { db } = require('../db/database');

const NEUTRAL_COLOR = /\b(black|white|ivory|cream|beige|sand|navy|indigo|charcoal|grey|gray|denim|khaki|nude|neutral|taupe)\b/i;

const PAIRING_COPY = {
  Dress: 'Easy to pair with neutral sandals or a light jacket',
  Kurti: 'Easy to pair with palazzos, jeans, or leggings',
  Saree: 'Easy to pair with classic jewellery and a simple blouse',
  'Co-ord Set': 'Easy to wear as a set or split across your wardrobe',
  Jeans: 'Easy to pair with tops and layers you already own',
  Top: 'Easy to pair with neutral bottoms',
  Blazer: 'Easy to layer over basics you already own',
  'Ethnic Wear': 'Easy to pair with simple jewellery and festive extras',
};

function parseJsonList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parseOccasions(occasion) {
  return String(occasion || '')
    .split(/[,/]| and /i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function gatherReconsiderContext(productId) {
  const wishlistRows = db.prepare(`
    SELECT p.product_id, p.category, p.style_tags, p.color
    FROM wishlist w
    JOIN products p ON w.product_id = p.product_id
    WHERE p.product_id != ?
  `).all(productId);

  const cartRows = db.prepare(`
    SELECT p.product_id, p.category, p.style_tags
    FROM cart c
    JOIN products p ON c.product_id = p.product_id
  `).all();

  const interaction = db.prepare(`
    SELECT event_name, COUNT(*) as count
    FROM analytics_events
    WHERE product_id = ?
      AND event_name IN (
        'wishlist_product_selected',
        'try_on_started',
        'photo_uploaded',
        'style_recommendation_viewed',
        'add_to_cart',
        'save_styling'
      )
    GROUP BY event_name
  `).all(productId);

  const interactionTotal = interaction.reduce((sum, row) => sum + (row.count || 0), 0);
  const viewLikeCount = interaction
    .filter((row) => ['wishlist_product_selected', 'try_on_started', 'style_recommendation_viewed'].includes(row.event_name))
    .reduce((sum, row) => sum + (row.count || 0), 0);

  return { wishlistRows, cartRows, interactionTotal, viewLikeCount };
}

function tagSet(row) {
  return new Set(parseJsonList(row.style_tags).map((tag) => tag.toLowerCase()));
}

function buildReconsiderSignals(product, context = gatherReconsiderContext(product.product_id)) {
  const signals = [];
  const occasions = parseOccasions(product.occasion);
  const tags = parseJsonList(product.style_tags).map((tag) => tag.toLowerCase());
  const { wishlistRows = [], cartRows = [], interactionTotal = 0, viewLikeCount = 0 } = context;

  if (occasions.length >= 2) {
    signals.push({
      id: 'occasions',
      label: `Works with ${occasions.length} occasions`,
    });
  }

  const pairing = PAIRING_COPY[product.category];
  if (pairing || tags.includes('versatile')) {
    signals.push({
      id: 'easy_pair',
      label: pairing || 'Easy to pair with pieces you already own',
    });
  }

  if (NEUTRAL_COLOR.test(product.color || '') || tags.includes('neutral')) {
    signals.push({
      id: 'versatile_color',
      label: 'Versatile colour that is easy to restyle',
    });
  }

  const productTags = new Set(tags);
  const wishlistTagCounts = new Map();
  const wishlistCategories = new Set();
  for (const row of wishlistRows) {
    wishlistCategories.add(row.category);
    for (const tag of tagSet(row)) {
      wishlistTagCounts.set(tag, (wishlistTagCounts.get(tag) || 0) + 1);
    }
  }
  const overlappingTags = [...productTags].filter((tag) => (wishlistTagCounts.get(tag) || 0) >= 1);
  if (overlappingTags.length >= 2 || wishlistCategories.has(product.category)) {
    signals.push({
      id: 'saved_style',
      label: 'Matches your saved style preferences',
    });
  }

  const similarInBag = cartRows.some((row) => {
    if (row.category === product.category) return true;
    const otherTags = tagSet(row);
    const overlap = [...productTags].filter((tag) => otherTags.has(tag));
    return overlap.length >= 2;
  });
  if (similarInBag) {
    signals.push({
      id: 'similar_bag',
      label: 'Similar silhouette to items already in your bag',
    });
  }

  const rating = Number(product.rating);
  const reviews = Number(product.review_count);
  if (rating >= 4.3 && reviews >= 200) {
    signals.push({
      id: 'reviews',
      label: `Strong reviews · ${rating} from ${reviews.toLocaleString('en-IN')} shoppers`,
    });
  }

  if (viewLikeCount >= 2) {
    signals.push({
      id: 'repeat_views',
      label: "You've come back to this piece more than once",
    });
  } else if (interactionTotal >= 1) {
    signals.push({
      id: 'prior_interaction',
      label: "You've already spent time considering this item",
    });
  }

  // Intentionally omitted without real data:
  // limited inventory / "buy before it's gone"
  // product info changed since wishlist add
  // prior purchases (no order history in this MVP)

  const unique = [];
  const seen = new Set();
  for (const signal of signals) {
    if (seen.has(signal.id)) continue;
    seen.add(signal.id);
    unique.push(signal);
  }

  return {
    title: 'Why this item may be worth reconsidering',
    signals: unique.slice(0, 5),
  };
}

module.exports = { buildReconsiderSignals, gatherReconsiderContext };
