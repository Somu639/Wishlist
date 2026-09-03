const CLASSIFICATIONS = {
  ready_to_buy: {
    id: 'ready_to_buy',
    label: 'Ready to Buy',
    short: 'Ready to Buy',
  },
  needs_reconsideration: {
    id: 'needs_reconsideration',
    label: 'Needs Reconsideration',
    short: 'Need Reconsideration',
  },
  style_uncertainty: {
    id: 'style_uncertainty',
    label: 'Style Uncertainty',
    short: 'Style Uncertainty',
  },
  possibly_outdated: {
    id: 'possibly_outdated',
    label: 'Possibly Outdated',
    short: 'Possibly Outdated',
  },
  alternative_available: {
    id: 'alternative_available',
    label: 'Alternative Available',
    short: 'Alternative Available',
  },
};

const SUMMER_TAGS = new Set(['summer', 'beach', 'resort']);
const COMPLEMENTS = {
  Jeans: ['Top', 'Blazer', 'Kurti'],
  Top: ['Jeans', 'Blazer'],
  Blazer: ['Jeans', 'Top'],
  Dress: ['Blazer'],
  Kurti: ['Jeans', 'Blazer'],
  'Co-ord Set': ['Blazer'],
  Saree: ['Ethnic Wear'],
  'Ethnic Wear': ['Saree', 'Kurti'],
};

