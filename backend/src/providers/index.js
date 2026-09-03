const { createAIProvider } = require('./AIProvider');

let instance = null;

function getAIProvider() {
  if (!instance) instance = createAIProvider();
  return instance;
}

module.exports = { getAIProvider };
