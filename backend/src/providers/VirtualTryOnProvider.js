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

function createVirtualTryOnProvider() {
  const driver = (process.env.VTON_PROVIDER || 'none').toLowerCase();
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
  createVirtualTryOnProvider,
};
