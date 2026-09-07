/**
 * Utility functions for normalizing and formatting Firebase credentials and private keys.
 * Supports escaped newlines (\n, \r\n), wrapping quotes, and Base64-encoded strings.
 */

/**
 * Formats and normalizes a Firebase / Google Cloud PEM private key.
 *
 * @param {string} key - Raw private key from environment or JSON
 * @returns {string|undefined} Formatted PEM private key string
 */
export const formatFirebasePrivateKey = (key) => {
  if (!key || typeof key !== 'string') return undefined;

  let formatted = key.trim();
  if (formatted === '') return undefined;

  // Strip wrapping single or double quotes
  if (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1).trim();
  }

  // Detect and decode Base64 encoded keys if present (e.g. Vercel env variable workarounds)
  if (!formatted.includes('BEGIN') && !formatted.includes('\n')) {
    try {
      const decoded = Buffer.from(formatted, 'base64').toString('utf8');
      if (decoded.includes('BEGIN') && decoded.includes('PRIVATE KEY')) {
        formatted = decoded.trim();
      }
    } catch {
      // Not base64 encoded, continue standard normalization
    }
  }

  // Replace literal escaped newlines with actual newlines
  formatted = formatted
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Ensure header and footer boundaries have newlines
  if (formatted.includes('-----BEGIN PRIVATE KEY-----') && !formatted.includes('-----BEGIN PRIVATE KEY-----\n')) {
    formatted = formatted.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
  }
  if (formatted.includes('-----BEGIN RSA PRIVATE KEY-----') && !formatted.includes('-----BEGIN RSA PRIVATE KEY-----\n')) {
    formatted = formatted.replace('-----BEGIN RSA PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----\n');
  }
  if (formatted.includes('-----END PRIVATE KEY-----') && !formatted.includes('\n-----END PRIVATE KEY-----')) {
    formatted = formatted.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }
  if (formatted.includes('-----END RSA PRIVATE KEY-----') && !formatted.includes('\n-----END RSA PRIVATE KEY-----')) {
    formatted = formatted.replace('-----END RSA PRIVATE KEY-----', '\n-----END RSA PRIVATE KEY-----');
  }

  return formatted.trim();
};

/**
 * Safely parses a Firebase Service Account JSON string or Base64-encoded JSON string.
 *
 * @param {string|object} raw - Service account raw JSON string or object
 * @returns {object|null} Parsed and normalized service account object
 */
export const parseFirebaseServiceAccount = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') {
    const copy = { ...raw };
    if (copy.private_key) {
      copy.private_key = formatFirebasePrivateKey(copy.private_key);
    }
    return copy;
  }

  let str = String(raw).trim();
  if (!str.startsWith('{')) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) {
        str = decoded.trim();
      }
    } catch {
      // Continue with original str
    }
  }

  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && parsed.private_key) {
      parsed.private_key = formatFirebasePrivateKey(parsed.private_key);
    }
    return parsed;
  } catch {
    return null;
  }
};
