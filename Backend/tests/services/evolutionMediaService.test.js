const { __private } = require('../../services/whatsapp/evolutionMediaService');

describe('evolutionMediaService payload decoding', () => {
  test('extracts base64 media from common Evolution response shapes', () => {
    const encoded = Buffer.from('hello media').toString('base64');

    expect(__private.extractBase64Payload({ base64: encoded })).toBe(encoded);
    expect(__private.extractBase64Payload({ data: encoded })).toBe(encoded);
    expect(__private.extractBase64Payload({ data: { base64: encoded } })).toBe(encoded);
    expect(__private.extractBase64Payload({ result: encoded })).toBe(encoded);
    expect(__private.extractBase64Payload({ media: { base64: encoded } })).toBe(encoded);
  });

  test('decodes data URI base64 payloads to binary buffers', () => {
    const encoded = Buffer.from('product image bytes').toString('base64');
    const buffer = __private.decodeBase64Payload(`data:image/jpeg;base64,${encoded}`);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe('product image bytes');
  });
});
