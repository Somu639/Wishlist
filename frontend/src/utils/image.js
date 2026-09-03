const MAX_EDGE = 1024
const QUALITY = 0.82

/**
 * Serverless request bodies are capped a few MB, so the photo is downscaled in
 * the browser before it is sent for analysis.
 */
export async function fileToResizedBase64(file) {
  const bitmap = await loadBitmap(file)
  const sourceWidth = bitmap.naturalWidth || bitmap.width
  const sourceHeight = bitmap.naturalHeight || bitmap.height
  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  if (bitmap.close) bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  return dataUrl.split(',')[1]
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
