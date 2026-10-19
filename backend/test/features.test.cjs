const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  allocationCost,
  sellingPrice,
  capacityTier,
} = require('../src/modules/projects/project-cost');
const {
  validateFileSignature,
  SAFE_FILENAME,
} = require('../src/modules/uploads/file-types');
const { clientIp } = require('../src/common/utils/client-ip.util');

test('biaya desimal membedakan harga harian/event dan pembulatan markup', () => {
  assert.equal(allocationCost(3, '0.10', 'PER_HARI', 5).toFixed(2), '1.50');
  assert.equal(allocationCost(3, '0.10', 'PER_EVENT', 5).toFixed(2), '0.30');
  assert.equal(sellingPrice('1.05', '10').toFixed(2), '1.16');
  assert.equal(sellingPrice('170', '20').toFixed(2), '204.00');
});
test('tier kebutuhan membulatkan kapasitas ke standar di atasnya', () => {
  assert.deepEqual(
    [1, 100, 101, 200, 201, 499, 500].map(capacityTier),
    [100, 100, 200, 200, 300, 500, 500],
  );
});
test('nama dan signature unggahan menolak path traversal, HTML dan SVG tersamar', () => {
  assert.equal(SAFE_FILENAME.test('../secret.pdf'), false);
  assert.equal(
    SAFE_FILENAME.test('12345678-1234-1234-1234-123456789abc.svg'),
    false,
  );
  for (const extension of [
    '.jpg',
    '.png',
    '.gif',
    '.pdf',
    '.mp4',
    '.webm',
    '.docx',
  ]) {
    assert.throws(
      () =>
        validateFileSignature(
          extension,
          Buffer.from('<html>palsu</html>'),
          Buffer.alloc(0),
        ),
      { status: 400 },
    );
  }
  assert.doesNotThrow(() =>
    validateFileSignature(
      '.png',
      Buffer.from('89504e470d0a1a0a', 'hex'),
      Buffer.alloc(0),
    ),
  );
  assert.doesNotThrow(() =>
    validateFileSignature('.pdf', Buffer.from('%PDF-1.4'), Buffer.alloc(0)),
  );
});
test('IP pengguna hanya mempercayai header Cloudflare dari rentang proxy resmi', () => {
  assert.equal(
    clientIp({
      ip: '::ffff:203.0.113.9',
      headers: { 'cf-connecting-ip': '192.0.2.1' },
    }),
    '203.0.113.9',
  );
  assert.equal(
    clientIp({
      ip: '104.16.1.2',
      headers: { 'cf-connecting-ip': '192.0.2.1' },
    }),
    '192.0.2.1',
  );
  assert.equal(
    clientIp({ ip: '104.16.1.2', headers: { 'cf-connecting-ip': 'invalid' } }),
    '104.16.1.2',
  );
});
