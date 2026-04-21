import { Helmet } from 'react-helmet-async';

const SITE_NAME    = 'Rozare';
const SITE_URL     = 'https://rozare.com';
const TWITTER_SITE = '@RozareHQ';
const DEFAULT_DESC = 'Rozare — A modern online shopping marketplace for unique products from trusted independent sellers. Shop securely with multi-currency support, best deals, discounts, and worldwide shipping.';
const DEFAULT_IMG  = `${SITE_URL}/og-image.png`;
const DEFAULT_KEYWORDS = 'rozare, rozare marketplace, rozare.com, online shopping, buy online, shop online, e-commerce, marketplace, online store, trusted sellers, verified sellers, independent sellers, secure checkout, multi-currency, global shipping, best deals, discounts, coupons, electronics, fashion, home decor, beauty products, accessories, jewelry, shoes, clothing, gadgets, trending products, new arrivals, best sellers, affordable shopping, free shipping, fast delivery, order tracking, wishlist, product reviews, seller dashboard, become a seller, sell online';

export default function SEOHead({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogType    = 'website',
  ogImage   = DEFAULT_IMG,
  ogImageAlt,
  noindex   = false,
  keywords,
  jsonLd,
  children,
}) {
  const fullTitle    = title ? `${title} | ${SITE_NAME} — Online Shopping Marketplace` : `${SITE_NAME} — Online Shopping Marketplace | Buy Products from Trusted Sellers`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : null;
  const imageAlt     = ogImageAlt || fullTitle;
  const allKeywords  = keywords ? `${keywords}, ${DEFAULT_KEYWORDS}` : DEFAULT_KEYWORDS;

  return (
    <Helmet>
      {/* ── Primary ───────────────────────────── */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* ── Open Graph ────────────────────────── */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content="en_US" />
      <meta property="og:type"        content={ogType} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image"       content={ogImage} />
      <meta property="og:image:alt"   content={imageAlt} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />

      {/* ── Twitter Card ──────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_SITE} />
      <meta name="twitter:creator"     content={TWITTER_SITE} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={ogImage} />
      <meta name="twitter:image:alt"   content={imageAlt} />

      {/* ── JSON-LD Structured Data ───────────── */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}

      {children}
    </Helmet>
  );
}
