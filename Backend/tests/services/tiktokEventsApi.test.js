const {
    sendTikTokEvent,
    sha256,
    trackCompleteRegistration,
    trackOrderEvent,
} = require('../../services/tiktokEventsApi');

describe('tiktokEventsApi', () => {
    const originalEnv = process.env;
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env = { ...originalEnv, TIKTOK_EVENTS_API_TOKEN: 'test-token', TIKTOK_PIXEL_ID: 'PIXEL123' };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ code: 0, message: 'OK' }),
        });
    });

    afterEach(() => {
        process.env = originalEnv;
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('hashes identifiers with normalized SHA-256', () => {
        expect(sha256('  TEST@Example.COM ')).toBe(
            '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'
        );
    });

    it('sends complete registration with numeric value and product content type', async () => {
        await trackCompleteRegistration({
            req: {
                headers: {
                    'user-agent': 'jest',
                    'x-forwarded-for': '1.2.3.4',
                    cookie: '_ttp=abc',
                },
            },
            user: { _id: 'user123', email: 'seller@example.com' },
            storeName: 'Seller Store',
            phone: '+15551234567',
            eventId: 'evt-1',
        });

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.event_source).toBe('web');
        expect(body.event_source_id).toBe('PIXEL123');
        expect(body.data[0].event).toBe('CompleteRegistration');
        expect(body.data[0].event_id).toBe('evt-1');
        expect(body.data[0].properties.value).toBe(1);
        expect(body.data[0].properties.contents[0].content_type).toBe('product');
        expect(body.data[0].user.email).toBe(sha256('seller@example.com'));
        expect(body.data[0].user.ttp).toBe('abc');
    });

    it('sends purchase/order contents from order items', async () => {
        await trackOrderEvent({
            event: 'Purchase',
            order: {
                orderId: 'ORD-1',
                shippingInfo: { email: 'buyer@example.com', phone: '+15550000000' },
                orderItems: [{ productId: 'prod1', name: 'Toy Cart', price: 12, quantity: 2 }],
                orderSummary: { totalAmount: 24 },
                tracking: { tiktokPurchaseEventId: 'purchase-1' },
            },
            eventId: 'purchase-1',
        });

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.data[0].event).toBe('Purchase');
        expect(body.data[0].properties.order_id).toBe('ORD-1');
        expect(body.data[0].properties.value).toBe(24);
        expect(body.data[0].properties.contents).toEqual([
            expect.objectContaining({
                content_id: 'prod1',
                content_type: 'product',
                content_name: 'Toy Cart',
                price: 12,
                quantity: 2,
            }),
        ]);
    });

    it('skips cleanly when the token is missing', async () => {
        delete process.env.TIKTOK_EVENTS_API_TOKEN;
        const result = await sendTikTokEvent({ event: 'Purchase' });
        expect(result.skipped).toBe(true);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
