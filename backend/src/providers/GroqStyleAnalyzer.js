const { analyzeStyle, getVisionModel } = require('../services/groqService');

/**
 * Groq is the style brain only.
 * It must never be asked to generate a photoreal try-on image.
 */
class GroqStyleAnalyzer {
  constructor() {
    this.name = 'groq';
    this.model = getVisionModel();
  }

  async analyze(input) {
    return analyzeStyle(input);
  }
}

module.exports = { GroqStyleAnalyzer };