function parseTags(value) {
  if (Array.isArray(value)) return value.map((t) => String(t).toLowerCase());
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((t) => String(t).toLowerCase()) : [];
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

function daysBetween(fromIso, now) {
  const from = new Date(String(fromIso).replace(' ', 'T'));
  if (Number.isNaN(from.getTime())) return 0;
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function isSeasonalMismatch(tags, now) {
  const month = now.getMonth() + 1;
  const offSummer = month >= 9 || month <= 2;
  const hasSummer = tags.some((tag) => SUMMER_TAGS.has(tag));
  const stillRelevant = tags.some((tag) => ['versatile', 'office', 'festive', 'wedding', 'classic', 'neutral', 'minimal'].includes(tag));
  return offSummer && hasSummer && !stillRelevant;
}

function sharedTagCount(a, b) {
  const setB = new Set(b);
  return a.filter((tag) => setB.has(tag)).length;
}

function findPeers(item, all) {
  return all.filter((other) => {
    if (other.product_id === item.product_id) return false;
    if (other.category === item.category) return true;
    return sharedTagCount(item.tags, other.tags) >= 2;
  });
}

function complementNames(item, all) {
  const wanted = COMPLEMENTS[item.category] || [];
  return all
    .filter((other) => other.product_id !== item.product_id && wanted.includes(other.category))
    .slice(0, 2)
    .map((other) => other.product_name);
}

function classifyItem(item, ctx) {
  const { now, events } = ctx;
  const daysSaved = daysBetween(item.wishlisted_at, now);
  const sizes = Array.isArray(item.available_sizes) ? item.available_sizes : parseTags(item.available_sizes);
  const peers = findPeers(item, ctx.items);
  const strongerPeer = peers
    .filter((peer) => Number(peer.rating) > Number(item.rating) + 0.05)
    .sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  const overlap = ctx.items.reduce((sum, other) => {
    if (other.product_id === item.product_id) return sum;
    return sum + sharedTagCount(item.tags, other.tags);
  }, 0);
  const complements = complementNames(item, ctx.items);
  const productEvents = events[item.product_id] || {};
  const views = (productEvents.wishlist_product_selected || 0)
    + (productEvents.try_on_started || 0)
    + (productEvents.style_recommendation_viewed || 0);
  const inBag = ctx.cartIds.has(item.product_id);
  const occasions = parseOccasions(item.occasion);
  const versatile = item.tags.includes('versatile') || item.tags.includes('classic') || occasions.length >= 3;

  if (sizes.length === 0) {
    return {
      classification: 'needs_reconsideration',
      reason: 'Size options are not listed for this product, so fit is still uncertain.',
    };
  }

  if (daysSaved >= 30) {
    return {
      classification: 'possibly_outdated',
      reason: `This has been saved for ${daysSaved} days. Revisit whether it still belongs on your list.`,
    };
  }

  if (isSeasonalMismatch(item.tags, now)) {
    return {
      classification: 'possibly_outdated',
      reason: 'This looks tied to a warmer-weather style, which may not match the current season.',
    };
  }

  if (strongerPeer) {
    return {
      classification: 'alternative_available',
      reason: `You also saved ${strongerPeer.product_name} — similar need, so compare before deciding.`,
    };
  }

  const outlierAesthetic = item.tags.some((tag) => ['trendy', 'street-style', 'boho'].includes(tag));
  if (outlierAesthetic) {
    return {
      classification: 'style_uncertainty',
      reason: 'This product may no longer match your current preferences versus the rest of your wishlist.',
    };
  }

  if (overlap === 0 && !versatile) {
    return {
      classification: 'style_uncertainty',
      reason: 'Style direction is unclear next to your other saved pieces. Try AI Style Preview before deciding.',
    };
  }

  if (item.tags.includes('festive') || item.tags.includes('wedding') || item.tags.includes('occasion-wear') || item.category === 'Blazer') {
    return {
      classification: 'needs_reconsideration',
      reason: item.category === 'Blazer'
        ? 'Still a useful layer — check how it sits with your saved jeans and shirts before buying.'
        : 'This is occasion wear. Confirm the event and styling before you buy.',
    };
  }

  if (complements.length >= 2) {
    return {
      classification: 'ready_to_buy',
      reason: `Try this item with 2 pieces you already own: ${complements[0]} and ${complements[1]}.`,
    };
  }

  if (versatile && Number(item.rating) >= 4.4) {
    return {
      classification: 'ready_to_buy',
      reason: 'Your saved item is still aligned with your style.',
    };
  }

  if (item.tags.includes('festive') || item.tags.includes('wedding') || item.tags.includes('occasion-wear')) {
    return {
      classification: 'needs_reconsideration',
      reason: 'This is occasion wear. Confirm the event and styling before you buy.',
    };
  }

  if (views >= 2 && !inBag) {
    return {
      classification: 'needs_reconsideration',
      reason: 'Your saved item is still aligned with your style, but you have not committed yet — worth a closer look.',
    };
  }

  return {
    classification: 'needs_reconsideration',
    reason: 'Details still fit your list, but a quick style check would make the decision clearer.',
  };
}

function classifyWishlist(rawItems, { cartIds = new Set(), events = {}, now = new Date() } = {}) {
  const items = rawItems.map((item) => ({
    ...item,
    tags: parseTags(item.style_tags),
  }));

  const classified = items.map((item) => {
    const result = classifyItem(item, { items, cartIds, events, now });
    const meta = CLASSIFICATIONS[result.classification];
    return {
      product_id: item.product_id,
      classification: result.classification,
      classification_label: meta.label,
      reason: result.reason,
    };
  });

  const counts = {
    ready_to_buy: 0,
    needs_reconsideration: 0,
    style_uncertainty: 0,
    possibly_outdated: 0,
    alternative_available: 0,
  };
  for (const row of classified) counts[row.classification] += 1;

  const summary = [
    { id: 'ready_to_buy', label: 'Ready to Buy', count: counts.ready_to_buy },
    { id: 'needs_reconsideration', label: 'Need Reconsideration', count: counts.needs_reconsideration },
    { id: 'style_uncertainty', label: 'Style Uncertainty', count: counts.style_uncertainty },
    { id: 'possibly_outdated', label: 'Possibly Outdated', count: counts.possibly_outdated },
    { id: 'alternative_available', label: 'Alternative Available', count: counts.alternative_available },
  ];

  return { classified, summary, counts };
}

module.exports = {
  CLASSIFICATIONS,
  classifyWishlist,
  parseTags,
};
