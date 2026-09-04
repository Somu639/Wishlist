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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

function isSkinTone(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  return y > 35 && y < 250 && cr > 128 && cr < 185 && cb > 72 && cb < 142 && r > g - 8 && r > b - 12
}

function sampleBorder(data, width, height) {
  const points = []
  const inset = 4
  const xs = [inset, Math.floor(width / 2), width - 1 - inset]
  const ys = [inset, height - 1 - inset]
  for (const y of ys) {
    for (const x of xs) {
      const i = (y * width + x) * 4
      points.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  return points
}

function blurMask(mask, width, height, radius) {
  const r = Math.max(1, radius)
  const tmp = new Float32Array(mask.length)
  const out = new Float32Array(mask.length)
  const span = r * 2 + 1

  for (let y = 0; y < height; y += 1) {
    let sum = 0
    for (let x = -r; x <= r; x += 1) {
      sum += mask[y * width + clamp(x, 0, width - 1)]
    }
    for (let x = 0; x < width; x += 1) {
      tmp[y * width + x] = sum / span
      sum += mask[y * width + clamp(x + r + 1, 0, width - 1)]
      sum -= mask[y * width + clamp(x - r, 0, width - 1)]
    }
  }

  for (let x = 0; x < width; x += 1) {
    let sum = 0
    for (let y = -r; y <= r; y += 1) {
      sum += tmp[clamp(y, 0, height - 1) * width + x]
    }
    for (let y = 0; y < height; y += 1) {
      out[y * width + x] = sum / span
      sum += tmp[clamp(y + r + 1, 0, height - 1) * width + x]
      sum -= tmp[clamp(y - r, 0, height - 1) * width + x]
    }
  }
  return out
}

function extractGarmentPalette(product) {
  const srcW = product.naturalWidth || product.width
  const srcH = product.naturalHeight || product.height
  const sx = Math.floor(srcW * 0.22)
  const sy = Math.floor(srcH * 0.28)
  const sw = Math.max(16, Math.floor(srcW * 0.56))
  const sh = Math.max(16, Math.floor(srcH * 0.48))

  const cut = document.createElement('canvas')
  cut.width = 96
  cut.height = 96
  const cutCtx = cut.getContext('2d', { willReadFrequently: true })
  cutCtx.drawImage(product, sx, sy, sw, sh, 0, 0, 96, 96)
  const { data } = cutCtx.getImageData(0, 0, 96, 96)

  const bins = []
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max > 230 && min > 210) continue
    if (max < 18) continue
    bins.push([r, g, b, max - min])
  }

  if (!bins.length) return { mean: [160, 36, 92], accent: [198, 150, 48], texture: cut }

  bins.sort((a, b) => b[3] - a[3])
  const vivid = bins.slice(0, Math.max(12, Math.floor(bins.length * 0.35)))
  const mean = vivid.reduce((sum, c) => [sum[0] + c[0], sum[1] + c[1], sum[2] + c[2]], [0, 0, 0])
    .map((v) => v / vivid.length)

  let accent = mean
  let best = -1
  for (const c of vivid) {
    const dist = colorDist(c, mean)
    if (dist > best) {
      best = dist
      accent = [c[0], c[1], c[2]]
    }
  }

  // The crop still contains studio background and the model's skin. Flatten
  // those to the garment mean so the texture only carries fabric variation.
  const texImage = cutCtx.getImageData(0, 0, 96, 96)
  const tex = texImage.data
  for (let i = 0; i < tex.length; i += 4) {
    const r = tex[i]
    const g = tex[i + 1]
    const b = tex[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const isBackdrop = (max > 226 && min > 205) || max < 20
    if (isBackdrop || isSkinTone(r, g, b) || colorDist([r, g, b], mean) > 190) {
      tex[i] = mean[0]
      tex[i + 1] = mean[1]
      tex[i + 2] = mean[2]
    }
  }
  cutCtx.putImageData(texImage, 0, 0)

  return { mean, accent, texture: cut }
}

function garmentBand(category) {
  const key = String(category || '').toLowerCase()
  if (key.includes('jean')) return { top: 0.46, bottom: 0.98 }
  if (key.includes('blazer')) return { top: 0.20, bottom: 0.72 }
  if (key.includes('top') || key === 'shirt') return { top: 0.20, bottom: 0.62 }
  if (key.includes('saree') || key.includes('kurti') || key.includes('anarkali') || key.includes('ethnic') || key.includes('suit')) {
    return { top: 0.20, bottom: 0.98 }
  }
  if (key.includes('dress') || key.includes('co-ord') || key.includes('coord')) {
    return { top: 0.20, bottom: 0.96 }
  }
  return { top: 0.22, bottom: 0.90 }
}

const CAT_BACKGROUND = 0
const CAT_HAIR = 1
const CAT_BODY_SKIN = 2
const CAT_FACE_SKIN = 3
const CAT_CLOTHES = 4

let segmenterPromise = null

async function loadVisionLib() {
  try {
    return await import('@mediapipe/tasks-vision')
  } catch {
    return import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm')
  }
}

async function getImageSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await loadVisionLib()
      const fileset = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
      )
      return vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
      })
    })().catch((error) => {
      segmenterPromise = null
      throw error
    })
  }
  return segmenterPromise
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('segmentation timeout')), ms)
    }),
  ])
}

