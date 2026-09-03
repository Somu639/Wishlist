const multer = require('multer');

function errorHandler(err, req, res, next) {
  // Never log sensitive data
  const safeMessage = err.message || 'An unexpected error occurred';

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Image file is too large. Please upload an image under 10MB.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      error: 'File upload error: ' + err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  // Custom upload validation errors
  if (err.code === 'INVALID_IMAGE' || (err.message && err.message.startsWith('Unsupported file type'))) {
    return res.status(400).json({
      error: err.message,
      code: err.code || 'INVALID_FILE_TYPE',
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE',
    });
  }

  // Groq API errors
  if (err.code === 'GROQ_API_ERROR') {
    const isMissingKey = err.message && err.message.includes('GROQ_API_KEY');
    return res.status(502).json({
      error: isMissingKey
        ? 'AI analysis is not configured yet. Add GROQ_API_KEY to backend/.env and restart the server.'
        : 'AI service is temporarily unavailable. Please try again shortly.',
      code: 'AI_UNAVAILABLE',
    });
  }

  if (err.code === 'GROQ_TIMEOUT') {
    return res.status(504).json({
      error: 'AI analysis timed out. Please try again.',
      code: 'AI_TIMEOUT',
    });
  }

  if (err.code === 'GROQ_RATE_LIMIT') {
    return res.status(429).json({
      error: 'AI service is busy. Please wait a moment and try again.',
      code: 'AI_RATE_LIMIT',
    });
  }

  // Validation errors
  if (err.code === 'VALIDATION_ERROR') {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Invalid JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body.',
      code: 'INVALID_JSON',
    });
  }

  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.message && err.message.includes('JSON'))) {
    return res.status(400).json({
      error: 'Invalid JSON in request body.',
      code: 'INVALID_JSON',
    });
  }

  // Default server error — don't leak internals
  console.error('[Server Error]', err.stack || err.message);
  return res.status(500).json({
    error: 'Something went wrong on our end. Please try again.',
    code: 'SERVER_ERROR',
  });
}

module.exports = { errorHandler };
