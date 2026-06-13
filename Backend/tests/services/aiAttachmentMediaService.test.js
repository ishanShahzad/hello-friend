jest.mock('../../services/whatsapp/evolutionMediaService', () => ({
  getMediaFromMessage: jest.fn(),
}));

jest.mock('../../utils/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        const { Writable } = require('stream');
        const stream = new Writable({
          write(chunk, encoding, next) {
            next();
          },
        });
        stream.on('finish', () => callback(null, { secure_url: 'https://res.cloudinary.com/demo/uploaded-product.jpg' }));
        return stream;
      }),
    },
  },
}));

const ORIGINAL_OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';

const { getMediaFromMessage } = require('../../services/whatsapp/evolutionMediaService');
const { cloudinary } = require('../../utils/cloudinary');
const { processChatAttachments } = require('../../services/aiAttachmentService');

describe('aiAttachmentService WhatsApp media handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  afterAll(() => {
    if (ORIGINAL_OPENROUTER_API_KEY === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_API_KEY;
    }
  });

  test('downloads WhatsApp images through Evolution and persists them to Cloudinary', async () => {
    getMediaFromMessage.mockResolvedValueOnce({
      buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]),
      mimetype: 'image/jpeg',
    });

    const result = await processChatAttachments([{
      kind: 'image',
      source: 'whatsapp',
      evolutionInstance: 'seller-instance',
      messageKey: { id: 'MSG_IMAGE_1' },
      url: 'https://evolution.example/encrypted-temporary-image',
      mimetype: 'image/jpeg',
      filename: 'photo.jpg',
    }]);

    expect(getMediaFromMessage).toHaveBeenCalledWith(expect.objectContaining({
      instanceName: 'seller-instance',
      messageKey: { id: 'MSG_IMAGE_1' },
    }));
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledTimes(1);
    expect(result.attachments).toEqual([
      expect.objectContaining({
        type: 'image',
        url: 'https://res.cloudinary.com/demo/uploaded-product.jpg',
      }),
    ]);
    expect(result.context).toContain('https://res.cloudinary.com/demo/uploaded-product.jpg');
  });

  test('transcribes WhatsApp voice notes with OpenRouter audio transcription payload', async () => {
    const audio = Buffer.from('fake ogg voice bytes');
    getMediaFromMessage.mockResolvedValueOnce({
      buffer: audio,
      mimetype: 'audio/ogg; codecs=opus',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Add this product for 1200 PKR' }),
      text: async () => '',
    });

    const result = await processChatAttachments([{
      kind: 'audio',
      source: 'whatsapp',
      evolutionInstance: 'seller-instance',
      messageKey: { id: 'MSG_AUDIO_1' },
      mimetype: 'audio/ogg; codecs=opus',
      filename: 'voice.ogg',
    }]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, request] = global.fetch.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      model: 'openai/gpt-4o-transcribe',
      input_audio: {
        data: audio.toString('base64'),
        format: 'ogg',
      },
    });
    expect(result.context).toContain('Voice message transcription');
    expect(result.context).toContain('Add this product for 1200 PKR');
    expect(result.processed[0]).toMatchObject({ type: 'audio', success: true });
  });
});
