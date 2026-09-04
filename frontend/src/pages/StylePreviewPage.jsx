import React, { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Camera, Sparkles, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeStyle, generateTryOn, trackEvent } from '../api/client.js'
import StyleResultsPanel from '../components/StyleResultsPanel.jsx'
import { formatInr } from '../utils/format.js'
import { generateLookOverlay } from '../utils/composeLook.js'

const MAX_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }

const LOADING_MESSAGES = [
  'Analyzing your style...',
  'Checking color compatibility...',
  'Fitting the outfit onto your photo...',
  'Building personalized styling suggestions...',
  'Still working — waiting for a free AI slot...',
]

export default function StylePreviewModal({ product, onClose, onCartUpdated }) {
  const [photo, setPhoto] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [reconsider, setReconsider] = useState(null)
  const [lookImage, setLookImage] = useState(null)
  const [lookKind, setLookKind] = useState('preview')
  const [experienceLabel, setExperienceLabel] = useState('AI Style Recommendation')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const [error, setError] = useState(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, loading])

  useEffect(() => {
    if (!loading) {
      setLoadingMessage(LOADING_MESSAGES[0])
      return undefined
    }
    let index = 0
    const id = window.setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length
      setLoadingMessage(LOADING_MESSAGES[index])
    }, 2200)
    return () => window.clearInterval(id)
  }, [loading])

  const onDrop = useCallback((accepted, rejected) => {
    setError(null)
    if (rejected.length > 0) {
      const code = rejected[0].errors[0]?.code
      if (code === 'file-too-large') setError('Photo is too large. Maximum size is 10MB.')
      else if (code === 'file-invalid-type') setError('Please upload a JPG, PNG, or WEBP image.')
      else setError('Could not accept this file. Please try another image.')
      return
    }
    if (accepted.length > 0) {
      const file = accepted[0]
      setPhoto((prev) => {
        if (prev?.preview) URL.revokeObjectURL(prev.preview)
        return { file, preview: URL.createObjectURL(file) }
      })
      setAnalysisResult(null)
      setReconsider(null)
      setLookImage(null)
      setLookKind('preview')
      setExperienceLabel('AI Style Recommendation')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
  })

  async function handleAnalyze() {
    if (!photo) {
      setError('Upload a photo to get your style recommendation.')
      return
    }

    setLoading(true)
    setError(null)
    setLoadingMessage(LOADING_MESSAGES[0])

    // Photoreal try-on and the browser-side style preview run alongside the
    // written analysis; whichever try-on succeeds is what the shopper sees.
    const tryOnPromise = generateTryOn({ file: photo.file, productId: product.product_id })
    const previewPromise = generateLookOverlay({
      userSrc: photo.preview,
      productId: product.product_id,
      productUrl: product.image_url,
      category: product.category,
    }).catch(() => null)

    try {
      trackEvent('photo_uploaded', { product_id: product.product_id, product_category: product.category })
      trackEvent('try_on_started', { product_id: product.product_id, product_category: product.category })
      const data = await analyzeStyle({ file: photo.file, productId: product.product_id })
      const tryOnImage = await tryOnPromise
      const look = tryOnImage || await previewPromise
      setAnalysisResult(data.analysis)
      setReconsider(data.reconsider || null)
      setLookImage(look)
      setLookKind(tryOnImage ? 'tryon' : 'preview')
      setExperienceLabel(data.experience_label || 'AI Style Recommendation')
      trackEvent('ai_analysis_completed', {
        product_id: product.product_id,
        product_category: product.category,
        ai_score: data.analysis?.overall_score,
        try_on: tryOnImage ? 'photoreal' : 'style_preview',
      })
      trackEvent('style_recommendation_viewed', { product_id: product.product_id })
    } catch (err) {
      const msg = err.userMessage || 'AI analysis failed. Please try again.'
      setError(msg)
      trackEvent('ai_analysis_failed', { product_id: product.product_id })
      toast.error(msg, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  function handleResetPhoto() {
    if (photo?.preview) URL.revokeObjectURL(photo.preview)
    setPhoto(null)
    setAnalysisResult(null)
    setReconsider(null)
    setLookImage(null)
    setLookKind('preview')
    setExperienceLabel('AI Style Recommendation')
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close AI Style Preview"
        onClick={() => !loading && onClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-preview-title"
        className="relative w-full sm:max-w-[480px] sm:mx-4 bg-white sm:rounded-2xl shadow-2xl max-h-[100dvh] sm:max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="relative px-4 pt-5 pb-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          {!analysisResult && !loading && (
            <h2
              id="style-preview-title"
              className="text-center text-[13px] font-bold tracking-[0.22em] uppercase text-gray-900"
            >
              AI Style Preview
            </h2>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="min-h-[420px] flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="relative w-14 h-14">
                <span className="absolute inset-0 rounded-full border-2 border-[#ff3f6c]/20" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#ff3f6c] animate-spin" />
                <Sparkles size={16} className="absolute inset-0 m-auto text-[#ff3f6c]" />
              </div>
              <p className="mt-5 text-base font-semibold text-gray-900">{loadingMessage}</p>
            </div>
          ) : analysisResult ? (
            <div className="px-5 pb-6">
              <StyleResultsPanel
                product={product}
                analysis={analysisResult}
                reconsider={reconsider}
                userPhotoSrc={photo?.preview}
                lookImage={lookImage}
                lookKind={lookKind}
                experienceLabel={experienceLabel}
                onTryAnother={onClose}
                onCartUpdated={onCartUpdated}
              />
            </div>
          ) : (
            <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center">
              <p className="text-sm text-gray-500">Your saved item</p>

              <div className="mt-4 w-[168px] h-[210px] bg-[#f4f4f5] overflow-hidden">
                {!imgError ? (
                  <img
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">👗</div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">{product.product_name}</p>
              <p className="text-xs text-gray-500">{product.brand} · {formatInr(product.price)}</p>

              <p className="mt-6 text-[15px] italic text-gray-700 leading-relaxed max-w-xs">
                “See how this style could work for you”
              </p>

              {!photo ? (
                <div
                  {...getRootProps()}
                  className={`mt-6 w-full max-w-[280px] h-[140px] border border-gray-300 flex flex-col items-center justify-center cursor-pointer ${
                    isDragActive ? 'drop-active' : 'bg-white'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Camera size={22} className="text-gray-500" />
                  <p className="mt-2 text-[12px] font-bold tracking-[0.16em] uppercase text-gray-800">
                    Upload Photo
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">JPG, PNG, WEBP · Max 10MB</p>
                </div>
              ) : (
                <div className="mt-6 w-full max-w-[280px] relative border border-gray-200">
                  <img src={photo.preview} alt="Your uploaded photo" className="w-full max-h-48 object-contain bg-[#f4f4f5]" />
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="absolute top-2 right-2 bg-white text-[11px] font-semibold px-2.5 py-1 border border-gray-200"
                  >
                    Change
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 w-full max-w-[280px] flex items-start gap-2 text-left" role="alert">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!photo || loading}
                className="mt-6 w-full max-w-[280px] h-11 bg-[#ff3f6c] hover:bg-[#e63660] text-white text-[13px] font-bold tracking-[0.04em] uppercase disabled:opacity-40"
              >
                {error ? 'Try AI Style Again' : 'Get My AI Recommendation'}
              </button>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <Lock size={11} />
                Your photo is used only for analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
