const DEFAULT_CURRENCY = 'USD';

const hasTikTokPixel = () =>
  typeof window !== 'undefined' &&
  window.ttq &&
  typeof window.ttq.track === 'function';

const hasMetaPixel = () =>
  typeof window !== 'undefined' &&
  window.fbq &&
  typeof window.fbq === 'function';

const normalizeForHash = (value) => String(value || '').trim().toLowerCase();

const hashSha256 = async (value) => {
  const normalized = normalizeForHash(value);
  if (!normalized || typeof crypto === 'undefined' || !crypto.subtle) return null;

  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const cleanPayload = (payload) => {
  const cleaned = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    cleaned[key] = value;
  });
  return cleaned;
};

const buildProductContent = (product, quantity = 1) => {
  const price = Number(product?.discountedPrice || product?.price || 0);

  return cleanPayload({
    content_id: product?._id || product?.id,
    content_type: 'product',
    content_name: product?.name,
    content_category: product?.category,
    brand: product?.brand,
    price: price > 0 ? price : undefined,
    quantity,
  });
};

export const trackTikTokPage = () => {
  if (typeof window === 'undefined' || !window.ttq || typeof window.ttq.page !== 'function') return false;
  window.ttq.page();
  return true;
};

export const trackTikTokEvent = (eventName, payload = {}) => {
  if (!hasTikTokPixel()) return false;
  window.ttq.track(eventName, cleanPayload(payload));
  return true;
};

export const identifyTikTokUser = async ({ email, phone, externalId } = {}) => {
  if (!hasTikTokPixel() || typeof window.ttq.identify !== 'function') return false;

  const [hashedEmail, hashedPhone, hashedExternalId] = await Promise.all([
    email ? hashSha256(email) : null,
    phone ? hashSha256(phone) : null,
    externalId ? hashSha256(externalId) : null,
  ]);

  const identity = cleanPayload({
    email: hashedEmail,
    phone_number: hashedPhone,
    external_id: hashedExternalId,
  });

  if (Object.keys(identity).length === 0) return false;
  window.ttq.identify(identity);
  return true;
};

export const trackSellerPageView = () => {
  trackTikTokEvent('ViewContent', {
    content_id: 'become_seller_page',
    content_name: 'Become a Seller Page',
    content_category: 'Seller Registration',
    currency: DEFAULT_CURRENCY,
  });
};

export const trackSellerFormSubmitted = (stepName = 'seller_details') => {
  trackTikTokEvent('SubmitForm', {
    content_id: stepName,
    content_name: stepName,
    content_category: 'Seller Signup',
    currency: DEFAULT_CURRENCY,
  });
};

export const trackSellerRegistrationCompleted = async ({ user, storeName, email, phone } = {}) => {
  const externalId = user?._id || user?.id;
  await identifyTikTokUser({ email: user?.email || email, phone, externalId });

  // Track TikTok CompleteRegistration
  trackTikTokEvent('CompleteRegistration', {
    content_id: externalId || 'new_seller',
    content_name: storeName || 'New Seller Store',
    content_category: 'Seller Signup',
    value: 1,
    currency: DEFAULT_CURRENCY,
  });

  // Track Meta (Facebook) CompleteRegistration
  if (hasMetaPixel()) {
    window.fbq('track', 'CompleteRegistration', {
      value: 1,
      currency: DEFAULT_CURRENCY,
      content_name: storeName || 'New Seller Store',
      content_category: 'Seller Signup',
    });
  }
};

export const trackProductView = (product) => {
  const price = Number(product?.discountedPrice || product?.price || 0);
  const content = buildProductContent(product);

  trackTikTokEvent('ViewContent', {
    contents: [content],
    content_type: 'product',
    content_ids: [content.content_id],
    value: price > 0 ? price : undefined,
    currency: DEFAULT_CURRENCY,
  });
};

export const trackAddToCart = (product, quantity = 1) => {
  const price = Number(product?.discountedPrice || product?.price || 0);
  const content = buildProductContent(product, quantity);

  trackTikTokEvent('AddToCart', {
    contents: [content],
    content_type: 'product',
    content_ids: [content.content_id],
    value: price > 0 ? price * quantity : undefined,
    currency: DEFAULT_CURRENCY,
  });
};

export const trackInitiateCheckout = (cartItems = [], totalAmount = 0) => {
  const contents = cartItems
    .map((item) => buildProductContent(item.product, item.qty || item.quantity || 1))
    .filter((content) => content.content_id);

  trackTikTokEvent('InitiateCheckout', {
    contents,
    content_type: 'product',
    content_ids: contents.map((content) => content.content_id),
    value: Number(totalAmount) > 0 ? Number(totalAmount) : undefined,
    currency: DEFAULT_CURRENCY,
  });
};

export const trackPurchase = ({ orderId, cartItems = [], totalAmount = 0, currency = DEFAULT_CURRENCY } = {}) => {
  const contents = cartItems
    .map((item) => buildProductContent(item.product || item, item.qty || item.quantity || 1))
    .filter((content) => content.content_id);

  trackTikTokEvent('Purchase', {
    contents,
    content_type: contents.length > 0 ? 'product' : undefined,
    content_ids: contents.map((content) => content.content_id),
    order_id: orderId,
    value: Number(totalAmount) > 0 ? Number(totalAmount) : undefined,
    currency,
  });
};
