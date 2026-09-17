// QR layout and Reed-Solomon routines adapted from Project Nayuki's QR Code
// generator reference implementation: https://www.nayuki.io/page/qr-code-generator-library
// Copyright (c) Project Nayuki. (MIT License)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// A small, dependency-free QR encoder for verification URLs. It emits a
// Version 10, error-correction-level L symbol in byte mode (up to 271 bytes).
// The fixed size keeps certificate rendering predictable and avoids a runtime
// dependency on an external QR service.
const VERSION = 10;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 274;
const TOTAL_CODEWORDS = 346;
const ECC_PER_BLOCK = 18;
const BLOCK_DATA_LENGTHS = [68, 68, 69, 69];
const ALIGNMENT_CENTERS = [6, 28, 50];

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function encodeData(value) {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length > 271) {
    throw new RangeError('Verification URL is too long for the QR symbol');
  }
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 16);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, DATA_CODEWORDS * 8 - bits.length));
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }
  for (let padIndex = 0; data.length < DATA_CODEWORDS; padIndex += 1) {
    data.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }
  return data;
}

function multiply(left, right) {
  let product = 0;
  for (let i = 7; i >= 0; i -= 1) {
    product = (product << 1) ^ ((product >>> 7) * 0x11d);
    product ^= ((right >>> i) & 1) * left;
  }
  return product;
}

function errorCorrection(data) {
  const divisor = Array(ECC_PER_BLOCK).fill(0);
  divisor[ECC_PER_BLOCK - 1] = 1;
  let root = 1;
  for (let i = 0; i < ECC_PER_BLOCK; i += 1) {
    for (let j = 0; j < ECC_PER_BLOCK; j += 1) {
      divisor[j] = multiply(divisor[j], root);
      if (j + 1 < ECC_PER_BLOCK) divisor[j] ^= divisor[j + 1];
    }
    root = multiply(root, 0x02);
  }

  const result = Array(ECC_PER_BLOCK).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < ECC_PER_BLOCK; i += 1) {
      result[i] ^= multiply(divisor[i], factor);
    }
  }
  return result;
}

function interleaveCodewords(data) {
  const blocks = [];
  let offset = 0;
  for (const length of BLOCK_DATA_LENGTHS) {
    const blockData = data.slice(offset, offset + length);
    blocks.push({ data: blockData, ecc: errorCorrection(blockData) });
    offset += length;
  }
  const result = [];
  for (let i = 0; i < 69; i += 1) {
    for (const block of blocks) if (i < block.data.length) result.push(block.data[i]);
  }
  for (let i = 0; i < ECC_PER_BLOCK; i += 1) {
    for (const block of blocks) result.push(block.ecc[i]);
  }
  if (result.length !== TOTAL_CODEWORDS) throw new Error('QR codeword count is invalid');
  return result;
}

function createMatrix() {
  const modules = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const reserved = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  function set(x, y, dark) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    modules[y][x] = dark;
    reserved[y][x] = true;
  }

  for (let i = 0; i < SIZE; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [centerX, centerY] of [[3, 3], [SIZE - 4, 3], [3, SIZE - 4]]) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
    }
  }
  for (const centerY of ALIGNMENT_CENTERS) {
    for (const centerX of ALIGNMENT_CENTERS) {
      if ((centerX === 6 && centerY === 6) ||
          (centerX === 6 && centerY === 50) ||
          (centerX === 50 && centerY === 6)) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          set(centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  function drawFormat(mask) {
    const data = (1 << 3) | mask; // Error-correction level L is 01.
    let remainder = data;
    for (let i = 0; i < 10; i += 1) {
      remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    }
    const format = ((data << 10) | remainder) ^ 0x5412;
    const bit = (i) => ((format >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) set(8, SIZE - 15 + i, bit(i));
    set(8, SIZE - 8, true);
  }

  drawFormat(0);
  let versionRemainder = VERSION;
  for (let i = 0; i < 12; i += 1) {
    versionRemainder = (versionRemainder << 1) ^ ((versionRemainder >>> 11) * 0x1f25);
  }
  const versionBits = (VERSION << 12) | versionRemainder;
  for (let i = 0; i < 18; i += 1) {
    const bit = ((versionBits >>> i) & 1) !== 0;
    const x = SIZE - 11 + (i % 3);
    const y = Math.floor(i / 3);
    set(x, y, bit);
    set(y, x, bit);
  }
  return { modules, reserved, drawFormat };
}

function encodeQrMatrix(value) {
  if (typeof value !== 'string' || !value) throw new TypeError('QR content is required');
  const codewords = interleaveCodewords(encodeData(value));
  const { modules, reserved, drawFormat } = createMatrix();
  let bitIndex = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (reserved[y][x]) continue;
        const bit = bitIndex < codewords.length * 8
          ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0
          : false;
        modules[y][x] = bit;
        bitIndex += 1;
      }
    }
  }
  if (bitIndex !== TOTAL_CODEWORDS * 8) throw new Error('QR data placement is invalid');
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!reserved[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
    }
  }
  drawFormat(0);
  return modules;
}

function qrSvg(value) {
  const modules = encodeQrMatrix(value);
  const quietZone = 4;
  const dimension = SIZE + quietZone * 2;
  const path = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE;) {
      if (!modules[y][x]) {
        x += 1;
        continue;
      }
      let width = 1;
      while (x + width < SIZE && modules[y][x + width]) width += 1;
      path.push(`M${x + quietZone} ${y + quietZone}h${width}v1h-${width}z`);
      x += width;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="260" height="260" role="img" aria-label="Certificate verification QR code"><rect width="${dimension}" height="${dimension}" fill="#fff"/><path d="${path.join('')}" fill="#000"/></svg>`;
}

module.exports = { encodeQrMatrix, qrSvg };
