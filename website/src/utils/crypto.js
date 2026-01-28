// Secure password hashing using Web Crypto API
// Uses PBKDF2 with SHA-256, 100k iterations

const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;

/**
 * Generate a random salt
 */
function generateSalt() {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Convert Uint8Array to hex string
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Hash a password using PBKDF2
 * @param {string} password - Plain text password
 * @param {Uint8Array} salt - Salt bytes (or will generate if not provided)
 * @returns {Promise<{hash: string, salt: string}>} - Hex-encoded hash and salt
 */
export async function hashPassword(password, existingSalt = null) {
  const salt = existingSalt || generateSalt();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: bufferToHex(salt),
  };
}

/**
 * Verify a password against a stored hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Hex-encoded stored hash
 * @param {string} storedSalt - Hex-encoded stored salt
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, storedHash, storedSalt) {
  try {
    const salt = hexToBuffer(storedSalt);
    const { hash } = await hashPassword(password, salt);
    return hash === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a secure random token (for session tokens, etc.)
 * @param {number} length - Length in bytes (default 32)
 * @returns {string} - Hex-encoded random token
 */
export function generateSecureToken(length = 32) {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return bufferToHex(buffer);
}

/**
 * Hash a wallet signature for use as authentication proof
 * This creates a deterministic but secure token from the signature
 * @param {string} signature - The wallet signature (hex or base64)
 * @param {string} walletAddress - The wallet address
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function hashSignature(signature, walletAddress) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${walletAddress}:${signature}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}
