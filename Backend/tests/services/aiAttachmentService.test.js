const JSZip = require('jszip');
const { parseProductFile, normalizeProductRow, extractDocumentText } = require('../../services/aiAttachmentService');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function makeDocxBuffer(text) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join(''));
  zip.folder('_rels').file('.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join(''));
  zip.folder('word').file('document.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>',
    ...String(text).split('\n').map(line => `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`),
    '<w:sectPr/></w:body></w:document>',
  ].join(''));
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('aiAttachmentService product parsing', () => {
  test('normalizes common CSV product columns', async () => {
    const csv = [
      'productName,regular price,currency,category,brand,qty,imageUrl,tags,colors',
      'Cotton Shirt,2500,PKR,Clothing,Rozare,12,https://example.com/shirt.jpg,"shirt, cotton","blue, white"',
    ].join('\n');

    const rows = await parseProductFile(Buffer.from(csv), {
      filename: 'products.csv',
      mimetype: 'text/csv',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'Cotton Shirt',
      price: '2500',
      currency: 'PKR',
      category: 'Clothing',
      brand: 'Rozare',
      stock: '12',
      image: 'https://example.com/shirt.jpg',
      tags: ['shirt', 'cotton'],
      colors: ['blue', 'white'],
    });
  });

  test('extracts products from JSON wrapper objects', async () => {
    const json = {
      products: [
        {
          title: 'Leather Wallet',
          price: 40,
          currency: 'GBP',
          type: 'Accessories',
          maker: 'Rozare',
          inventory: 5,
          discountedPrice: 35,
        },
      ],
    };

    const rows = await parseProductFile(Buffer.from(JSON.stringify(json)), {
      filename: 'products.json',
      mimetype: 'application/json',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        name: 'Leather Wallet',
        price: 40,
        currency: 'GBP',
        category: 'Accessories',
        brand: 'Rozare',
        stock: 5,
        discountedPrice: 35,
      }),
    ]);
  });

  test('normalizes camelCase row keys', () => {
    expect(normalizeProductRow({
      productName: 'Sneakers',
      imageUrl: 'https://example.com/s.jpg',
      discountedPrice: '22',
    })).toMatchObject({
      name: 'Sneakers',
      image: 'https://example.com/s.jpg',
      discountedPrice: '22',
    });
  });

  test('extracts text from DOCX product documents', async () => {
    const buffer = await makeDocxBuffer('Product: Linen Dress\nPrice: 55 GBP\nCategory: Clothing\nBrand: Rozare\nStock: 4');
    const text = await extractDocumentText(buffer, {
      filename: 'catalog.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(text).toContain('Linen Dress');
    expect(text).toContain('55 GBP');
  });
});