async function segmentSelfie(canvas) {
  const segmenter = await getImageSegmenter()
  const result = segmenter.segment(canvas)
  const bytes = result.categoryMask.getAsUint8Array()
  result.categoryMask.close?.()
  return bytes
}

function clothesMaskFromLabels(labels, imageData, category) {
  const { width, height, data } = imageData
  const raw = new Float32Array(width * height)
  const band = garmentBand(category)
  let x0 = width
  let y0 = height
  let x1 = 0
  let y1 = 0
  let clothes = 0

  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i]
    if (label === CAT_BACKGROUND) continue
    const x = i % width
    const y = Math.floor(i / width)
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
    if (label === CAT_CLOTHES) clothes += 1
  }

  if (x1 <= x0 || y1 <= y0) {
    x0 = Math.floor(width * 0.16)
    y0 = Math.floor(height * 0.08)
    x1 = Math.floor(width * 0.84)
    y1 = Math.floor(height * 0.96)
  }

  const bodyH = y1 - y0
  const top = y0 + bodyH * band.top
  const bottom = y0 + bodyH * band.bottom
  const faceCut = y0 + bodyH * 0.18
  const useClothesOnly = clothes > labels.length * 0.02

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      const label = labels[i]
      if (label === CAT_FACE_SKIN || label === CAT_HAIR) continue
      if (y < faceCut) continue
      if (y < top || y > bottom) continue

      const pi = i * 4
      if (isSkinTone(data[pi], data[pi + 1], data[pi + 2]) && (label === CAT_BODY_SKIN || y < y0 + bodyH * 0.30)) {
        continue
      }

      if (useClothesOnly) {
        raw[i] = label === CAT_CLOTHES ? 1 : 0
      } else if (label !== CAT_BACKGROUND && label !== CAT_FACE_SKIN && label !== CAT_HAIR) {
        raw[i] = label === CAT_BODY_SKIN ? 0.15 : 0.9
      }
    }
  }

  return blurMask(raw, width, height, 4)
}

