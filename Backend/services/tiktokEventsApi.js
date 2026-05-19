const crypto = require('crypto');

const TIKTOK_EVENTS_ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const DEFAULT_PIXEL_ID = 'D85EEDJC77U42GL90IK0';
const DEFAULT_CURRENCY = 'USD';

const normalizeForHash = (value) => String(value || '').trim().toLowerCase();

const sha256 = (value) => {
    const normalized = normalizeForHash(value);
    if (!normalized) return undefined;
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

const parseCookies = (cookieHeader = '') => {
    return cookieHeader.split(';').reduce((cookies, part) => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) return cookies;
        const value = rawValue.join('=') || '';
        try {
            cookies[rawKey] = decodeURIComponent(value);
        } catch {
            cookies[rawKey] = value;
        }
        return cookies;
    }, {});
};

const getClientIp = (req) => {
    const forwarded = req?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req?.ip || req?.socket?.remoteAddress || undefined;
};

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const cleanObject = (input = {}) => {
    return Object.entries(input).reduce((cleaned, [key, value]) => {
        if (value === undefined || value === null || value === '') return cleaned;
        if (Array.isArray(value) && value.length === 0) return cleaned;
        cleaned[key] = value;
        return cleaned;
    }, {});
};

const buildContentsFromOrder = (order) => {
    return (order?.orderItems || []).map((item) => cleanObject({
        content_id: item.productId?.toString?.() || item.productId,
        content_type: 'product',
        content_name: item.name,
        price: toNumber(item.price),
        quantity: toNumber(item.quantity, 1),
    })).filter((content) => content.content_id);
};

const buildUserPayload = ({ req, user, email, phone, externalId, tracking = {} } = {}) => {
    const cookies = parseCookies(req?.headers?.cookie || '');
    return cleanObject({
        email: sha256(user?.email || email),
        phone: sha256(phone),
        external_id: sha256(externalId || user?._id || user?.id || email),
        ip: getClientIp(req),
        user_agent: req?.headers?.['user-agent'],
        ttclid: tracking.ttclid || req?.body?.ttclid || cookies.ttclid,
        ttp: tracking.ttp || req?.body?.ttp || cookies._ttp,
    });
};

const createEventId = (prefix, stableId) => {
    if (stableId) return `${prefix}_${stableId}`;
    return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
};

const isEnabled = () => Boolean(process.env.TIKTOK_EVENTS_API_TOKEN);

const sendTikTokEvent = async ({
    event,
    eventId,
    req,
    user,
    email,
    phone,
    externalId,
    properties = {},
    tracking = {},
} = {}) => {
    const accessToken = process.env.TIKTOK_EVENTS_API_TOKEN;
    const pixelId = process.env.TIKTOK_PIXEL_ID || DEFAULT_PIXEL_ID;

    if (!accessToken || !pixelId || !event) {
        return { skipped: true, reason: 'TikTok Events API is not configured' };
    }

    const eventPayload = cleanObject({
        event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || createEventId(event.toLowerCase(), externalId),
        user: buildUserPayload({ req, user, email, phone, externalId, tracking }),
        page: cleanObject({
            url: tracking.pageUrl || req?.body?.pageUrl || req?.headers?.referer,
            referrer: tracking.referrer || req?.body?.referrer,
        }),
        properties: cleanObject(properties),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const requestBody = cleanObject({
            event_source: 'web',
            event_source_id: pixelId,
            test_event_code: process.env.TIKTOK_TEST_EVENT_CODE,
            data: [eventPayload],
        });

        const response = await fetch(TIKTOK_EVENTS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.code) {
            console.warn('[tiktok] Events API rejected event:', {
                event,
                status: response.status,
                code: body?.code,
                message: body?.message,
            });
            return { ok: false, status: response.status, body };
        }

        return { ok: true, body };
    } catch (error) {
        console.warn('[tiktok] Events API failed:', error.message);
        return { ok: false, error: error.message };
    } finally {
        clearTimeout(timeout);
    }
};

const trackCompleteRegistration = ({ req, user, storeName, phone, eventId, tracking = {} } = {}) => {
    const userId = user?._id?.toString?.() || user?.id;
    return sendTikTokEvent({
        event: 'CompleteRegistration',
        eventId: eventId || createEventId('seller_registration', userId),
        req,
        user,
        email: user?.email,
        phone,
        externalId: userId,
        tracking,
        properties: {
            contents: [{
                content_id: userId || 'new_seller',
                content_type: 'product',
                content_name: storeName || 'New Seller Store',
                content_category: 'Seller Signup',
                price: 1,
                quantity: 1,
            }],
            content_type: 'product',
            content_ids: [userId || 'new_seller'],
            content_name: storeName || 'New Seller Store',
            content_category: 'Seller Signup',
            value: 1,
            currency: DEFAULT_CURRENCY,
        },
    });
};

const trackOrderEvent = ({ event, req, order, user, eventId, tracking = {} } = {}) => {
    const contents = buildContentsFromOrder(order);
    const value = toNumber(order?.orderSummary?.totalAmount);
    return sendTikTokEvent({
        event,
        eventId: eventId || createEventId(event.toLowerCase(), order?.orderId),
        req,
        user,
        email: order?.shippingInfo?.email,
        phone: order?.shippingInfo?.phone,
        externalId: user?._id || order?.user || order?.shippingInfo?.email,
        tracking,
        properties: {
            contents,
            content_type: contents.length ? 'product' : undefined,
            content_ids: contents.map((content) => content.content_id),
            order_id: order?.orderId,
            value,
            currency: DEFAULT_CURRENCY,
        },
    });
};

module.exports = {
    DEFAULT_PIXEL_ID,
    buildContentsFromOrder,
    createEventId,
    isEnabled,
    sendTikTokEvent,
    sha256,
    trackCompleteRegistration,
    trackOrderEvent,
};
