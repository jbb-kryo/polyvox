import { sanitizeError, sanitizeObject } from '../utils/errorSanitizer';

export interface SecretConfig {
  name: string;
  envVar: string;
  required: boolean;
  description: string;
}

export interface SecretValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class SecretsManager {
  private secrets = new Map<string, string>();
  private allowedKeys = new Set<string>();
  private initialized = false;

  private secretConfigs: SecretConfig[] = [
    {
      name: 'SUPABASE_URL',
      envVar: 'VITE_SUPABASE_URL',
      required: true,
      description: 'Supabase project URL'
    },
    {
      name: 'SUPABASE_ANON_KEY',
      envVar: 'VITE_SUPABASE_ANON_KEY',
      required: true,
      description: 'Supabase anonymous key (safe for client-side)'
    }
  ];

  initialize(): void {
    if (this.initialized) {
      return;
    }

    for (const config of this.secretConfigs) {
      this.allowedKeys.add(config.name);

      const value = import.meta.env[config.envVar];

      if (value) {
        this.secrets.set(config.name, value);
      } else if (config.required) {
        console.error(`Missing required environment variable: ${config.envVar}`);
      }
    }

    this.initialized = true;
  }

  getSecret(key: string): string | undefined {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.allowedKeys.has(key)) {
      console.warn(`Attempted to access non-allowed secret: ${key}`);
      return undefined;
    }

    return this.secrets.get(key);
  }

  hasSecret(key: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    return this.secrets.has(key);
  }

  validateSecrets(): SecretValidation {
    if (!this.initialized) {
      this.initialize();
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const config of this.secretConfigs) {
      const value = this.secrets.get(config.name);

      if (!value) {
        if (config.required) {
          errors.push(`Missing required secret: ${config.name} (${config.description})`);
        } else {
          warnings.push(`Optional secret not configured: ${config.name} (${config.description})`);
        }
      } else {
        if (value.length < 10) {
          warnings.push(`Secret ${config.name} appears to be too short`);
        }

        if (value === 'your-secret-here' || value === 'changeme' || value === 'test') {
          errors.push(`Secret ${config.name} contains placeholder value`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }

    if (data && typeof data === 'object') {
      return sanitizeObject(data);
    }

    return data;
  }

  private sanitizeString(str: string): string {
    let sanitized = str;

    const patterns = [
      /0x[a-fA-F0-9]{64}/g,
      /sk_[a-zA-Z0-9]{32,}/g,
      /pk_[a-zA-Z0-9]{32,}/g,
      /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /\b\d{16}\b/g
    ];

    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  isSecretKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    const secretKeywords = [
      'private',
      'secret',
      'password',
      'token',
      'apikey',
      'api_key',
      'auth',
      'credential',
      'key',
      'passphrase',
      'signature'
    ];

    return secretKeywords.some(keyword => lowerKey.includes(keyword));
  }

  redactSecretFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      let modified = false;

      for (const [key] of params) {
        if (this.isSecretKey(key)) {
          params.set(key, '[REDACTED]');
          modified = true;
        }
      }

      if (modified) {
        urlObj.search = params.toString();
        return urlObj.toString();
      }

      return url;
    } catch {
      return url;
    }
  }

  warnIfSecretInCode(code: string): string[] {
    const warnings: string[] = [];
    const lines = code.split('\n');

    const suspiciousPatterns = [
      { pattern: /const\s+\w*(?:key|secret|password|token)\s*=\s*['""][^'"]+['""]/gi, warning: 'Possible hardcoded secret' },
      { pattern: /apiKey\s*:\s*['""][^'"]+['""]/gi, warning: 'Possible hardcoded API key' },
      { pattern: /password\s*:\s*['""][^'"]+['""]/gi, warning: 'Possible hardcoded password' },
      { pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, warning: 'Possible hardcoded bearer token' }
    ];

    lines.forEach((line, index) => {
      for (const { pattern, warning } of suspiciousPatterns) {
        if (pattern.test(line) && !line.includes('import.meta.env')) {
          warnings.push(`Line ${index + 1}: ${warning}`);
        }
      }
    });

    return warnings;
  }

  createSafeLogger() {
    return {
      log: (...args: any[]) => {
        const sanitized = args.map(arg => this.sanitizeForLogging(arg));
        console.log(...sanitized);
      },
      error: (...args: any[]) => {
        const sanitized = args.map(arg => this.sanitizeForLogging(arg));
        console.error(...sanitized);
      },
      warn: (...args: any[]) => {
        const sanitized = args.map(arg => this.sanitizeForLogging(arg));
        console.warn(...sanitized);
      },
      info: (...args: any[]) => {
        const sanitized = args.map(arg => this.sanitizeForLogging(arg));
        console.info(...sanitized);
      },
      debug: (...args: any[]) => {
        const sanitized = args.map(arg => this.sanitizeForLogging(arg));
        console.debug(...sanitized);
      }
    };
  }

  validateEnvironmentVariables(): void {
    const validation = this.validateSecrets();

    if (validation.errors.length > 0) {
      console.error('Environment variable validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.warn('Environment variable warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (!validation.isValid) {
      console.error('Please check your .env file and ensure all required variables are set.');
    }
  }

  maskSecret(secret: string, visibleChars: number = 4): string {
    if (!secret || secret.length <= visibleChars * 2) {
      return '[REDACTED]';
    }

    const start = secret.substring(0, visibleChars);
    const end = secret.substring(secret.length - visibleChars);
    const maskedLength = secret.length - (visibleChars * 2);
    const mask = '*'.repeat(Math.min(maskedLength, 8));

    return `${start}${mask}${end}`;
  }

  preventSecretExposure(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const safe = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in safe) {
      if (this.isSecretKey(key)) {
        safe[key] = '[REDACTED]';
      } else if (typeof safe[key] === 'object') {
        safe[key] = this.preventSecretExposure(safe[key]);
      }
    }

    return safe;
  }

  checkForLeakedSecrets(response: Response): void {
    const headerKeys = Array.from(response.headers.keys());

    for (const key of headerKeys) {
      if (this.isSecretKey(key)) {
        console.warn(`Potential secret in response header: ${key}`);
      }
    }
  }

  isProductionMode(): boolean {
    return import.meta.env.MODE === 'production';
  }

  shouldLogSecrets(): boolean {
    return !this.isProductionMode() && import.meta.env.DEV;
  }
}

export const secretsManager = new SecretsManager();

secretsManager.initialize();
secretsManager.validateEnvironmentVariables();

export default secretsManager;
