import React, { useEffect, useRef, useState } from 'react'

function overlayBox(category) {
  const key = String(category || '').toLowerCase()
  if (key.includes('jean')) return { top: 0.46, height: 0.50, width: 0.56 }
  if (key.includes('blazer')) return { top: 0.13, height: 0.52, width: 0.60 }
  if (key.includes('top') || key === 'shirt') return { top: 0.15, height: 0.44, width: 0.56 }
  if (key.includes('saree') || key.includes('ethnic') || key.includes('kurti') || key.includes('anarkali') || key.includes('suit')) {
    return { top: 0.10, height: 0.82, width: 0.70 }
  }
  if (key.includes('dress') || key.includes('co-ord') || key.includes('coord')) {
    return { top: 0.12, height: 0.76, width: 0.62 }
  }
  return { top: 0.16, height: 0.66, width: 0.60 }
}

function loadImage(src, withCors) {
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
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const nearWhite = r > 228 && g > 228 && b > 228
    const paleGray = max > 210 && max - min < 18
    if (nearWhite || paleGray) data[i + 3] = 0
    else if (r > 200 && g > 200 && b > 200) data[i + 3] = Math.round(data[i + 3] * 0.35)
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

async function composeLook(userSrc, productSrc, category) {
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

  try {
    const product = await loadImage(productSrc, true)
    const cutout = punchStudioBackground(product)
    const box = overlayBox(category)
    const dw = width * box.width
    const dh = height * box.height
    const dx = (width - dw) / 2
    const dy = height * box.top
    ctx.save()
    ctx.globalAlpha = 0.94
    ctx.drawImage(cutout, dx, dy, dw, dh)
    ctx.restore()
  } catch {
    // CORS or load failure: keep the shopper photo; CSS overlay is the fallback.
    return null
  }

  return canvas.toDataURL('image/jpeg', 0.86)
}

export default function StyleLookPreview({ userSrc, productSrc, productName, category }) {
  const [composed, setComposed] = useState(null)
  const [fallback, setFallback] = useState(false)
  const [userFailed, setUserFailed] = useState(false)
  const runId = useRef(0)
  const box = overlayBox(category)

  useEffect(() => {
    if (!userSrc || !productSrc) return undefined
    const id = runId.current + 1
    runId.current = id
    setComposed(null)
    setFallback(false)

    composeLook(userSrc, productSrc, category)
      .then((dataUrl) => {
        if (runId.current !== id) return
        if (dataUrl) setComposed(dataUrl)
        else setFallback(true)
      })
      .catch(() => {
        if (runId.current === id) setFallback(true)
      })

    return () => { runId.current = id }
  }, [userSrc, productSrc, category])

  if (!userSrc || userFailed) {
    return (
      <div className="w-full aspect-[3/4] max-h-72 bg-shell flex items-center justify-center text-sm text-muted">
        Upload a photo to see this look.
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[3/4] max-h-80 mx-auto overflow-hidden bg-[#111]">
        {composed ? (
          <img src={composed} alt={`${productName} on your photo`} className="w-full h-full object-cover" />
        ) : (
          <>
            <img
              src={userSrc}
              alt="Your uploaded photo"
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setUserFailed(true)}
            />
            {fallback && (
              <img
                src={productSrc}
                alt={productName || 'Selected item'}
                className="absolute left-1/2 -translate-x-1/2 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
                style={{
                  top: `${box.top * 100}%`,
                  height: `${box.height * 100}%`,
                  width: `${box.width * 100}%`,
                  opacity: 0.88,
                }}
              />
            )}
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white">
            {productName} on your photo
          </p>
          <p className="text-[10px] text-white/80">
            Visual overlay — not a generated try-on or a guarantee of fit
          </p>
        </div>
      </div>
    </div>
  )
}
