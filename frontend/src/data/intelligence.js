const LABELS = {
  ready_to_buy: 'Ready to Buy',
  needs_reconsideration: 'Need Reconsideration',
  style_uncertainty: 'Style Uncertainty',
  possibly_outdated: 'Possibly Outdated',
  alternative_available: 'Alternative Available',
}

const SUMMER_TAGS = ['summer', 'beach', 'resort']
const EVERGREEN_TAGS = ['versatile', 'office', 'festive', 'wedding', 'classic', 'neutral', 'minimal']

const COMPLEMENTS = {
  Jeans: ['Top', 'Blazer', 'Kurti'],
  Top: ['Jeans', 'Blazer'],
  Blazer: ['Jeans', 'Top'],
  Dress: ['Blazer'],
  Kurti: ['Jeans', 'Blazer'],
  'Co-ord Set': ['Blazer'],
  Saree: ['Ethnic Wear'],
  'Ethnic Wear': ['Saree', 'Kurti'],
}

function tagsOf(item) {
  return (item.style_tags || []).map((tag) => String(tag).toLowerCase())
}

function daysSince(iso) {
  if (!iso) return 0
  const from = new Date(iso)
  if (Number.isNaN(from.getTime())) return 0
  return Math.floor((Date.now() - from.getTime()) / 86400000)
}

function complementNames(item, all) {
  const wanted = COMPLEMENTS[item.category] || []
  return all
    .filter((other) => other.product_id !== item.product_id && wanted.includes(other.category))
    .slice(0, 2)
    .map((other) => other.product_name)
}

function classifyItem(item, all) {
  const tags = tagsOf(item)
  const month = new Date().getMonth() + 1
  const offSummer = month >= 9 || month <= 2
  const sizes = item.available_sizes || []

  if (sizes.length === 0) {
    return {
      classification: 'needs_reconsideration',
      reason: 'Size options are not listed for this product, so fit is still uncertain.',
    }
  }

  const saved = daysSince(item.wishlisted_at)
  if (saved >= 30) {
    return {
      classification: 'possibly_outdated',
      reason: `This has been saved for ${saved} days. Revisit whether it still belongs on your list.`,
    }
  }

  if (offSummer && tags.some((tag) => SUMMER_TAGS.includes(tag)) && !tags.some((tag) => EVERGREEN_TAGS.includes(tag))) {
    return {
      classification: 'possibly_outdated',
      reason: 'This looks tied to a warmer-weather style, which may not match the current season.',
    }
  }

  const strongerPeer = all
    .filter((other) => other.product_id !== item.product_id && other.category === item.category)
    .filter((other) => Number(other.rating) > Number(item.rating) + 0.05)
    .sort((a, b) => Number(b.rating) - Number(a.rating))[0]

  if (strongerPeer) {
    return {
      classification: 'alternative_available',
      reason: `You also saved ${strongerPeer.product_name} — similar need, so compare before deciding.`,
    }
  }

  if (tags.some((tag) => ['trendy', 'street-style', 'boho'].includes(tag))) {
    return {
      classification: 'style_uncertainty',
      reason: 'This product may no longer match your current preferences versus the rest of your wishlist.',
    }
  }

  if (tags.some((tag) => ['festive', 'wedding', 'occasion-wear'].includes(tag)) || item.category === 'Blazer') {
    return {
      classification: 'needs_reconsideration',
      reason: item.category === 'Blazer'
        ? 'Still a useful layer — check how it sits with your saved jeans and shirts before buying.'
        : 'This is occasion wear. Confirm the event and styling before you buy.',
    }
  }

  const complements = complementNames(item, all)
  if (complements.length >= 2) {
    return {
      classification: 'ready_to_buy',
      reason: `Try this item with 2 pieces you already saved: ${complements[0]} and ${complements[1]}.`,
    }
  }

  if ((tags.includes('versatile') || tags.includes('classic')) && Number(item.rating) >= 4.4) {
    return {
      classification: 'ready_to_buy',
      reason: 'Your saved item is still aligned with your style.',
    }
  }

  return {
    classification: 'needs_reconsideration',
    reason: 'Details still fit your list, but a quick style check would make the decision clearer.',
  }
}

export function classifyWishlist(items) {
  const classified = items.map((item) => {
    const result = classifyItem(item, items)
    return {
      ...item,
      classification: result.classification,
      classification_label: LABELS[result.classification],
      intelligence_reason: result.reason,
    }
  })

  const summary = Object.keys(LABELS).map((id) => ({
    id,
    label: LABELS[id],
    count: classified.filter((item) => item.classification === id).length,
  }))

  return { items: classified, summary }
}
