const { normalizeSocialLinks } = require('../../services/socialLinksService');

describe('socialLinksService', () => {
  test('normalizes usernames and full profile links', () => {
    const links = normalizeSocialLinks({
      website: 'rozare.com',
      instagram: '@brand_store',
      facebook: 'https://www.facebook.com/brand.store?ref=copy',
      twitter: 'brandx',
      youtube: '@brandchannel',
      tiktok: 'www.tiktok.com/@brandtok?lang=en',
    });

    expect(links).toEqual({
      website: 'https://rozare.com',
      instagram: 'https://instagram.com/brand_store',
      facebook: 'https://www.facebook.com/brand.store',
      twitter: 'https://x.com/brandx',
      youtube: 'https://youtube.com/@brandchannel',
      tiktok: 'https://www.tiktok.com/@brandtok',
    });
  });

  test('keeps empty social fields safe', () => {
    expect(normalizeSocialLinks({ instagram: '' })).toEqual({
      website: '',
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: '',
      tiktok: '',
    });
  });
});
