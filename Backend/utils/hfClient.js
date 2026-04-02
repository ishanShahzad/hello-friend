// Hugging Face API client for AI features
const fetch = require('node-fetch');

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_API_URL = 'https://api-inference.huggingface.co/models/';

/**
 * Call Hugging Face API
 * @param {string} model - Model name (e.g., 'facebook/bart-large-mnli')
 * @param {object} payload - Request payload
 * @returns {Promise<any>} API response
 */
exports.callHF = async (model, payload) => {
  if (!HF_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY is not configured');
  }

  try {
    const response = await fetch(`${HF_API_URL}${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HF API error: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Hugging Face API call failed:', error);
    throw error;
  }
};