function clothesMaskHeuristic(imageData, category) {
  const { width, height, data } = imageData
  const bg = sampleBorder(data, width, height)
  const person = new Float32Array(width * height)
  let x0 = width
  let y0 = height
  let x1 = 0
  let y1 = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const pixel = [data[i], data[i + 1], data[i + 2]]
      let nearest = 999
      for (const sample of bg) nearest = Math.min(nearest, colorDist(pixel, sample))
      const score = nearest > 38 ? 1 : nearest > 24 ? (nearest - 24) / 14 : 0
      person[y * width + x] = score
      if (score < 0.4) continue
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
  }

  if (x1 <= x0 || y1 <= y0) {
    x0 = Math.floor(width * 0.16)
    y0 = Math.floor(height * 0.08)
    x1 = Math.floor(width * 0.84)
    y1 = Math.floor(height * 0.96)
  }

  const band = garmentBand(category)
  const bodyH = y1 - y0
  const top = y0 + bodyH * band.top
  const bottom = y0 + bodyH * band.bottom
  const faceCut = y0 + bodyH * 0.20
  const raw = new Float32Array(width * height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = person[y * width + x]
      if (p < 0.2) continue
      if (y < faceCut || y < top || y > bottom) continue
      const i = (y * width + x) * 4
      if (isSkinTone(data[i], data[i + 1], data[i + 2])) continue
      raw[y * width + x] = p
    }
  }

  return blurMask(raw, width, height, 5)
}

function applyCostume(imageData, mask, palette) {
  const { width, height, data } = imageData
  const { mean, accent, texture } = palette
  const tw = texture.width
  const th = texture.height
  const tex = texture.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, tw, th).data

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const m = mask[y * width + x]
      if (m < 0.06) continue

      const i = (y * width + x) * 4
      const ur = data[i]
      const ug = data[i + 1]
      const ub = data[i + 2]
      const userLum = 0.299 * ur + 0.587 * ug + 0.114 * ub

      const sx = Math.floor((x / width) * tw)
      const sy = Math.floor((y / height) * th)
      const si = (sy * tw + sx) * 4
      const tr = tex[si]
      const tg = tex[si + 1]
      const tb = tex[si + 2]
      const edge = m > 0.78 ? mean : accent
      const gr = tr * 0.4 + edge[0] * 0.6
      const gg = tg * 0.4 + edge[1] * 0.6
      const gb = tb * 0.4 + edge[2] * 0.6
      const gLum = Math.max(18, 0.299 * gr + 0.587 * gg + 0.114 * gb)
      const shade = clamp((userLum / gLum) * 0.92, 0.35, 1.45)

      const nr = clamp(gr * shade, 0, 255)
      const ng = clamp(gg * shade, 0, 255)
      const nb = clamp(gb * shade, 0, 255)
      const t = clamp(m, 0, 1) * 0.94

      data[i] = Math.round(ur * (1 - t) + nr * t)
      data[i + 1] = Math.round(ug * (1 - t) + ng * t)
      data[i + 2] = Math.round(ub * (1 - t) + nb * t)
    }
  }
}

async function loadProductImage(productId, productUrl) {
  const sources = [productImageSrc(productId, productUrl), productUrl].filter(Boolean)
  for (const src of sources) {
    try {
      return await loadImage(src, true)
    } catch {
      /* try next */
    }
  }
  return loadImage(productUrl, false)
}

export async function generateLookOverlay({ userSrc, productId, productUrl, category }) {
  const user = await loadImage(userSrc, false)
  const scale = Math.min(720 / user.naturalWidth, 960 / user.naturalHeight, 1)
  const width = Math.max(160, Math.round(user.naturalWidth * scale))
  const height = Math.max(160, Math.round(user.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(user, 0, 0, width, height)

  const product = await loadProductImage(productId, productUrl)
  const palette = extractGarmentPalette(product)
  const userPixels = ctx.getImageData(0, 0, width, height)

  let mask
  try {
    const labels = await withTimeout(segmentSelfie(canvas), 14000)
    mask = clothesMaskFromLabels(labels, userPixels, category)
  } catch {
    mask = clothesMaskHeuristic(userPixels, category)
  }

  applyCostume(userPixels, mask, palette)
  ctx.putImageData(userPixels, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export const overlayBox = () => ({ top: 0, height: 1, width: 1 })
