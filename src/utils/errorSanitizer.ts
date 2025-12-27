const SENSITIVE_PATTERNS = [
  /0x[a-fA-F0-9]{64}/g,
  /pk_[a-zA-Z0-9]{32,}/g,
  /privateKey["\s:=]+[a-fA-F0-9x]+/gi,
  /private_key["\s:=]+[a-fA-F0-9x]+/gi,
  /password["\s:=]+.{1,100}/gi,
  /masterPassword["\s:=]+.{1,100}/gi,
  /master_password["\s:=]+.{1,100}/gi,
];

const REDACTED_TEXT = '[REDACTED]';

export function sanitizeError(error: any): any {
  if (typeof error === 'string') {
    return sanitizeString(error);
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeString(error.message),
      stack: error.stack ? sanitizeString(error.stack) : undefined,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(error)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = REDACTED_TEXT;
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeError(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return error;
}

function sanitizeString(str: string): string {
  let sanitized = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, REDACTED_TEXT);
  }
  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('privatekey') ||
    lowerKey.includes('private_key') ||
    lowerKey.includes('password') ||
    lowerKey.includes('secret') ||
    lowerKey.includes('token') ||
    lowerKey.includes('key') && lowerKey !== 'publickey'
  );
}

export function safeConsoleError(message: string, error?: any): void {
  if (error) {
    const sanitized = sanitizeError(error);
    console.error(message, sanitized);
  } else {
    console.error(message);
  }
}

export function safeConsoleLog(message: string, data?: any): void {
  if (data) {
    const sanitized = sanitizeError(data);
    console.log(message, sanitized);
  } else {
    console.log(message);
  }
}

export function sanitizeForAnalytics(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeError(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
