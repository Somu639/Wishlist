require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { initializeDatabase } = require('./db/database');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const wishlistRouter = require('./routes/wishlist');
const cartRouter = require('./routes/cart');
const analyzeStyleRouter = require('./routes/analyzeStyle');
const analyticsRouter = require('./routes/analytics');
const { getAIProvider } = require('./providers');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// --- CORS ---
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...extraOrigins,
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith('.vercel.app') || host === 'vercel.app';
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// --- Body parsing ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- General rate limiting ---
app.use('/api', generalLimiter);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Myntra AI Wishlist Backend',
    timestamp: new Date().toISOString(),
    ai: getAIProvider().capabilities(),
  });
});

// --- API Routes ---
app.use('/api/wishlist', wishlistRouter);
app.use('/api/cart', cartRouter);
app.use('/api/analyze-style', analyzeStyleRouter);
app.use('/api/analytics', analyticsRouter);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// --- Global error handler (must be last) ---
app.use(errorHandler);

// --- Start ---
initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Myntra AI Wishlist Backend running on http://0.0.0.0:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Wishlist: http://localhost:${PORT}/api/wishlist`);
  console.log(`   Analyze: POST http://localhost:${PORT}/api/analyze-style`);
  const caps = getAIProvider().capabilities();
  console.log(`   Try-on provider: ${caps.virtual_try_on.provider} (${caps.virtual_try_on.enabled ? 'enabled' : 'unavailable — fallback to AI Style Recommendation'})`);
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    console.warn('\n⚠️  WARNING: GROQ_API_KEY is not set in .env — AI analysis will not work until configured.\n');
  } else {
    const model = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
    console.log(`\n✅ Groq API key detected. Vision model: ${model}\n`);
  }
});

module.exports = app;
