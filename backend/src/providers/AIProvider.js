/**
 * V2 AI provider layer
 *
 * GroqStyleAnalyzer  → product understanding, intent, styling, JSON recs
 * VirtualTryOnProvider → dedicated image generation (never Groq)
 *
 * The frontend consumes a stable envelope from AIProvider.preview().
 * Swapping VTON vendors happens here only.
 */

const { GroqStyleAnalyzer } = require('./GroqStyleAnalyzer');
const { createVirtualTryOnProvider } = require('./VirtualTryOnProvider');

const EXPERIENCE = {
  STYLE_RECOMMENDATION: 'ai_style_recommendation',
  VIRTUAL_TRY_ON: 'virtual_try_on',
};

class AIProvider {
  constructor({ styleAnalyzer, tryOnProvider } = {}) {
    this.styleAnalyzer = styleAnalyzer || new GroqStyleAnalyzer();
    this.tryOnProvider = tryOnProvider || createVirtualTryOnProvider();
  }

  capabilities() {
    return {
      style_analyzer: this.styleAnalyzer.name,
      style_analyzer_role: [
        'product_understanding',
        'user_intent',
        'styling_reasoning',
        'recommendation_generation',
      ],
      virtual_try_on: {
        provider: this.tryOnProvider.name,
        enabled: this.tryOnProvider.isEnabled(),
        generates_image: this.tryOnProvider.isEnabled(),
      },
      groq_generates_tryon_image: false,
    };
  }

  async preview({
    userImageBase64,
    userImageMimeType,
    productImageUrl,
    productImageBase64,
    product,
  }) {
    const stylePromise = this.styleAnalyzer.analyze({
      userImageBase64,
      userImageMimeType,
      productImageUrl,
      productImageBase64,
      product,
    });

    const tryOnPromise = Promise.resolve()
      .then(() => this.tryOnProvider.generate({
        user_image: userImageBase64,
        product_image: productImageBase64 || null,
        product_image_url: productImageUrl || null,
        product_metadata: {
          product_id: product.product_id,
          product_name: product.product_name,
          brand: product.brand,
          category: product.category,
          color: product.color,
          material: product.material,
          available_sizes: product.available_sizes,
          occasion: product.occasion,
          style_tags: product.style_tags,
        },
      }))
      .catch((err) => {
        console.error('[VirtualTryOn] unhandled', err.message);
        return {
          generated_tryon_image: null,
          confidence: null,
          processing_status: 'failed',
          provider: this.tryOnProvider.name,
        };
      });

    const [styleResult, tryOnRaw] = await Promise.all([stylePromise, tryOnPromise]);
    const tryOn = normalizeTryOn(tryOnRaw);
    const hasImage = Boolean(tryOn.generated_tryon_image);

    return {
      analysis: styleResult.result,
      latency_ms: styleResult.latencyMs,
      try_on: tryOn,
      experience_mode: hasImage ? EXPERIENCE.VIRTUAL_TRY_ON : EXPERIENCE.STYLE_RECOMMENDATION,
      experience_label: hasImage ? 'Virtual Try-On' : 'AI Style Recommendation',
    };
  }
}

function normalizeTryOn(raw = {}) {
  const status = raw.processing_status || 'unavailable';
  const ok = status === 'completed' && raw.generated_tryon_image;
  return {
    generated_tryon_image: ok ? raw.generated_tryon_image : null,
    confidence: ok ? (typeof raw.confidence === 'number' ? raw.confidence : null) : null,
    processing_status: ok ? 'completed' : (status === 'failed' ? 'failed' : 'unavailable'),
    provider: raw.provider || 'none',
  };
}

function createAIProvider() {
  return new AIProvider({
    styleAnalyzer: new GroqStyleAnalyzer(),
    tryOnProvider: createVirtualTryOnProvider(),
  });
}

module.exports = { AIProvider, createAIProvider, EXPERIENCE };
