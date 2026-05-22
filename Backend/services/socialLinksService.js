'use strict';

const SOCIAL_KEYS = ['website', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];

const stripTrackingWhitespace = (value) => String(value || '').trim();

const ensureHttps = (value) => {
  const text = stripTrackingWhitespace(value);
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text.replace(/^\/+/, '')}`;
};

const stripHandle = (value) =>
  stripTrackingWhitespace(value)
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

const normalizePlatformPath = (value, hosts) => {
  const text = stripTrackingWhitespace(value);
  if (!text) return '';
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hosts.includes(host)) {
      return `${url.protocol}//${url.hostname}${url.pathname}`.replace(/\/+$/, '');
    }
  } catch (_) {}
  return '';
};

const normalizeSocialProfile = (platform, value) => {
  const text = stripTrackingWhitespace(value);
  if (!text) return '';

  if (platform === 'website') return ensureHttps(text);

  const hosts = {
    facebook: ['facebook.com', 'fb.com'],
    instagram: ['instagram.com'],
    twitter: ['twitter.com', 'x.com'],
    youtube: ['youtube.com', 'youtu.be'],
    tiktok: ['tiktok.com'],
  }[platform] || [];

  const pastedProfile = normalizePlatformPath(text, hosts);
  if (pastedProfile) return pastedProfile;

  const handle = stripHandle(text)
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0];

  if (!handle) return '';

  switch (platform) {
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'twitter':
      return `https://x.com/${handle}`;
    case 'youtube':
      if (/^(channel|c|user)\//i.test(text)) return `https://youtube.com/${text.replace(/^\/+/, '')}`;
      return `https://youtube.com/@${handle.replace(/^@/, '')}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${handle.replace(/^@/, '')}`;
    default:
      return '';
  }
};

const normalizeSocialLinks = (socialLinks = {}) => {
  const normalized = {};
  for (const key of SOCIAL_KEYS) {
    normalized[key] = normalizeSocialProfile(key, socialLinks?.[key]);
  }
  return normalized;
};

module.exports = {
  normalizeSocialLinks,
  normalizeSocialProfile,
};
