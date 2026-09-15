const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = Object.freeze({
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return [
    'scrypt',
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') {
    return false;
  }

  try {
    const [algorithm, n, r, p, encodedSalt, encodedKey] = storedHash.split('$');
    const parsedOptions = {
      N: Number.parseInt(n, 10),
      r: Number.parseInt(r, 10),
      p: Number.parseInt(p, 10),
    };
    if (
      algorithm !== 'scrypt' ||
      !encodedSalt ||
      !encodedKey ||
      !Number.isInteger(parsedOptions.N) ||
      !Number.isInteger(parsedOptions.r) ||
      !Number.isInteger(parsedOptions.p) ||
      parsedOptions.N <= 1 ||
      parsedOptions.r <= 0 ||
      parsedOptions.p <= 0
    ) {
      return false;
    }

    const salt = Buffer.from(encodedSalt, 'base64url');
    const storedKey = Buffer.from(encodedKey, 'base64url');
    if (!salt.length || !storedKey.length || storedKey.length > 128) {
      return false;
    }

    const derivedKey = await scrypt(password, salt, storedKey.length, {
      ...parsedOptions,
      maxmem: SCRYPT_OPTIONS.maxmem,
    });

    return timingSafeEqual(storedKey, derivedKey);
  } catch (_error) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
