const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Store = require('../models/Store');
const { publicProductFilter } = require('../services/productModerationService');

const BASE_URL = process.env.FRONTEND_URL?.replace(/\/$/, '') || 'https://rozare.com';

const escapeXml = (str = '') =>
  String(str).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c]));

const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';

// Dynamic products sitemap
router.get('/sitemap-products.xml', async (req, res) => {
  try {
    const products = await Product.find(publicProductFilter({ stock: { $gt: 0 } }))
      .select('_id updatedAt image name')
      .lean()
      .limit(50000);

    const urls = products.map((p) => {
      const lastmod = (p.updatedAt || new Date()).toISOString().split('T')[0];
      return `  <url>
    <loc>${BASE_URL}/single-product/${p._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${p.image ? `
    <image:image>
      <image:loc>${escapeXml(p.image)}</image:loc>
      <image:title>${escapeXml(p.name || '')}</image:title>
    </image:image>` : ''}
  </url>`;
    }).join('\n');

    const xml = `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('sitemap-products error:', err.message);
    res.status(500).send('Error generating products sitemap');
  }
});

// Dynamic stores sitemap
router.get('/sitemap-stores.xml', async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .select('storeSlug updatedAt logo storeName')
      .lean()
      .limit(50000);

    const urls = stores.map((s) => {
      const lastmod = (s.updatedAt || new Date()).toISOString().split('T')[0];
      return `  <url>
    <loc>${BASE_URL}/store/${encodeURIComponent(s.storeSlug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${s.logo ? `
    <image:image>
      <image:loc>${escapeXml(s.logo)}</image:loc>
      <image:title>${escapeXml(s.storeName || '')}</image:title>
    </image:image>` : ''}
  </url>`;
    }).join('\n');

    const xml = `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('sitemap-stores error:', err.message);
    res.status(500).send('Error generating stores sitemap');
  }
});

module.exports = router;
