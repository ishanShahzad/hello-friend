'use strict';

const axios = require('axios');

const baseUrl = () => String(process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const apiKey = () => process.env.EVOLUTION_API_KEY || '';

function isConfigured() {
  return Boolean(baseUrl() && apiKey());
}

function extractBase64Payload(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;

  return (
    data.base64 ||
    (typeof data.data === 'string' ? data.data : '') ||
    data.data?.base64 ||
    data.media?.base64 ||
    data.message?.base64 ||
    (typeof data.result === 'string' ? data.result : '') ||
    data.result?.base64 ||
    data.file?.base64 ||
    data.buffer ||
    ''
  );
}

function decodeBase64Payload(value = '') {
  const raw = String(value || '')
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s/g, '');
  if (!raw || raw.length < 8) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(raw)) return null;
  return Buffer.from(raw, 'base64');
}

async function getMediaFromMessage({ instanceName, messageKey, messageId, convertToMp4 = false } = {}) {
  if (!isConfigured()) throw new Error('Evolution API is not configured.');
  const instance = String(instanceName || '').trim();
  const key = messageKey && typeof messageKey === 'object'
    ? messageKey
    : { id: messageId || messageKey };
  if (!instance) throw new Error('Evolution instance name is required to download media.');
  if (!key?.id) throw new Error('WhatsApp media message id is required.');

  const { data } = await axios.post(
    `${baseUrl()}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`,
    {
      message: { key },
      convertToMp4: Boolean(convertToMp4),
    },
    {
      timeout: 30000,
      headers: {
        apikey: apiKey(),
        'Content-Type': 'application/json',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  const buffer = decodeBase64Payload(extractBase64Payload(data));
  if (!buffer) throw new Error('Evolution returned no media bytes.');

  return {
    buffer,
    mimetype: data?.mimetype || data?.media?.mimetype || data?.message?.mimetype || '',
    raw: data,
  };
}

module.exports = {
  getMediaFromMessage,
  __private: {
    extractBase64Payload,
    decodeBase64Payload,
  },
};
