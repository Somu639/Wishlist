function overlayBox(category) {
  const key = String(category || '').toLowerCase()
  if (key.includes('jean')) return { top: 0.46, height: 0.50, width: 0.56 }
  if (key.includes('blazer')) return { top: 0.13, height: 0.52, width: 0.60 }
  if (key.includes('top') || key === 'shirt') return { top: 0.15, height: 0.44, width: 0.56 }
  if (key.includes('saree') || key.includes('ethnic') || key.includes('kurti') || key.includes('anarkali') || key.includes('suit')) {
    return { top: 0.10, height: 0.82, width: 0.72 }
  }
  if (key.includes('dress') || key.includes('co-ord') || key.includes('coord')) {
    return { top: 0.12, height: 0.76, width: 0.64 }
  }
  return { top: 0.16, height: 0.66, width: 0.60 }
}

export function productImageSrc(productId, fallbackUrl) {
  if (productId) return `/api/image?id=${encodeURIComponent(productId)}`
  return fallbackUrl
}

function loadImage(src, withCors = false) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (withCors) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

function punchStudioBackground(source) {
  const canvas = document.createElement('canvas')
  canvas.width = source.naturalWidth || source.width
  canvas.height = source.naturalHeight || source.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  const corner = [
    [0, 0],
    [canvas.width - 1, 0],
    [0, canvas.height - 1],
    [canvas.width - 1, canvas.height - 1],
  ].map(([x, y]) => {
    const i = (y * canvas.width + x) * 4
    return [data[i], data[i + 1], data[i + 2]]
  })
  const avg = corner.reduce((sum, c) => [sum[0] + c[0], sum[1] + c[1], sum[2] + c[2]], [0, 0, 0])
    .map((v) => v / 4)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const dist = Math.abs(r - avg[0]) + Math.abs(g - avg[1]) + Math.abs(b - avg[2])
    const nearWhite = r > 220 && g > 220 && b > 220
    const paleGray = max > 200 && max - min < 22
    const matchesCorner = dist < 48 && max > 170
    if (nearWhite || paleGray || matchesCorner) data[i + 3] = 0
    else if (r > 195 && g > 195 && b > 195) data[i + 3] = Math.round(data[i + 3] * 0.25)
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

export async function generateLookOverlay({ userSrc, productId, productUrl, category }) {
  const user = await loadImage(userSrc, false)
  const width = 720
  const height = 960
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const userScale = Math.max(width / user.naturalWidth, height / user.naturalHeight)
  const uw = user.naturalWidth * userScale
  const uh = user.naturalHeight * userScale
  ctx.drawImage(user, (width - uw) / 2, (height - uh) / 2, uw, uh)

  const sources = [
    productImageSrc(productId, productUrl),
    productUrl,
  ].filter(Boolean)

  let product = null
  for (const src of sources) {
    try {
      product = await loadImage(src, true)
      break
    } catch {
      product = null
    }
  }
  if (!product) {
    try {
      product = await loadImage(productUrl, false)
    } catch {
      throw new Error('Could not load the product image for the overlay.')
    }
  }

  let layer = product
  try {
    layer = punchStudioBackground(product)
  } catch {
    layer = product
  }

  const box = overlayBox(category)
  const dw = width * box.width
  const dh = height * box.height
  const dx = (width - dw) / 2
  const dy = height * box.top

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.globalAlpha = 0.96
  ctx.drawImage(layer, dx, dy, dw, dh)
  ctx.restore()

  return canvas.toDataURL('image/jpeg', 0.88)
}

export { overlayBox }
