import { personBounds, segmentSelfie } from './composeLook.js'

const MAX_EDGE = 768
const QUALITY = 0.78

// The try-on model's native canvas. It works from a larger source so that
// cropping in on the shopper does not leave the figure soft.
const TRY_ON_WIDTH = 768
const TRY_ON_HEIGHT = 1024
const TRY_ON_ASPECT = TRY_ON_WIDTH / TRY_ON_HEIGHT
const TRY_ON_SOURCE_EDGE = 1280
const FRAME_PADDING = 0.08
const MIN_COVERAGE = 0.01
const SEGMENT_TIMEOUT_MS = 14000

async function fileToCanvas(file, maxEdge) {
  const bitmap = await loadBitmap(file)
  const sourceWidth = bitmap.naturalWidth || bitmap.width
  const sourceHeight = bitmap.naturalHeight || bitmap.height
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  if (bitmap.close) bitmap.close()
  return canvas
}

const canvasToBase64 = (canvas) => canvas.toDataURL('image/jpeg', QUALITY).split(',')[1]

/**
 * Serverless request bodies are capped a few MB, so the photo is downscaled in
 * the browser before it is sent for analysis.
 */
export async function fileToResizedBase64(file) {
  return canvasToBase64(await fileToCanvas(file, MAX_EDGE))
}

/**
 * Frames the shopper for try-on. The model stretches whatever it is given onto
 * a 3:4 canvas, so a phone screenshot arrives squashed with the shopper lost
 * among status bars and app chrome. Locating the person first lets the crop
 * grow toward 3:4 while the photo has room to give, and whatever is still
 * missing is padded rather than taken out of the figure.
 */
export async function fileToTryOnBase64(file) {
  const source = await fileToCanvas(file, TRY_ON_SOURCE_EDGE)
  const frame = await personFrame(source).catch(() => null)
  if (!frame) return canvasToBase64(await fileToCanvas(file, MAX_EDGE))

  const canvas = document.createElement('canvas')
  canvas.width = TRY_ON_WIDTH
  canvas.height = TRY_ON_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = averageColor(source, frame)
  ctx.fillRect(0, 0, TRY_ON_WIDTH, TRY_ON_HEIGHT)

  const scale = Math.min(TRY_ON_WIDTH / frame.width, TRY_ON_HEIGHT / frame.height)
  const drawWidth = frame.width * scale
  const drawHeight = frame.height * scale
  ctx.drawImage(
    source,
    frame.x, frame.y, frame.width, frame.height,
    (TRY_ON_WIDTH - drawWidth) / 2, (TRY_ON_HEIGHT - drawHeight) / 2, drawWidth, drawHeight,
  )

  return canvasToBase64(canvas)
}

async function personFrame(canvas) {
  const labels = await Promise.race([
    segmentSelfie(canvas),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('segmentation timeout')), SEGMENT_TIMEOUT_MS)
    }),
  ])

  const bounds = personBounds(labels, canvas.width, canvas.height)
  if (!bounds || bounds.coverage < MIN_COVERAGE) return null

  let { x, y, width, height } = bounds
  const padX = width * FRAME_PADDING
  const padY = height * FRAME_PADDING
  x -= padX
  y -= padY
  width += padX * 2
  height += padY * 2

  // Only ever grow toward 3:4, so squaring up the frame cannot clip the figure.
  if (width / height < TRY_ON_ASPECT) {
    const target = Math.max(width, Math.min(canvas.width, height * TRY_ON_ASPECT))
    x -= (target - width) / 2
    width = target
  } else {
    const target = Math.max(height, Math.min(canvas.height, width / TRY_ON_ASPECT))
    y -= (target - height) / 2
    height = target
  }

  width = Math.round(Math.min(width, canvas.width))
  height = Math.round(Math.min(height, canvas.height))
  return {
    x: Math.round(Math.max(0, Math.min(x, canvas.width - width))),
    y: Math.round(Math.max(0, Math.min(y, canvas.height - height))),
    width,
    height,
  }
}

/** Mean colour of the crop, so any padding reads as part of the photo. */
function averageColor(canvas, frame) {
  const swatch = document.createElement('canvas')
  swatch.width = 1
  swatch.height = 1
  const ctx = swatch.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(canvas, frame.x, frame.y, frame.width, frame.height, 0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await window.createImageBitmap(file)
    } catch {
      // Fall through to the <img> decoder below.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read this image.'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
