# Input Validation & Sanitization Security Implementation

This document outlines the comprehensive input validation and sanitization security measures implemented across the PolyVOX platform to prevent XSS, SQL injection, and other malicious data entry attacks.

## Table of Contents

1. [Overview](#overview)
2. [Validation System](#validation-system)
3. [Sanitization System](#sanitization-system)
4. [Security Headers](#security-headers)
5. [Database Security](#database-security)
6. [Implementation Examples](#implementation-examples)
7. [Testing Guidelines](#testing-guidelines)

---

## Overview

The application implements a multi-layered security approach:

- **Input Validation**: Validates all user inputs against defined rules before processing
- **Input Sanitization**: Cleans and escapes all user inputs to prevent XSS attacks
- **CSP Headers**: Content Security Policy headers to prevent XSS and other injection attacks
- **Parameterized Queries**: Uses Supabase's query builder to prevent SQL injection
- **Type Safety**: TypeScript provides compile-time type checking

---

## Validation System

### Location
`/src/utils/validation.ts`

### Features

#### Built-in Validators

- **required**: Ensures field has a value
- **min/max**: Numeric range validation
- **minLength/maxLength**: String length validation
- **pattern**: Regex pattern matching
- **email**: Email format validation
- **url**: URL format validation
- **ethereumAddress**: Ethereum address validation (0x + 40 hex chars)
- **percentage**: Validates 0-100 range
- **positiveNumber**: Ensures number is > 0
- **nonNegativeNumber**: Ensures number is >= 0
- **integer**: Validates whole numbers
- **alphanumeric**: Letters and numbers only
- **noSpecialChars**: Alphanumeric plus basic characters (-, _, space)

#### Usage Example

```typescript
import { validateForm, commonSchemas } from '../utils/validation';

const errors = validateForm(formData, {
  amount: {
    required: true,
    min: 0.01,
    max: 1000000,
    custom: validators.positiveNumber,
  },
  slippage: {
    required: true,
    min: 0.1,
    max: 50,
  },
});

if (hasValidationErrors(errors)) {
  // Handle validation errors
  console.error('Validation failed:', errors);
}
```

#### Pre-defined Schemas

Common validation schemas are available in `commonSchemas`:

- `walletAddress`: Ethereum address validation
- `tradeAmount`: Trade amount with range 0.01-1,000,000
- `riskPercentage`: 0-100% validation
- `positionSize`: Position size validation
- `slippageTolerance`: 0.1-50% validation
- `stopLoss`: 0-100% validation
- `takeProfit`: 0-1000% validation
- `minEdge`: 0.01-50% validation
- `maxPositions`: 1-100 integer validation
- `marketId`: Market ID string validation
- `tokenId`: Token ID string validation

---

## Sanitization System

### Location
`/src/utils/sanitization.ts`

### Features

#### Core Sanitizers

1. **escapeHtml**: Escapes HTML special characters to prevent XSS
   ```typescript
   escapeHtml('<script>alert("xss")</script>');
   // Returns: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
   ```

2. **stripHtml**: Removes all HTML tags
   ```typescript
   stripHtml('<b>Hello</b> World');
   // Returns: Hello World
   ```

3. **sanitizeString**: Comprehensive string sanitization with length limits
   ```typescript
   sanitizeString(userInput, 1000); // Max 1000 chars, HTML escaped
   ```

4. **sanitizeUrl**: Validates and sanitizes URLs, blocks dangerous protocols
   ```typescript
   sanitizeUrl('javascript:alert(1)'); // Returns: ''
   sanitizeUrl('https://example.com'); // Returns: 'https://example.com'
   ```

5. **sanitizeEthereumAddress**: Validates and normalizes Ethereum addresses
   ```typescript
   sanitizeEthereumAddress('0xABC...'); // Returns lowercase valid address
   ```

6. **sanitizeNumber**: Safely converts to number with optional min/max clamping
   ```typescript
   sanitizeNumber('123.45', 0, 100); // Returns: 100 (clamped)
   ```

7. **sanitizeInteger**: Safely converts to integer with optional range
   ```typescript
   sanitizeInteger('123.45', 0, 100); // Returns: 100
   ```

8. **sanitizeBoolean**: Safely converts various inputs to boolean
   ```typescript
   sanitizeBoolean('true'); // Returns: true
   sanitizeBoolean('1');    // Returns: true
   sanitizeBoolean('no');   // Returns: false
   ```

#### Specialized Sanitizers

- **sanitizeAlphanumeric**: Removes all non-alphanumeric characters
- **sanitizeAlphanumericWithSpaces**: Allows letters, numbers, spaces, -, _
- **sanitizeJson**: Safely parses JSON with size limits
- **sanitizeArray**: Sanitizes array elements with custom sanitizer function
- **sanitizeObject**: Sanitizes object properties with schema
- **removeNullBytes**: Removes null bytes from strings
- **normalizeWhitespace**: Normalizes multiple spaces to single space
- **sanitizeFilename**: Creates safe filenames (255 char limit)
- **sanitizeEmail**: Validates and normalizes email addresses
- **sanitizeMarketId**: Sanitizes market identifiers
- **sanitizeTokenId**: Sanitizes token identifiers

---

## Security Headers

### Location
`/public/_headers`

### Implemented Headers

#### 1. Content Security Policy (CSP)
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://clob.polymarket.com https://gamma-api.polymarket.com wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content;
```

**Purpose**: Prevents XSS attacks by restricting resource loading

#### 2. X-Frame-Options
```
X-Frame-Options: DENY
```
**Purpose**: Prevents clickjacking attacks

#### 3. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
**Purpose**: Prevents MIME type sniffing

#### 4. X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
**Purpose**: Enables browser XSS filtering

#### 5. Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
**Purpose**: Controls referrer information leakage

#### 6. Permissions-Policy
```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
```
**Purpose**: Disables unnecessary browser features

#### 7. Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
**Purpose**: Forces HTTPS connections

#### 8. Cross-Origin Policies
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```
**Purpose**: Prevents cross-origin attacks

---

## Database Security

### SQL Injection Prevention

The application uses Supabase's query builder which automatically uses parameterized queries:

```typescript
// SAFE - Parameterized query
await supabase
  .from('positions')
  .select('*')
  .eq('user_id', userId)  // Automatically parameterized
  .eq('status', 'open');

// SAFE - Insert with object
await supabase
  .from('trades')
  .insert({
    user_id: userId,
    amount: amount,
    price: price
  });
```

### Row Level Security (RLS)

All database tables have RLS enabled and proper policies:

```sql
-- Example RLS Policy
CREATE POLICY "Users can only access their own data"
  ON positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Additional Protections

1. **Type Safety**: TypeScript ensures correct data types at compile time
2. **Validation Before DB**: All inputs are validated before database operations
3. **Sanitization**: All string inputs are sanitized to remove malicious content
4. **Authentication Required**: Most operations require authenticated user

---

## Implementation Examples

### Example 1: Form Validation in AuthModal

```typescript
import { sanitizeEmail, sanitizeString } from '../utils/sanitization';
import { validateEmail } from '../services/auth';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Sanitize inputs
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedPassword = sanitizeString(password, 100);

  // Validate
  if (!sanitizedEmail || !validateEmail(sanitizedEmail)) {
    setError('Please enter a valid email address');
    return;
  }

  if (!sanitizedPassword || sanitizedPassword.length === 0) {
    setError('Password is required');
    return;
  }

  // Proceed with sanitized data
  await signIn(sanitizedEmail, sanitizedPassword);
};
```

### Example 2: Risk Limits Validation

```typescript
import { sanitizeNumber, clampNumber } from '../utils/validation';

const handleSave = async () => {
  const sanitizedData = {
    maxPositionSize: clampNumber(
      sanitizeNumber(formData.maxPositionSize, 0),
      0,
      1000000
    ),
    maxDailyLoss: clampNumber(
      sanitizeNumber(formData.maxDailyLoss, 0),
      0,
      1000000
    ),
  };

  // Additional validation
  if (sanitizedData.maxPositionSize <= 0) {
    toast.error('Max position size must be greater than 0');
    return;
  }

  // Save sanitized data
  await riskLimitsService.updateRiskLimits(userId, sanitizedData);
};
```

### Example 3: Trade Input Sanitization

```typescript
import { sanitizeTradeInput } from '../services/inputSanitization';

const executeTrade = async (input: Partial<TradeInputs>) => {
  // Sanitize all trade inputs
  const sanitized = sanitizeTradeInput(input);

  if (!sanitized) {
    throw new Error('Invalid trade parameters');
  }

  // All inputs are now validated and sanitized
  await executeOrder(sanitized);
};
```

---

## Testing Guidelines

### Manual Testing

1. **XSS Attempts**
   - Try entering `<script>alert('xss')</script>` in text fields
   - Try entering `javascript:alert(1)` in URL fields
   - Verify inputs are escaped/sanitized

2. **SQL Injection Attempts**
   - Try entering `'; DROP TABLE users; --` in fields
   - Verify parameterized queries prevent injection

3. **Range Validation**
   - Enter negative numbers where only positive allowed
   - Enter numbers beyond max/min limits
   - Enter non-numeric values in numeric fields

4. **Format Validation**
   - Enter invalid email formats
   - Enter invalid Ethereum addresses
   - Enter special characters in alphanumeric fields

### Automated Testing

Create test cases for each validator:

```typescript
describe('Validation Tests', () => {
  test('should reject invalid email', () => {
    expect(validators.email('invalid')).toBeTruthy();
    expect(validators.email('test@example.com')).toBeNull();
  });

  test('should clamp numbers to range', () => {
    expect(clampNumber(150, 0, 100)).toBe(100);
    expect(clampNumber(-10, 0, 100)).toBe(0);
  });

  test('should sanitize HTML', () => {
    const result = escapeHtml('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
  });
});
```

### Security Checklist

- [ ] All form inputs have validation
- [ ] All numeric inputs have min/max ranges
- [ ] All string inputs are sanitized
- [ ] All URLs are validated for safe protocols
- [ ] Ethereum addresses follow 0x[40 hex] format
- [ ] CSP headers are properly configured
- [ ] Database queries use parameterized approach
- [ ] No user input is directly interpolated into queries
- [ ] Error messages don't leak sensitive information
- [ ] File uploads (if any) are validated and sanitized

---

## Security Best Practices

### Do's

1. **Always sanitize user input** before displaying or storing
2. **Validate on both client and server** (defense in depth)
3. **Use type-safe functions** from validation/sanitization utilities
4. **Test edge cases** like empty strings, null, undefined, very large numbers
5. **Log security events** for monitoring and auditing
6. **Keep dependencies updated** to patch security vulnerabilities
7. **Use HTTPS everywhere** to prevent MITM attacks
8. **Implement rate limiting** on sensitive endpoints
9. **Use strong password policies** (implemented in auth service)
10. **Enable 2FA** where possible

### Don'ts

1. **Don't trust client-side validation alone** - always validate server-side
2. **Don't use `innerHTML`** - use `textContent` or sanitize first
3. **Don't concatenate SQL queries** - use parameterized queries
4. **Don't store sensitive data** in localStorage without encryption
5. **Don't expose stack traces** in production error messages
6. **Don't disable CSP** for convenience
7. **Don't use `eval()`** or `Function()` constructor with user input
8. **Don't ignore TypeScript errors** - they often indicate security issues
9. **Don't log sensitive information** (passwords, private keys, etc.)
10. **Don't use deprecated security headers**

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

## Conclusion

The PolyVOX platform implements comprehensive input validation and sanitization to protect against common web vulnerabilities. All user inputs are validated for format and range, sanitized to prevent XSS attacks, and processed through parameterized queries to prevent SQL injection.

The multi-layered approach includes:
- Client-side validation for immediate feedback
- Sanitization to clean malicious input
- Strict CSP headers to prevent XSS
- Parameterized database queries to prevent SQL injection
- Type safety through TypeScript
- Row Level Security in the database

Regular security audits and penetration testing are recommended to ensure ongoing protection against evolving threats.
