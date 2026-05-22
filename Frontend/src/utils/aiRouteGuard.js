const ROUTE_ALIASES = {
  '/seller/apply': '/become-seller',
  '/seller-signup': '/become-seller',
  '/apply-seller': '/become-seller',
  '/seller-registration': '/become-seller',
};

const EXACT_ROUTES = new Set([
  '/',
  '/marketplace',
  '/marketplace/trusted',
  '/trusted-stores',
  '/about',
  '/faq',
  '/contact',
  '/docs',
  '/track-order',
  '/become-seller',
  '/terms',
  '/privacy',
  '/ai-chat',
  '/login',
  '/signup',
  '/cart',
  '/checkout',
  '/products',
  '/stores',
  '/unauthorized',
]);

const PREFIX_ROUTES = [
  '/single-product/',
  '/store/',
  '/orders/confirm/',
  '/seller-dashboard',
  '/admin-dashboard',
  '/user-dashboard',
];

export const normalizeAIRoute = (route) => {
  const raw = String(route || '').trim();
  if (!raw) return '/';

  let pathname = raw;
  try {
    const url = new URL(raw, window.location.origin);
    pathname = url.pathname + url.search + url.hash;
  } catch {
    pathname = raw.startsWith('/') ? raw : `/${raw}`;
  }

  const [pathOnly, suffix = ''] = pathname.split(/(?=[?#])/);
  const normalizedPath = (ROUTE_ALIASES[pathOnly] || pathOnly).replace(/\/+$/, '') || '/';
  if (EXACT_ROUTES.has(normalizedPath)) return `${normalizedPath}${suffix}`;
  if (PREFIX_ROUTES.some(prefix => normalizedPath === prefix.replace(/\/$/, '') || normalizedPath.startsWith(prefix))) {
    return `${normalizedPath}${suffix}`;
  }
  return '/';
};
