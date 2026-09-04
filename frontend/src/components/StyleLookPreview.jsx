import React, { useEffect, useRef, useState } from 'react'
import { generateLookOverlay, overlayBox, productImageSrc } from '../utils/composeLook.js'

export default function StyleLookPreview({
  userSrc,
  productId,
  productSrc,
  productName,
  category,
  generatedSrc,
  onGenerated,
}) {
  const [composed, setComposed] = useState(generatedSrc || null)
  const [busy, setBusy] = useState(!generatedSrc)
  const [userFailed, setUserFailed] = useState(false)
  const runId = useRef(0)
  const box = overlayBox(category)

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
            <img
              src={productImageSrc(productId, productSrc)}
              alt={productName || 'Selected item'}
              className="absolute left-1/2 -translate-x-1/2 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
              style={{
                top: `${box.top * 100}%`,
                height: `${box.height * 100}%`,
                width: `${box.width * 100}%`,
              }}
            />
          </>
        )}
        {busy && !composed && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
            <p className="text-white text-[12px] font-semibold">Generating look overlay…</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white">
            {productName} on your photo
          </p>
          <p className="text-[10px] text-white/80">
            Generated visual overlay — not a photoreal try-on or fit guarantee
          </p>
        </div>
      </div>
    </div>
  )
}
