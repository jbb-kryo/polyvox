const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

const HTML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
};

export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/[&<>"'\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

export function unescapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g, (entity) => HTML_UNESCAPE_MAP[entity] || entity);
}

export function stripHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/<[^>]*>/g, '');
}

export function sanitizeString(str: any, maxLength: number = 1000): string {
  if (typeof str !== 'string') {
    return '';
  }

  let sanitized = str.trim();
  sanitized = escapeHtml(sanitized);

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  if (trimmed.toLowerCase().startsWith('javascript:') ||
      trimmed.toLowerCase().startsWith('data:') ||
      trimmed.toLowerCase().startsWith('vbscript:')) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
}

export function sanitizeEthereumAddress(address: string): string {
  if (typeof address !== 'string') {
    return '';
  }

  const trimmed = address.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return '';
  }

  return trimmed.toLowerCase();
}

export function sanitizeAlphanumeric(str: string, maxLength: number = 100): string {
  if (typeof str !== 'string') {
    return '';
  }

  let sanitized = str.trim();
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function sanitizeAlphanumericWithSpaces(str: string, maxLength: number = 200): string {
  if (typeof str !== 'string') {
    return '';
  }

  let sanitized = str.trim();
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function sanitizeJson(jsonString: string, maxLength: number = 10000): any {
  if (typeof jsonString !== 'string') {
    return null;
  }

  if (jsonString.length > maxLength) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch {
    return null;
  }
}

export function sanitizeNumber(value: any, min?: number, max?: number): number | null {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}

export function sanitizeInteger(value: any, min?: number, max?: number): number | null {
  const num = sanitizeNumber(value, min, max);

  if (num === null) {
    return null;
  }

  return Math.floor(num);
}

export function sanitizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return false;
}

export function sanitizeArray<T>(
  arr: any,
  itemSanitizer: (item: any) => T | null,
  maxLength: number = 1000
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  const sanitized: T[] = [];

  for (let i = 0; i < Math.min(arr.length, maxLength); i++) {
    const sanitizedItem = itemSanitizer(arr[i]);
    if (sanitizedItem !== null) {
      sanitized.push(sanitizedItem);
    }
  }

  return sanitized;
}

export function sanitizeObject<T extends Record<string, any>>(
  obj: any,
  schema: { [K in keyof T]: (value: any) => T[K] | null }
): Partial<T> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return {};
  }

  const sanitized: Partial<T> = {};

  for (const [key, sanitizer] of Object.entries(schema)) {
    if (key in obj) {
      const sanitizedValue = sanitizer(obj[key]);
      if (sanitizedValue !== null) {
        sanitized[key as keyof T] = sanitizedValue;
      }
    }
  }

  return sanitized;
}

export function removeNullBytes(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/\0/g, '');
}

export function normalizeWhitespace(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/\s+/g, ' ').trim();
}

export function sanitizeFilename(filename: string, maxLength: number = 255): string {
  if (typeof filename !== 'string') {
    return '';
  }

  let sanitized = filename.trim();
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  sanitized = sanitized.replace(/\.+/g, '.');
  sanitized = sanitized.replace(/_+/g, '_');

  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  if (sanitized.length > maxLength) {
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, maxLength - extension.length) + extension;
  }

  return sanitized || 'unnamed';
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  const trimmed = email.trim().toLowerCase();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return '';
  }

  if (trimmed.length > 254) {
    return '';
  }

  return trimmed;
}

export function sanitizeMarketId(marketId: string): string {
  if (typeof marketId !== 'string') {
    return '';
  }

  const sanitized = sanitizeAlphanumericWithSpaces(marketId, 100);
  return sanitized;
}

export function sanitizeTokenId(tokenId: string): string {
  if (typeof tokenId !== 'string') {
    return '';
  }

  return sanitizeAlphanumeric(tokenId, 100);
}

export const sanitizers = {
  escapeHtml,
  stripHtml,
  sanitizeString,
  sanitizeUrl,
  sanitizeEthereumAddress,
  sanitizeAlphanumeric,
  sanitizeAlphanumericWithSpaces,
  sanitizeJson,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeBoolean,
  sanitizeArray,
  sanitizeObject,
  removeNullBytes,
  normalizeWhitespace,
  sanitizeFilename,
  sanitizeEmail,
  sanitizeMarketId,
  sanitizeTokenId,
};

export default sanitizers;
