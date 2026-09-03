const { getProduct } = require('./_catalog');
const { buildSystemPrompt, buildUserPrompt } = require('./_prompt');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const REQUIRED_FIELDS = [
  'overall_score',
  'verdict',
  'why_it_works',
  'styling_suggestions',
  'best_occasions',
  'matching_colors',
  'accessories',
  'confidence_gaps',
  'purchase_recommendation',
  'size_guidance',
  'disclaimer',
];

const LIST_FIELDS = [
  'why_it_works',
  'styling_suggestions',
  'best_occasions',
  'matching_colors',
  'accessories',
  'confidence_gaps',
];

function extractJson(raw) {
  const text = String(raw || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('No JSON object in AI response');
  }
  return JSON.parse(text.slice(start, end + 1));
}

function validate(data) {
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`AI response missing required field: ${field}`);
    }
  }

  const score = Number(data.overall_score);
  data.overall_score = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 75;

  for (const field of LIST_FIELDS) {
    const value = Array.isArray(data[field]) ? data[field] : [data[field]];
    data[field] = value.map((item) => String(item));
  }

  data.verdict = String(data.verdict);
  data.purchase_recommendation = String(data.purchase_recommendation);
  data.size_guidance = String(data.size_guidance);
  data.disclaimer = String(data.disclaimer)
    || 'AI-generated style guidance; not a guarantee of fit or appearance.';

  return data;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI Style is not configured. Add GROQ_API_KEY in the Vercel project environment variables.',
      code: 'GROQ_NOT_CONFIGURED',
    });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
  }

  const { product_id: productId, image_base64: imageBase64, image_mime: imageMime } = body;

  if (!productId || !imageBase64) {
    return res.status(400).json({
      error: 'product_id and image_base64 are required.',
      code: 'VALIDATION_ERROR',
    });
  }

  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({
      error: 'Photo is too large. Please use a smaller image.',
      code: 'IMAGE_TOO_LARGE',
    });
  }

  const mime = ALLOWED_MIME.has(imageMime) ? imageMime : 'image/jpeg';

  const product = getProduct(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const groqResponse = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',
        temperature: 0.3,
        max_tokens: 1600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildUserPrompt(product) },
              { type: 'image_url', image_url: { url: `data:${mime};base64,${imageBase64}` } },
              { type: 'image_url', image_url: { url: product.image_url } },
            ],
          },
        ],
      }),
    });

    if (groqResponse.status === 429) {
      return res.status(429).json({
        error: 'AI rate limit reached. Please wait a moment and try again.',
        code: 'GROQ_RATE_LIMIT',
      });
    }

    if (!groqResponse.ok) {
      const detail = await groqResponse.text();
      console.error('[Groq] HTTP', groqResponse.status, detail.slice(0, 400));
      return res.status(502).json({ error: 'AI service error. Please try again.', code: 'GROQ_API_ERROR' });
    }

    const payload = await groqResponse.json();
    const analysis = validate(extractJson(payload.choices?.[0]?.message?.content));

    return res.status(200).json({
      success: true,
      product: {
        product_id: product.product_id,
        product_name: product.product_name,
        brand: product.brand,
        price: product.price,
        image_url: product.image_url,
      },
      experience_mode: 'ai_style_recommendation',
      experience_label: 'AI Style Recommendation',
      try_on: { processing_status: 'not_requested', generated_tryon_image: null },
      analysis,
      latency_ms: Date.now() - startedAt,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out. Please try again.', code: 'GROQ_TIMEOUT' });
    }
    console.error('[Groq] ', err.message);
    return res.status(502).json({ error: 'AI service error. Please try again.', code: 'GROQ_API_ERROR' });
  } finally {
    clearTimeout(timer);
  }
};
