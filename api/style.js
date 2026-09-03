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

function stripDataUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match ? match[1] : text;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function successPayload(product, analysis, startedAt) {
  return {
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
  };
}

async function callGroq({ apiKey, model, product, userDataUrl, includeProductImage, jsonMode, reasoning, signal }) {
  const content = [
    { type: 'text', text: buildUserPrompt(product) },
    { type: 'image_url', image_url: { url: userDataUrl } },
  ];
  if (includeProductImage && product.image_url) {
    content.push({ type: 'image_url', image_url: { url: product.image_url } });
  }

  const body = {
    model,
    temperature: 0.3,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content },
    ],
  };

  if (jsonMode) body.response_format = { type: 'json_object' };
  if (reasoning) {
    body.reasoning_effort = 'none';
    body.reasoning_format = 'hidden';
  }

  const groqResponse = await fetch(GROQ_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const detail = await groqResponse.text();
  let parsed = {};
  try {
    parsed = JSON.parse(detail);
  } catch {
    parsed = {};
  }

  return {
    ok: groqResponse.ok,
    status: groqResponse.status,
    parsed,
    detail,
    upstreamCode: parsed?.error?.code || parsed?.error?.type || '',
    failedGeneration: parsed?.error?.failed_generation || '',
    content: parsed?.choices?.[0]?.message?.content || '',
  };
}

function tryParseAnalysis(raw) {
  return validate(extractJson(raw));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

  const productId = body.product_id;
  const imageBase64 = stripDataUrl(body.image_base64);
  const imageMime = body.image_mime;

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

  const model = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  const userDataUrl = `data:${mime};base64,${imageBase64}`;

  const attempts = [
    { includeProductImage: true, jsonMode: true, reasoning: true },
    { includeProductImage: false, jsonMode: true, reasoning: true },
    { includeProductImage: true, jsonMode: false, reasoning: true },
    { includeProductImage: false, jsonMode: false, reasoning: false },
  ];

  try {
    let last = null;

    for (const attempt of attempts) {
      const result = await callGroq({
        apiKey,
        model,
        product,
        userDataUrl,
        signal: controller.signal,
        ...attempt,
      });
      last = result;

      if (result.status === 429) {
        return res.status(429).json({
          error: 'Too many shoppers are using AI Style right now. Wait a few seconds and try again.',
          code: 'GROQ_RATE_LIMIT',
        });
      }

      if (result.status === 401 || result.status === 403) {
        return res.status(502).json({
          error: 'Groq rejected the API key. Check GROQ_API_KEY in the Vercel environment variables.',
          code: 'GROQ_AUTH_FAILED',
        });
      }

      if (result.failedGeneration) {
        try {
          return res.status(200).json(successPayload(product, tryParseAnalysis(result.failedGeneration), startedAt));
        } catch {
          // Try the next request shape.
        }
      }

      if (result.ok && result.content) {
        try {
          return res.status(200).json(successPayload(product, tryParseAnalysis(result.content), startedAt));
        } catch (parseError) {
          console.error('[Groq] unusable content:', parseError.message);
        }
      }

      if (result.status === 404 || result.upstreamCode === 'model_not_found' || result.upstreamCode === 'model_decommissioned') {
        return res.status(502).json({
          error: `Vision model "${model}" is not available on this Groq account. Set GROQ_VISION_MODEL to a supported vision model.`,
          code: 'GROQ_MODEL_UNAVAILABLE',
        });
      }
    }

    return res.status(502).json({
      error: 'AI Style could not finish this photo. Try a clearer, well-lit full-outfit picture.',
      code: 'GROQ_API_ERROR',
      upstream_status: last?.status,
      upstream_code: last?.upstreamCode || undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out. Please try again.', code: 'GROQ_TIMEOUT' });
    }
    console.error('[Groq] ', err.message);
    return res.status(502).json({
      error: 'AI Style is temporarily unavailable. Please try again.',
      code: 'GROQ_API_ERROR',
      detail: err.message,
    });
  } finally {
    clearTimeout(timer);
  }
};
