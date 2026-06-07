'use strict';

const PRODUCT_NAME_MAX_LENGTH = 140;
const PRODUCT_DESCRIPTION_MAX_LENGTH = 2000;

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim();
}

function removeLeadingLabel(text) {
  const label = /^(?:product\s*name|product\s*title|name|title|description|product\s*description)\s*[:\-\u2013\u2014]\s*/i;
  let next = text;
  for (let i = 0; i < 3 && label.test(next); i += 1) {
    next = next.replace(label, '').trim();
  }
  return next;
}

function stripMarkdownLine(line) {
  return removeLeadingLabel(String(line || '')
    .replace(/^\s{0,8}(?:#{1,6}\s+|>\s*)/, '')
    .replace(/^\s{0,8}(?:[-+*]\s+|\d+[.)]\s+)/, '')
    .replace(/[*_`]+/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim());
}

function sanitizeProductName(value) {
  const text = stripMarkdownLine(normalizeText(value).split('\n')[0] || '');
  return text.slice(0, PRODUCT_NAME_MAX_LENGTH).trim();
}

function sanitizeProductDescription(value) {
  const text = normalizeText(value);
  if (!text) return '';

  const lines = text
    .split('\n')
    .map(stripMarkdownLine)
    .filter(Boolean);

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, PRODUCT_DESCRIPTION_MAX_LENGTH)
    .trim();
}

function sanitizeProductPayload(product = {}) {
  if (!product || typeof product !== 'object') return product;
  const next = { ...product };
  if (Object.prototype.hasOwnProperty.call(next, 'name')) {
    next.name = sanitizeProductName(next.name);
  }
  if (Object.prototype.hasOwnProperty.call(next, 'description')) {
    next.description = sanitizeProductDescription(next.description);
  }
  return next;
}

module.exports = {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  sanitizeProductName,
  sanitizeProductDescription,
  sanitizeProductPayload,
};
