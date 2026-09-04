import React, { useEffect, useRef, useState } from 'react'
import { generateLookOverlay } from '../utils/composeLook.js'

export default function StyleLookPreview({
  userSrc,
  productId,
  productSrc,
  productName,
  category,
  generatedSrc,
  lookKind = 'preview',
  tryOnNotice,
  onGenerated,
}) {
  const [composed, setComposed] = useState(generatedSrc || null)
  const [busy, setBusy] = useState(!generatedSrc)
  const [userFailed, setUserFailed] = useState(false)
  const runId = useRef(0)

  useEffect(() => {
    if (generatedSrc) {
      setComposed(generatedSrc)
      setBusy(false)
      return undefined
    }
    if (!userSrc || !productSrc) return undefined

    const id = runId.current + 1
    runId.current = id
    setBusy(true)
    setComposed(null)

    generateLookOverlay({
      userSrc,
      productId,
      productUrl: productSrc,
      category,
    })
      .then((dataUrl) => {
        if (runId.current !== id) return
        setComposed(dataUrl)
        setBusy(false)
        onGenerated?.(dataUrl)
      })
      .catch(() => {
        if (runId.current === id) setBusy(false)
      })

    return () => { runId.current = id }
  }, [userSrc, productId, productSrc, category, generatedSrc, onGenerated])

  if (!userSrc || userFailed) {
    return (
      <div className="w-full aspect-[3/4] max-h-72 bg-shell flex items-center justify-center text-sm text-muted">
        Upload a photo to see this look.
      </div>
    )
  }

  const isTryOn = lookKind === 'tryon' && Boolean(composed)

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[3/4] max-h-80 mx-auto overflow-hidden bg-[#111]">
        <img
          src={composed || userSrc}
          alt={composed ? `${productName} on your photo` : 'Your uploaded photo'}
          className="w-full h-full object-contain"
          onError={() => setUserFailed(true)}
        />
        {busy && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
            <p className="text-white text-[12px] font-semibold">Fitting the outfit onto your photo…</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white">
            {productName} on your photo
          </p>
          <p className="text-[10px] text-white/80">
            {isTryOn
              ? 'AI virtual try-on — an illustration, not a guarantee of fit'
              : "Style preview using this item's colors — not a photoreal try-on"}
          </p>
        </div>
      </div>
      {!isTryOn && tryOnNotice && (
        <p className="mt-2 text-[11px] leading-snug text-gray-500 text-left">{tryOnNotice}</p>
      )}
    </div>
  )
}
