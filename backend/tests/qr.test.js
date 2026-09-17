const assert = require('node:assert/strict');
const { test } = require('node:test');

const { encodeQrMatrix, qrSvg } = require('../src/services/qr.service');

test('verification URL encodes as a Version 10 QR matrix with finder patterns', () => {
  const matrix = encodeQrMatrix('https://example.org/verify/7ff03331-8b53-43c8-af38-9ac67b30e13a');
  assert.equal(matrix.length, 57);
  assert.ok(matrix.every((row) => row.length === 57));
  for (const [x, y] of [[0, 0], [56, 0], [0, 56]]) {
    assert.equal(matrix[y][x], true);
  }
  assert.equal(matrix[3][3], true);
  assert.equal(matrix[3][7], false);
});

test('QR format bits identify error-correction level L and mask 0', () => {
  const matrix = encodeQrMatrix('https://example.org/verify/test');
  const positions = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8],
    [2, 8], [1, 8], [0, 8],
  ];
  const format = positions.reduce(
    (value, [x, y], index) => value | (Number(matrix[y][x]) << index),
    0,
  );
  assert.equal(format, 0x77c4);
});

test('QR version bits identify Version 10', () => {
  const matrix = encodeQrMatrix('https://example.org/verify/test');
  let versionBits = 0;
  for (let i = 0; i < 18; i += 1) {
    const x = 57 - 11 + (i % 3);
    const y = Math.floor(i / 3);
    versionBits |= Number(matrix[y][x]) << i;
  }
  assert.equal(versionBits, 0x0a4d3);
});

test('QR output is an SVG and rejects oversized content', () => {
  const svg = qrSvg('https://example.org/verify/test');
  assert.match(svg, /^<svg /);
  assert.match(svg, /<path d="M/);
  assert.throws(() => encodeQrMatrix('x'.repeat(272)), RangeError);
});
