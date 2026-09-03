const NAMED_COLORS = [
  { match: /peacock|emerald/, hex: '#0F6B5C' },
  { match: /magenta|fuchsia/, hex: '#C2185B' },
  { match: /dusty rose|rose|blush/, hex: '#C98B96' },
  { match: /ivory|cream/, hex: '#F4EDE1' },
  { match: /sand|beige|khaki|nude/, hex: '#C8B89A' },
  { match: /charcoal/, hex: '#3A3A3C' },
  { match: /indigo/, hex: '#3D4C8A' },
  { match: /navy/, hex: '#1E3A5F' },
  { match: /teal/, hex: '#2A9D8F' },
  { match: /gold/, hex: '#C9A227' },
  { match: /silver|grey|gray/, hex: '#8A8A8A' },
  { match: /black/, hex: '#1A1A1A' },
  { match: /white/, hex: '#F7F7F7' },
  { match: /red|maroon|burgundy/, hex: '#9B1C3A' },
  { match: /orange|rust|terracotta/, hex: '#C45C26' },
  { match: /yellow|mustard/, hex: '#D4A017' },
  { match: /green|olive/, hex: '#4F7A4E' },
  { match: /blue/, hex: '#3B6EA5' },
  { match: /purple|lilac|lavender/, hex: '#7B5EA7' },
  { match: /pink/, hex: '#E8A0BF' },
  { match: /brown|tan|coffee/, hex: '#8B5E3C' },
  { match: /coral/, hex: '#E07A5F' },
]

export function colorToHex(label) {
  const text = String(label || '').toLowerCase()
  for (const entry of NAMED_COLORS) {
    if (entry.match.test(text)) return entry.hex
  }
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = text.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 42% 52%)`
}

export function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}
