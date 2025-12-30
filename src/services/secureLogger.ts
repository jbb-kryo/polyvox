import secretsManager from './secretsManager';
import { sanitizeError } from '../utils/errorSanitizer';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

class SecureLogger {
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;
  private productionMode = import.meta.env.MODE === 'production';
  private logToConsole = true;
  private logToHistory = true;

  private createLogEntry(level: LogLevel, args: any[], source?: string): LogEntry {
    const [message, ...data] = args;

    return {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeValue(message),
      data: data.length > 0 ? this.sanitizeValue(data) : undefined,
      source
    };
  }

  private sanitizeValue(value: any): any {
    return secretsManager.sanitizeForLogging(value);
  }

  private writeToConsole(level: LogLevel, ...args: any[]): void {
    if (!this.logToConsole) return;

    const sanitized = args.map(arg => this.sanitizeValue(arg));

    switch (level) {
      case 'debug':
        if (!this.productionMode) {
          console.debug('[DEBUG]', ...sanitized);
        }
        break;
      case 'info':
        console.info('[INFO]', ...sanitized);
        break;
      case 'warn':
        console.warn('[WARN]', ...sanitized);
        break;
      case 'error':
        console.error('[ERROR]', ...sanitized);
        break;
      case 'log':
      default:
        console.log('[LOG]', ...sanitized);
        break;
    }
  }

  private addToHistory(entry: LogEntry): void {
    if (!this.logToHistory) return;

    this.logHistory.push(entry);

    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  debug(...args: any[]): void {
    const entry = this.createLogEntry('debug', args);
    this.addToHistory(entry);
    this.writeToConsole('debug', ...args);
  }

  info(...args: any[]): void {
    const entry = this.createLogEntry('info', args);
    this.addToHistory(entry);
    this.writeToConsole('info', ...args);
  }

  warn(...args: any[]): void {
    const entry = this.createLogEntry('warn', args);
    this.addToHistory(entry);
    this.writeToConsole('warn', ...args);
  }

  error(...args: any[]): void {
    const entry = this.createLogEntry('error', args);
    this.addToHistory(entry);
    this.writeToConsole('error', ...args);
  }

  log(...args: any[]): void {
    const entry = this.createLogEntry('log', args);
    this.addToHistory(entry);
    this.writeToConsole('log', ...args);
  }

  logApiCall(method: string, url: string, data?: any): void {
    const sanitizedUrl = secretsManager.redactSecretFromUrl(url);
    const sanitizedData = data ? this.sanitizeValue(data) : undefined;

    this.info(`API Call: ${method} ${sanitizedUrl}`, sanitizedData);
  }

  logApiResponse(method: string, url: string, status: number, data?: any): void {
    const sanitizedUrl = secretsManager.redactSecretFromUrl(url);
    const sanitizedData = data ? this.sanitizeValue(data) : undefined;

    if (status >= 200 && status < 300) {
      this.info(`API Response: ${method} ${sanitizedUrl} [${status}]`, sanitizedData);
    } else if (status >= 400) {
      this.error(`API Error: ${method} ${sanitizedUrl} [${status}]`, sanitizedData);
    } else {
      this.warn(`API Warning: ${method} ${sanitizedUrl} [${status}]`, sanitizedData);
    }
  }

  logError(error: Error | unknown, context?: string): void {
    const sanitized = sanitizeError(error);
    const contextStr = context ? ` [${context}]` : '';

    if (sanitized instanceof Error) {
      this.error(`Error${contextStr}:`, sanitized.message, sanitized.stack);
    } else {
      this.error(`Error${contextStr}:`, sanitized);
    }
  }

  logSecurityEvent(event: string, details?: any): void {
    const sanitized = details ? this.sanitizeValue(details) : undefined;
    this.warn(`Security Event: ${event}`, sanitized);
  }

  logAuthEvent(event: string, userId?: string): void {
    const maskedUserId = userId ? secretsManager.maskSecret(userId, 4) : 'unknown';
    this.info(`Auth Event: ${event}`, { userId: maskedUserId });
  }

  logWalletOperation(operation: string, address?: string): void {
    const maskedAddress = address ? secretsManager.maskSecret(address, 6) : 'unknown';
    this.info(`Wallet Operation: ${operation}`, { address: maskedAddress });
  }

  logTradeExecution(operation: string, details: any): void {
    const sanitized = this.sanitizeValue(details);
    this.info(`Trade Execution: ${operation}`, sanitized);
  }

  getHistory(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logHistory.filter(entry => entry.level === level);
    }
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    while (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  enableConsoleLogging(): void {
    this.logToConsole = true;
  }

  disableConsoleLogging(): void {
    this.logToConsole = false;
  }

  enableHistoryLogging(): void {
    this.logToHistory = true;
  }

  disableHistoryLogging(): void {
    this.logToHistory = false;
  }

  group(label: string): void {
    if (!this.productionMode) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (!this.productionMode) {
      console.groupEnd();
    }
  }

  table(data: any): void {
    if (!this.productionMode) {
      const sanitized = this.sanitizeValue(data);
      console.table(sanitized);
    }
  }

  time(label: string): void {
    if (!this.productionMode) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (!this.productionMode) {
      console.timeEnd(label);
    }
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      this.error(`Assertion failed: ${message}`);
    }
  }

  deprecation(message: string): void {
    this.warn(`DEPRECATION WARNING: ${message}`);
  }

  trace(): void {
    if (!this.productionMode) {
      console.trace();
    }
  }
}

export const secureLogger = new SecureLogger();

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).secureLogger = secureLogger;
}

export default secureLogger;
