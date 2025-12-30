# Secrets Management Guide

This document outlines how PolyVOX handles secrets, API keys, and sensitive data to ensure maximum security and prevent accidental exposure.

## Table of Contents

1. [Overview](#overview)
2. [No Hardcoded Secrets Policy](#no-hardcoded-secrets-policy)
3. [Environment Variables](#environment-variables)
4. [Secrets Manager Service](#secrets-manager-service)
5. [Secure Logger](#secure-logger)
6. [Error Sanitization](#error-sanitization)
7. [Best Practices](#best-practices)
8. [Security Checklist](#security-checklist)
9. [Common Pitfalls](#common-pitfalls)
10. [Testing for Secret Leaks](#testing-for-secret-leaks)

---

## Overview

PolyVOX implements multiple layers of protection to prevent secrets from being exposed:

1. **No Hardcoded Secrets**: All secrets must be in environment variables
2. **Log Sanitization**: All logs automatically sanitize sensitive data
3. **Error Sanitization**: Error messages never expose secrets
4. **Secure Storage**: Private keys encrypted with AES-256-GCM
5. **Runtime Protection**: Secrets Manager monitors and prevents exposure

### What Counts as a Secret?

- Private keys (Ethereum wallet keys)
- API keys (Polymarket, Supabase, etc.)
- Passwords and master passwords
- Authentication tokens
- Session tokens
- Encrypted data keys
- Database credentials
- Service account credentials

---

## No Hardcoded Secrets Policy

### NEVER Do This

```typescript
// ❌ WRONG - Hardcoded API key
const API_KEY = 'sk_live_abc123...';

// ❌ WRONG - Hardcoded private key
const privateKey = '0x1234567890abcdef...';

// ❌ WRONG - Hardcoded password
const password = 'MySecretPassword123';

// ❌ WRONG - Hardcoded token
fetch('https://api.example.com', {
  headers: { 'Authorization': 'Bearer abc123xyz...' }
});
```

### DO This Instead

```typescript
// ✅ CORRECT - Use environment variables
const API_KEY = import.meta.env.VITE_API_KEY;

// ✅ CORRECT - Get from secure storage
const privateKey = await getDecryptedPrivateKey(masterPassword);

// ✅ CORRECT - Never store passwords, hash them
const hashedPassword = await hashPassword(password);

// ✅ CORRECT - Use secrets manager
import secretsManager from './services/secretsManager';
const apiKey = secretsManager.getSecret('API_KEY');
```

---

## Environment Variables

### Required Environment Variables

All secrets must be stored in environment variables. Create a `.env` file (never commit this file):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Additional API Keys
# VITE_POLYMARKET_API_KEY=your-api-key-here
```

### Environment Variable Rules

1. **Prefix**: All client-side env vars must start with `VITE_`
2. **Never Commit**: Add `.env` to `.gitignore`
3. **Use Example File**: Provide `.env.example` without real values
4. **Document**: Document all required variables in README
5. **Validate**: Use secrets manager to validate on startup

### Example `.env.example`

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional Configuration
# VITE_CUSTOM_API_KEY=your-api-key-here
```

---

## Secrets Manager Service

Location: `src/services/secretsManager.ts`

### Features

- **Centralized Secret Access**: Single point for all secret retrieval
- **Validation**: Validates all secrets on startup
- **Sanitization**: Provides sanitization utilities
- **Logging Protection**: Prevents secrets in logs
- **Development Helpers**: Additional checks in dev mode

### Usage

#### Initialize (automatic on import)

```typescript
import secretsManager from './services/secretsManager';
```

#### Get Secret

```typescript
const supabaseUrl = secretsManager.getSecret('SUPABASE_URL');
const anonKey = secretsManager.getSecret('SUPABASE_ANON_KEY');

if (!supabaseUrl || !anonKey) {
  console.error('Missing required secrets');
}
```

#### Validate Secrets

```typescript
const validation = secretsManager.validateSecrets();

if (!validation.isValid) {
  console.error('Secret validation failed:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Secret warnings:', validation.warnings);
}
```

#### Sanitize for Logging

```typescript
const userData = {
  email: 'user@example.com',
  privateKey: '0xabc123...',
  balance: 1000
};

const safe = secretsManager.sanitizeForLogging(userData);
console.log(safe);
```

Output:
```javascript
{
  email: 'user@example.com',
  privateKey: '[REDACTED]',
  balance: 1000
}
```

#### Check if Key is Secret

```typescript
const isSecret = secretsManager.isSecretKey('privateKey'); // true
const isSecret2 = secretsManager.isSecretKey('balance'); // false
```

#### Mask Secret for Display

```typescript
const masked = secretsManager.maskSecret('0x1234567890abcdef1234567890abcdef', 4);
console.log(masked); // "0x12********cdef"
```

#### Redact Secret from URL

```typescript
const url = 'https://api.example.com?apiKey=secret123&page=1';
const safe = secretsManager.redactSecretFromUrl(url);
console.log(safe); // "https://api.example.com?apiKey=[REDACTED]&page=1"
```

#### Create Safe Logger

```typescript
const logger = secretsManager.createSafeLogger();

logger.log('User data:', {
  email: 'user@example.com',
  privateKey: '0xabc...',
  balance: 1000
});
```

All output is automatically sanitized.

---

## Secure Logger

Location: `src/services/secureLogger.ts`

### Features

- **Automatic Sanitization**: All logs sanitized before output
- **Log History**: Keeps sanitized log history
- **Level Filtering**: Support for debug, info, warn, error
- **Production Mode**: Reduces logging in production
- **Specialized Loggers**: For API, auth, wallet operations

### Usage

#### Basic Logging

```typescript
import secureLogger from './services/secureLogger';

secureLogger.log('Application started');
secureLogger.info('User logged in', { userId: 'abc123' });
secureLogger.warn('Rate limit approaching');
secureLogger.error('Operation failed', error);
secureLogger.debug('Debug info', { data: 'sensitive' });
```

#### API Call Logging

```typescript
secureLogger.logApiCall('POST', 'https://api.example.com/orders', orderData);

secureLogger.logApiResponse('POST', 'https://api.example.com/orders', 201, response);
```

#### Error Logging with Context

```typescript
try {
  await executeOrder(orderData);
} catch (error) {
  secureLogger.logError(error, 'Order Execution');
}
```

#### Security Event Logging

```typescript
secureLogger.logSecurityEvent('Rate Limit Exceeded', {
  userId: 'abc123',
  attempts: 5
});
```

#### Authentication Logging

```typescript
secureLogger.logAuthEvent('Login Success', userId);
secureLogger.logAuthEvent('Login Failed', userId);
secureLogger.logAuthEvent('Password Reset Requested', userId);
```

#### Wallet Operation Logging

```typescript
secureLogger.logWalletOperation('Balance Check', walletAddress);
secureLogger.logWalletOperation('Order Signed', walletAddress);
```

#### Trade Execution Logging

```typescript
secureLogger.logTradeExecution('Buy Order Created', {
  marketId: 'market-123',
  amount: 100,
  price: 0.5
});
```

#### Get Log History

```typescript
const allLogs = secureLogger.getHistory();
const errors = secureLogger.getHistory('error');

secureLogger.clearHistory();
```

#### Export Logs

```typescript
const logsJson = secureLogger.exportLogs();
console.log(logsJson);
```

#### Configuration

```typescript
secureLogger.setMaxHistorySize(200);

secureLogger.disableConsoleLogging();
secureLogger.enableConsoleLogging();

secureLogger.disableHistoryLogging();
secureLogger.enableHistoryLogging();
```

---

## Error Sanitization

Location: `src/utils/errorSanitizer.ts`

### Features

- **Pattern Matching**: Detects and redacts common secret patterns
- **Recursive**: Sanitizes nested objects and arrays
- **Key Detection**: Identifies secret keys by name
- **URL Sanitization**: Removes secrets from URLs
- **Analytics Safe**: Sanitizes data for analytics

### Usage

#### Sanitize Errors

```typescript
import { sanitizeError } from './utils/errorSanitizer';

try {
  throw new Error('Failed with key: 0xabc123...');
} catch (error) {
  const safe = sanitizeError(error);
  console.error(safe); // Error message is sanitized
}
```

#### Safe Console Logging

```typescript
import { safeConsoleLog, safeConsoleError } from './utils/errorSanitizer';

safeConsoleLog('User data:', userData);
safeConsoleError('Error occurred:', error);
```

#### Sanitize for Analytics

```typescript
import { sanitizeForAnalytics } from './utils/errorSanitizer';

const event = {
  action: 'order_created',
  userId: 'user-123',
  privateKey: '0xabc...',
  amount: 100
};

const safe = sanitizeForAnalytics(event);
analytics.track(safe);
```

#### Sanitize Objects

```typescript
import { sanitizeObject } from './utils/errorSanitizer';

const data = {
  user: {
    email: 'user@example.com',
    password: 'secret123',
    privateKey: '0xabc...'
  }
};

const safe = sanitizeObject(data);
```

#### Sanitize URLs

```typescript
import { sanitizeUrl } from './utils/errorSanitizer';

const url = 'https://api.example.com?token=secret&page=1';
const safe = sanitizeUrl(url);
console.log(safe); // "https://api.example.com?token=[REDACTED]&page=1"
```

---

## Best Practices

### 1. Use Environment Variables

```typescript
// ✅ CORRECT
const apiKey = import.meta.env.VITE_API_KEY;
```

### 2. Never Log Secrets

```typescript
// ❌ WRONG
console.log('Private key:', privateKey);

// ✅ CORRECT
import secureLogger from './services/secureLogger';
secureLogger.log('Private key:', privateKey); // Auto-sanitized
```

### 3. Sanitize Error Messages

```typescript
// ❌ WRONG
throw new Error(`Invalid private key: ${privateKey}`);

// ✅ CORRECT
import { sanitizeError } from './utils/errorSanitizer';
throw sanitizeError(new Error('Invalid private key'));
```

### 4. Use Secure Storage

```typescript
// ❌ WRONG
localStorage.setItem('privateKey', privateKey);

// ✅ CORRECT
const encrypted = await encryptPrivateKey(privateKey, masterPassword);
localStorage.setItem('encryptedPrivateKey', encrypted);
```

### 5. Mask Secrets in UI

```typescript
// ✅ CORRECT
import secretsManager from './services/secretsManager';
const masked = secretsManager.maskSecret(privateKey);
return <div>Key: {masked}</div>;
```

### 6. Check for Secrets Before Committing

```bash
# Use git hooks to scan for secrets
git diff --cached | grep -i "private.*key\|password\|secret\|api.*key"
```

### 7. Use Secure Logger for All Logging

```typescript
// ❌ WRONG
console.log('Data:', data);

// ✅ CORRECT
import secureLogger from './services/secureLogger';
secureLogger.log('Data:', data);
```

### 8. Validate Secrets on Startup

```typescript
import secretsManager from './services/secretsManager';

secretsManager.validateEnvironmentVariables();
```

### 9. Never Expose Secrets in API Responses

```typescript
// ❌ WRONG
return { user, privateKey };

// ✅ CORRECT
return { user: { id: user.id, email: user.email } };
```

### 10. Use Secrets Manager for Access

```typescript
// ✅ CORRECT
import secretsManager from './services/secretsManager';
const key = secretsManager.getSecret('API_KEY');
```

---

## Security Checklist

Use this checklist before committing code:

- [ ] No hardcoded API keys or secrets
- [ ] All secrets in environment variables
- [ ] `.env` file in `.gitignore`
- [ ] `.env.example` provided without real values
- [ ] All logs use `secureLogger`
- [ ] Error messages sanitized
- [ ] No secrets in URL parameters (or sanitized)
- [ ] Private keys encrypted before storage
- [ ] Secrets masked in UI displays
- [ ] No secrets in analytics events
- [ ] No secrets in database (except encrypted)
- [ ] Secrets Manager used for access
- [ ] Environment variables validated on startup
- [ ] Code reviewed for secret exposure
- [ ] Tests don't use real secrets

---

## Common Pitfalls

### 1. Logging Request/Response Objects

```typescript
// ❌ WRONG - May contain secrets in headers
console.log('Request:', request);

// ✅ CORRECT
secureLogger.logApiCall(request.method, request.url, request.body);
```

### 2. Error Stack Traces

```typescript
// ❌ WRONG - Stack may contain secrets
console.error(error.stack);

// ✅ CORRECT
import { sanitizeError } from './utils/errorSanitizer';
console.error(sanitizeError(error));
```

### 3. URL Query Parameters

```typescript
// ❌ WRONG
const url = `https://api.com?apiKey=${apiKey}`;

// ✅ CORRECT
fetch('https://api.com', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

### 4. LocalStorage Without Encryption

```typescript
// ❌ WRONG
localStorage.setItem('key', privateKey);

// ✅ CORRECT
const encrypted = await encrypt(privateKey, password);
localStorage.setItem('key', encrypted);
```

### 5. Git Commits

```typescript
// ❌ WRONG - Committed .env file
git add .env

// ✅ CORRECT - Never commit .env
# Add to .gitignore
.env
.env.local
.env.*.local
```

### 6. Client-Side Secret Keys

```typescript
// ❌ WRONG - Service role key exposed
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SERVICE_KEY;

// ✅ CORRECT - Only use anon key client-side
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 7. Error Messages to Users

```typescript
// ❌ WRONG
toast.error(`Failed: ${error.message}`); // May contain secrets

// ✅ CORRECT
import { sanitizeError } from './utils/errorSanitizer';
toast.error(`Failed: ${sanitizeError(error).message}`);
```

---

## Testing for Secret Leaks

### Manual Testing

1. **Search Codebase**
   ```bash
   grep -r "sk_" src/
   grep -r "0x[a-f0-9]{64}" src/
   grep -r "password.*=.*['\"]" src/
   ```

2. **Check Console Logs**
   - Open browser DevTools
   - Check Console tab
   - Perform actions that might log secrets
   - Verify all output is sanitized

3. **Check Network Tab**
   - Open browser DevTools
   - Check Network tab
   - Verify no secrets in URLs
   - Verify secrets only in secure headers (if needed)

4. **Check LocalStorage**
   - Open browser DevTools
   - Check Application > Local Storage
   - Verify private keys are encrypted
   - Verify no plain-text secrets

5. **Check Error Messages**
   - Trigger errors
   - Verify error messages don't expose secrets
   - Check both console and UI errors

### Automated Testing

```typescript
import secretsManager from './services/secretsManager';

describe('Secret Protection', () => {
  it('should sanitize secrets in logs', () => {
    const data = {
      privateKey: '0xabc123...',
      balance: 1000
    };

    const sanitized = secretsManager.sanitizeForLogging(data);

    expect(sanitized.privateKey).toBe('[REDACTED]');
    expect(sanitized.balance).toBe(1000);
  });

  it('should detect secret keys', () => {
    expect(secretsManager.isSecretKey('privateKey')).toBe(true);
    expect(secretsManager.isSecretKey('password')).toBe(true);
    expect(secretsManager.isSecretKey('balance')).toBe(false);
  });

  it('should mask secrets', () => {
    const secret = '0x1234567890abcdef';
    const masked = secretsManager.maskSecret(secret, 4);

    expect(masked).toContain('****');
    expect(masked).not.toContain(secret);
  });
});
```

### CI/CD Checks

Add to your CI pipeline:

```bash
# Check for hardcoded secrets
npm run check-secrets

# Scan for common secret patterns
git grep -E "(api[_-]?key|password|secret|private[_-]?key).*=.*['\"][a-zA-Z0-9]{20,}['\"]"

# Use tools like truffleHog or gitleaks
gitleaks detect --source . --verbose
```

---

## Emergency Response

### If Secrets Are Exposed

1. **Immediate Actions**:
   - Rotate all exposed secrets immediately
   - Revoke exposed API keys
   - Reset compromised passwords
   - Generate new private keys (transfer funds first)

2. **Assessment**:
   - Determine scope of exposure
   - Check logs for unauthorized access
   - Identify when exposure occurred
   - Review recent activity

3. **Remediation**:
   - Remove secrets from code/commits
   - Update `.gitignore`
   - Use BFG Repo-Cleaner for git history
   - Force push cleaned history (if needed)

4. **Prevention**:
   - Review secrets management practices
   - Add additional checks to CI/CD
   - Implement pre-commit hooks
   - Train team on security practices

### Remove Secrets from Git History

```bash
# Using BFG Repo-Cleaner
bfg --replace-text passwords.txt --no-blob-protection repo.git

# Using git filter-branch (slower)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/secret/file' \
  --prune-empty --tag-name-filter cat -- --all
```

---

## Resources

### Documentation
- [Secrets Manager](src/services/secretsManager.ts)
- [Secure Logger](src/services/secureLogger.ts)
- [Error Sanitizer](src/utils/errorSanitizer.ts)
- [Security Policy](SECURITY.md)

### Tools
- [gitleaks](https://github.com/gitleaks/gitleaks) - Scan for secrets
- [truffleHog](https://github.com/trufflesecurity/truffleHog) - Find secrets in git
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) - Remove secrets from history

### Best Practices
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App: Config](https://12factor.net/config)

---

## Contact

For security concerns or questions about secrets management:
- GitHub Security Advisories: [Report a vulnerability](https://github.com/jbb-kryo/polyvox/security/advisories/new)
- Security Policy: [SECURITY.md](SECURITY.md)

---

**Last Updated**: December 2024

Thank you for helping keep PolyVOX secure!
