const Groq = require('groq-sdk');
const { buildSystemPrompt, buildUserPrompt } = require('./stylePrompt');

let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      throw Object.assign(new Error('GROQ_API_KEY is not configured. Please add it to your .env file.'), {
        code: 'GROQ_API_ERROR',
      });
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 45000,
    });
  }
  return groqClient;
}

function getVisionModel() {
  return process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
}

function extractJson(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Empty AI content');
  }

  let text = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object in AI response');
  }

  return JSON.parse(text.slice(start, end + 1));
}

function validateAnalysisResponse(data) {
  const requiredFields = [
    'overall_score', 'verdict', 'why_it_works', 'styling_suggestions',
    'best_occasions', 'matching_colors', 'accessories', 'confidence_gaps',
    'purchase_recommendation', 'size_guidance', 'disclaimer',
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw Object.assign(new Error(`AI response missing required field: ${field}`), {
        code: 'VALIDATION_ERROR',
      });
    }
  }

  if (typeof data.overall_score !== 'number' || data.overall_score < 0 || data.overall_score > 100) {
    data.overall_score = Math.max(0, Math.min(100, parseInt(data.overall_score, 10) || 75));
  } else {
    data.overall_score = Math.round(data.overall_score);
  }

  const arrayFields = ['why_it_works', 'styling_suggestions', 'best_occasions', 'matching_colors', 'accessories', 'confidence_gaps'];
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      data[field] = [String(data[field])];
    }
    data[field] = data[field].map((item) => String(item));
  }

  data.verdict = String(data.verdict);
  data.purchase_recommendation = String(data.purchase_recommendation);
  data.size_guidance = String(data.size_guidance);
  data.disclaimer = String(data.disclaimer) || 'AI-generated style guidance; not a guarantee of fit or appearance.';

  const insufficient = /unable to confidently analyze the image/i.test(data.verdict)
    || data.confidence_gaps.some((item) => /unable to confidently analyze the image/i.test(item));
  if (insufficient && !data.confidence_gaps.some((item) => /unable to confidently analyze the image/i.test(item))) {
    data.confidence_gaps = ['Unable to confidently analyze the image.', ...data.confidence_gaps].slice(0, 2);
  }

  return data;
}

function mapGroqError(err) {
  if (err.code === 'GROQ_API_ERROR' || err.code === 'VALIDATION_ERROR' || err.code === 'GROQ_TIMEOUT' || err.code === 'GROQ_RATE_LIMIT') {
    return err;
  }

  const status = err.status || err.statusCode;
  const message = (err.message || '').toLowerCase();

  if (status === 429 || message.includes('rate limit')) {
    return Object.assign(new Error('AI rate limit reached'), { code: 'GROQ_RATE_LIMIT' });
  }
  if (err.name === 'AbortError' || err.name === 'APIConnectionTimeoutError' || message.includes('timeout')) {
    return Object.assign(new Error('AI request timed out'), { code: 'GROQ_TIMEOUT' });
  }

  console.error('[Groq Error]', err.message);
  return Object.assign(new Error('AI service error'), { code: 'GROQ_API_ERROR' });
}

async function analyzeStyle({ userImageBase64, userImageMimeType, productImageUrl, productImageBase64, product }) {
  const client = getGroqClient();
  const startTime = Date.now();
  const userDataUrl = `data:${userImageMimeType};base64,${userImageBase64}`;

  const content = [
    { type: 'text', text: buildUserPrompt(product) },
    { type: 'image_url', image_url: { url: userDataUrl } },
  ];

  if (productImageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${productImageBase64}` },
    });
  } else if (productImageUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: productImageUrl },
    });
  }

  let rawContent;
  try {
    const response = await client.chat.completions.create({
      model: getVisionModel(),
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content },
      ],
      temperature: 0.3,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
    });

    rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw Object.assign(new Error('Empty response from AI'), { code: 'GROQ_API_ERROR' });
    }
  } catch (err) {
    throw mapGroqError(err);
  }

  const latencyMs = Date.now() - startTime;

  let parsed;
  try {
    parsed = extractJson(rawContent);
  } catch (e) {
    console.error('[JSON Parse Error] AI returned unparseable content');
    throw Object.assign(new Error('AI returned invalid JSON. Please try again.'), { code: 'GROQ_API_ERROR' });
  }

  const validated = validateAnalysisResponse(parsed);
  return { result: validated, latencyMs };
}

module.exports = { analyzeStyle, getVisionModel, buildSystemPrompt, buildUserPrompt };
