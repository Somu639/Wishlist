const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again in a few minutes.',
    retryAfter: 15,
  },
});

// Stricter limiter for AI analysis endpoint (Groq calls are expensive)
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many style analysis requests. Please wait a moment before trying again.',
    retryAfter: 1,
  },
});

module.exports = { generalLimiter, analysisLimiter };
