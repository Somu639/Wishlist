/**
 * Virtual try-on / image-generation adapter.
 *
 * Contract:
 *   generate({ user_image, product_image, product_metadata })
 *     → { generated_tryon_image, confidence, processing_status, provider }
 *
 * processing_status: completed | unavailable | failed
 * generated_tryon_image: data URL or https URL, or null
 *
 * Add a new class and register it in createVirtualTryOnProvider() to swap vendors.
 */

const { runTryOn } = require('./falTryOn');

class UnavailableVirtualTryOnProvider {
  constructor() {
    this.name = 'none';
  }

  isEnabled() {
    return false;
  }

  async generate() {
    return {
      generated_tryon_image: null,
      confidence: null,
      processing_status: 'unavailable',
      provider: this.name,
      reason: 'not_configured',
    };
  }
}

class HttpVirtualTryOnProvider {
  constructor({ endpoint, apiKey, timeoutMs = 25000 } = {}) {
    this.name = process.env.VTON_PROVIDER_NAME || 'http';
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  isEnabled() {
    return Boolean(this.endpoint);
  }

  async generate({ user_image, product_image, product_image_url, product_metadata }) {
    if (!this.isEnabled()) {
      return new UnavailableVirtualTryOnProvider().generate();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          user_image,
          product_image: product_image || null,
          product_image_url: product_image_url || null,
          product_metadata,
        }),
      });

      if (!res.ok) {
        console.error('[VirtualTryOn] vendor HTTP', res.status);
        return {
          generated_tryon_image: null,
          confidence: null,
          processing_status: 'failed',
          provider: this.name,
        };
      }

      const data = await res.json();
      const image = data.generated_tryon_image || data.image_url || data.image || null;
      const status = data.processing_status || (image ? 'completed' : 'failed');

      return {
        generated_tryon_image: image,
        confidence: typeof data.confidence === 'number' ? data.confidence : null,
        processing_status: status,
        provider: this.name,
      };
    } catch (err) {
      console.error('[VirtualTryOn] vendor error', err.message);
      return {
        generated_tryon_image: null,
        confidence: null,
        processing_status: 'failed',
        provider: this.name,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Photoreal try-on through fal.ai (FASHN v1.6 by default). Takes the shopper
 * photo plus the catalog garment shot and returns the shopper wearing it.
 */
class FalVirtualTryOnProvider {
  constructor({ apiKey, model, timeoutMs = 55000 } = {}) {
    this.name = 'fal';
    this.apiKey = apiKey;
    this.model = model || 'fal-ai/fashn/tryon/v1.6';
    this.timeoutMs = timeoutMs;
  }

  isEnabled() {
    return Boolean(this.apiKey);
  }

  async generate({ user_image, product_image_url, product_metadata }) {
    if (!this.isEnabled()) {
      return new UnavailableVirtualTryOnProvider().generate();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await runTryOn({
        apiKey: this.apiKey,
        model: this.model,
        personDataUrl: user_image,
        garmentUrl: product_image_url,
        category: product_metadata?.category,
        signal: controller.signal,
      });

      return {
        generated_tryon_image: result.image_url,
        confidence: null,
        processing_status: result.processing_status,
        provider: this.name,
        reason: result.reason,
        detail: result.detail,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

function createVirtualTryOnProvider() {
  const configured = (process.env.VTON_PROVIDER || '').toLowerCase();
  const falKey = process.env.FAL_KEY;

  // An unset VTON_PROVIDER turns try-on on as soon as a FAL_KEY exists.
  const driver = configured || (falKey ? 'fal' : 'none');

  if (driver === 'fal' && falKey) {
    return new FalVirtualTryOnProvider({
      apiKey: falKey,
      model: process.env.VTON_MODEL,
    });
  }

  if (driver === 'http' && process.env.VTON_API_URL) {
    return new HttpVirtualTryOnProvider({
      endpoint: process.env.VTON_API_URL,
      apiKey: process.env.VTON_API_KEY,
    });
  }

  return new UnavailableVirtualTryOnProvider();
}

module.exports = {
  UnavailableVirtualTryOnProvider,
  HttpVirtualTryOnProvider,
  FalVirtualTryOnProvider,
  createVirtualTryOnProvider,
};
