# Rate Limiting System

This document provides comprehensive information about the rate limiting system implemented in PolyVOX to prevent abuse, manage system resources, and ensure fair usage.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Default Rate Limits](#default-rate-limits)
4. [Implementation](#implementation)
5. [Usage Examples](#usage-examples)
6. [Monitoring & Configuration](#monitoring--configuration)
7. [Error Handling](#error-handling)
8. [Database Schema](#database-schema)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

---

## Overview

The rate limiting system protects the platform from:
- Accidental spam or infinite loops
- Malicious abuse or DoS attacks
- Resource exhaustion
- Excessive API costs
- Unintended trading activity

### Key Features

- **Sliding Window Algorithm**: Accurate rate limiting with configurable time windows
- **Multiple Time Windows**: Per-minute, per-hour, and per-day limits
- **User-Specific Quotas**: Each user has their own rate limits
- **Action-Type Specific**: Different limits for different actions
- **Real-time Tracking**: Records every action for accurate limiting
- **Violation Logging**: Tracks and reports rate limit violations
- **Configurable Limits**: Users can adjust their own limits
- **Database-Backed**: Persists across sessions and server restarts
- **Auto-Cleanup**: Old tracking data automatically removed

---

## Architecture

### Components

1. **Database Layer**
   - `rate_limit_configs`: Stores configuration per user and action type
   - `rate_limit_tracking`: Records each action with timestamp
   - `rate_limit_violations`: Logs when limits are exceeded
   - Database functions for efficient checking and cleanup

2. **Service Layer**
   - `rateLimiter` service: Core rate limiting logic
   - Integration with existing services (orderExecution, moduleSettings, apiRateLimiter)
   - Helper methods for checking, recording, and formatting errors

3. **UI Layer**
   - `RateLimitMonitor` component: View and configure limits
   - Toast notifications for limit violations
   - Real-time usage display

### Flow Diagram

```
User Action
    ↓
Check Rate Limit (DB function)
    ↓
    ├─ Not Limited → Record Action → Proceed
    └─ Limited → Record Violation → Show Error → Reject
```

---

## Default Rate Limits

When a user first uses the system, these default limits are automatically created:

| Action Type | Per Minute | Per Hour | Per Day |
|------------|------------|----------|---------|
| **Trade Execution** | 5 | 100 | 500 |
| **Module Toggle** | 10 | 50 | 200 |
| **API Call** | 30 | 500 | 5,000 |
| **Market Data Fetch** | 60 | 1,000 | 10,000 |
| **Position Update** | 20 | 200 | 1,000 |
| **Wallet Operation** | 5 | 30 | 100 |

### Rationale

- **Trade Execution**: Conservative limits to prevent accidental mass trading
- **Module Toggle**: Prevents rapid on/off cycling
- **API Call**: Balances functionality with API cost management
- **Market Data Fetch**: Allows frequent updates while preventing abuse
- **Position Update**: Permits active management without spam
- **Wallet Operations**: Restricted for security

---

## Implementation

### Database Migration

The rate limiting system is implemented via migration `create_rate_limiting_system.sql`:

```sql
-- Core tables
CREATE TABLE rate_limit_configs (...)
CREATE TABLE rate_limit_tracking (...)
CREATE TABLE rate_limit_violations (...)

-- Functions
CREATE FUNCTION is_rate_limited(...)
CREATE FUNCTION record_and_check_rate_limit(...)
CREATE FUNCTION initialize_user_rate_limits(...)
CREATE FUNCTION cleanup_old_rate_limit_tracking(...)
```

### Service Integration

#### 1. Module Activation
Location: `src/services/database/moduleSettings.ts`

```typescript
import rateLimiter from '../rateLimiter';

export async function saveModuleSettings(...) {
  const rateLimitCheck = await rateLimiter.checkRateLimit(
    userId,
    'module_toggle',
    { moduleName, isActive }
  );

  if (rateLimitCheck.limited) {
    rateLimiter.showRateLimitToast(rateLimitCheck);
    return false;
  }

  // Proceed with save...
}
```

#### 2. Trade Execution
Location: `src/services/orderExecution.ts`

```typescript
import rateLimiter from './rateLimiter';

async createOrder(request: CreateOrderRequest) {
  const rateLimitCheck = await rateLimiter.checkRateLimit(
    request.userId,
    'trade_execution',
    { moduleType, marketId, side, paperTrading }
  );

  if (rateLimitCheck.limited) {
    rateLimiter.showRateLimitToast(rateLimitCheck);
    throw new Error(rateLimiter.formatRateLimitError(rateLimitCheck));
  }

  // Proceed with order creation...
}
```

#### 3. API Calls
Location: `src/services/apiRateLimiter.ts`

```typescript
import rateLimiter from './rateLimiter';

async requestWithUserLimit<T>(userId: string, ...) {
  const check = await rateLimiter.checkRateLimit(
    userId,
    'api_call',
    { endpoint, key }
  );

  if (check.limited) {
    rateLimiter.showRateLimitToast(check);
    throw new Error(rateLimiter.formatRateLimitError(check));
  }

  return this.request(key, executor, options);
}
```

---

## Usage Examples

### Example 1: Check Before Action

```typescript
import rateLimiter from './services/rateLimiter';

async function performAction(userId: string) {
  // Check only (doesn't record)
  const check = await rateLimiter.checkOnly(userId, 'trade_execution');

  if (check.limited) {
    console.log('Rate limited:', rateLimiter.formatRateLimitError(check));
    return;
  }

  // Proceed with action...
}
```

### Example 2: Check and Record

```typescript
async function executeAction(userId: string) {
  // Check and record in one call
  const check = await rateLimiter.checkRateLimit(
    userId,
    'trade_execution',
    { marketId: '0x123', side: 'BUY' }
  );

  if (check.limited) {
    rateLimiter.showRateLimitToast(check, 'Trade');
    return;
  }

  // Action allowed, already recorded
  await executeTrade();
}
```

### Example 3: Wrapper Pattern

```typescript
async function safeExecute(userId: string) {
  return await rateLimiter.withRateLimit(
    userId,
    'api_call',
    async () => {
      // Your action here
      return await fetchMarketData();
    },
    { endpoint: 'market-data' },
    true // show toast on limit
  );
}
```

### Example 4: Get Current Usage

```typescript
async function showUsage(userId: string) {
  const usage = await rateLimiter.getCurrentUsage(userId, 'trade_execution');

  if (usage) {
    console.log('Usage:');
    console.log(`  Per minute: ${usage.perMinute}/${usage.limits.perMinute}`);
    console.log(`  Per hour: ${usage.perHour}/${usage.limits.perHour}`);
    console.log(`  Per day: ${usage.perDay}/${usage.limits.perDay}`);
  }
}
```

### Example 5: Update Configuration

```typescript
async function updateLimits(userId: string) {
  const success = await rateLimiter.updateConfig(
    userId,
    'trade_execution',
    {
      limitPerMinute: 10,
      limitPerHour: 200,
      limitPerDay: 1000,
      enabled: true
    }
  );

  if (success) {
    console.log('Limits updated successfully');
  }
}
```

---

## Monitoring & Configuration

### RateLimitMonitor Component

Location: `src/components/RateLimitMonitor.tsx`

The monitoring component provides:
- View current rate limit configurations
- Edit limits per action type
- View recent violations
- Enable/disable limits per action
- Real-time usage display

### Usage in Application

```typescript
import RateLimitMonitor from './components/RateLimitMonitor';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <RateLimitMonitor />
    </div>
  );
}
```

### Configuration UI

Users can:
1. Click "Edit" on any action type
2. Modify per-minute, per-hour, and per-day limits
3. Enable or disable the limit
4. Save changes
5. View immediate effect

---

## Error Handling

### Rate Limit Check Response

```typescript
interface RateLimitCheck {
  limited: boolean;
  reason: 'per_minute' | 'per_hour' | 'per_day' | null;
  limit?: number;          // The limit that was exceeded
  current?: number;        // Current usage count
  resetInSeconds?: number; // When the limit resets
  usage?: {                // Current usage (when not limited)
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}
```

### Error Messages

Rate limit errors are automatically formatted with user-friendly messages:

```
"Rate limit exceeded: 6/5 per minute. Try again in 45 seconds."
"Rate limit exceeded: 101/100 per hour. Try again in 42 minutes."
"Rate limit exceeded: 501/500 per day. Try again in 18 hours."
```

### Toast Notifications

```typescript
rateLimiter.showRateLimitToast(check, 'Trade execution');
```

Displays:
- Red error toast
- Timer icon
- Clear message about limit and reset time
- 5-second duration

### Exception Handling

```typescript
try {
  await createOrder(orderRequest);
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // Handle rate limit error
    console.log('User hit rate limit');
  } else {
    // Handle other errors
    throw error;
  }
}
```

---

## Database Schema

### rate_limit_configs

```sql
CREATE TABLE rate_limit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  limit_per_minute integer DEFAULT 10,
  limit_per_hour integer DEFAULT 100,
  limit_per_day integer DEFAULT 1000,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action_type)
);
```

### rate_limit_tracking

```sql
CREATE TABLE rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### rate_limit_violations

```sql
CREATE TABLE rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  limit_type text NOT NULL,
  limit_value integer NOT NULL,
  attempted_action jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

### Indexes

```sql
-- Fast lookup by user and action
CREATE INDEX idx_rate_limit_configs_user_action
  ON rate_limit_configs(user_id, action_type);

-- Fast lookup for tracking records
CREATE INDEX idx_rate_limit_tracking_user_action
  ON rate_limit_tracking(user_id, action_type);

-- Fast range queries on timestamp
CREATE INDEX idx_rate_limit_tracking_timestamp
  ON rate_limit_tracking(timestamp DESC);

-- Fast violation queries
CREATE INDEX idx_rate_limit_violations_user
  ON rate_limit_violations(user_id, timestamp DESC);
```

---

## API Reference

### RateLimiterService

#### `initializeUserLimits(userId: string): Promise<boolean>`

Initializes default rate limits for a user. Called automatically on first use.

#### `checkRateLimit(userId: string, actionType: ActionType, metadata?: Record<string, any>): Promise<RateLimitCheck>`

Checks if action is rate limited and records it if not.

**Parameters:**
- `userId`: User ID
- `actionType`: Type of action (trade_execution, module_toggle, etc.)
- `metadata`: Optional metadata to store with the action

**Returns:** `RateLimitCheck` object

#### `checkOnly(userId: string, actionType: ActionType): Promise<RateLimitCheck>`

Checks if action would be rate limited without recording it.

#### `getConfig(userId: string, actionType: ActionType): Promise<RateLimitConfig | null>`

Gets rate limit configuration for a specific action type.

#### `getAllConfigs(userId: string): Promise<RateLimitConfig[]>`

Gets all rate limit configurations for a user.

#### `updateConfig(userId: string, actionType: ActionType, config: Partial<RateLimitConfig>): Promise<boolean>`

Updates rate limit configuration.

#### `getCurrentUsage(userId: string, actionType: ActionType): Promise<RateLimitUsage | null>`

Gets current usage across all time windows.

#### `getViolations(userId: string, limit?: number): Promise<RateLimitViolation[]>`

Gets recent rate limit violations.

#### `formatRateLimitError(check: RateLimitCheck): string`

Formats a rate limit check into a user-friendly error message.

#### `showRateLimitToast(check: RateLimitCheck, actionName?: string): void`

Shows a toast notification for a rate limit violation.

#### `withRateLimit<T>(userId: string, actionType: ActionType, action: () => Promise<T>, metadata?: Record<string, any>, showToast?: boolean): Promise<T | null>`

Wrapper that checks rate limit before executing an action.

#### `cleanupOldTracking(): Promise<void>`

Removes tracking records older than 24 hours.

---

## Best Practices

### 1. Always Check Before Critical Actions

```typescript
// Good
const check = await rateLimiter.checkRateLimit(userId, 'trade_execution');
if (!check.limited) {
  await executeTrade();
}

// Bad - no rate limit check
await executeTrade();
```

### 2. Use Appropriate Action Types

```typescript
// Good - specific action type
await rateLimiter.checkRateLimit(userId, 'wallet_operation');

// Bad - generic or wrong type
await rateLimiter.checkRateLimit(userId, 'api_call'); // For wallet ops
```

### 3. Include Useful Metadata

```typescript
// Good - includes context
await rateLimiter.checkRateLimit(userId, 'trade_execution', {
  marketId: '0x123',
  side: 'BUY',
  amount: 100,
  paperTrading: false
});

// Acceptable - minimal metadata
await rateLimiter.checkRateLimit(userId, 'trade_execution');
```

### 4. Handle Errors Gracefully

```typescript
// Good - graceful handling
const check = await rateLimiter.checkRateLimit(userId, 'module_toggle');
if (check.limited) {
  rateLimiter.showRateLimitToast(check);
  return { success: false, reason: 'rate_limited' };
}

// Bad - throws unhandled error
await rateLimiter.checkRateLimit(userId, 'module_toggle');
// If limited, error propagates without handling
```

### 5. Use Wrapper for Simple Cases

```typescript
// Good - clean and simple
const result = await rateLimiter.withRateLimit(
  userId,
  'api_call',
  () => fetchData(),
  { endpoint: '/markets' },
  true
);

// Also good but more verbose
const check = await rateLimiter.checkRateLimit(userId, 'api_call');
if (!check.limited) {
  const result = await fetchData();
}
```

### 6. Monitor Violations

```typescript
// Periodically check for violations
const violations = await rateLimiter.getViolations(userId, 50);
if (violations.length > 10) {
  console.warn('User has many rate limit violations');
  // Consider stricter limits or investigation
}
```

### 7. Clean Up Regularly

```typescript
// Run cleanup daily
setInterval(async () => {
  await rateLimiter.cleanupOldTracking();
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

### 8. Provide User Feedback

```typescript
// Good - shows clear feedback
if (check.limited) {
  toast.error(rateLimiter.formatRateLimitError(check), {
    duration: 5000
  });
}

// Bad - silent failure
if (check.limited) {
  return;
}
```

### 9. Test Rate Limits

```typescript
// Test that limits are enforced
describe('Rate Limiting', () => {
  it('should block after limit reached', async () => {
    const userId = 'test-user';

    // Execute actions up to limit
    for (let i = 0; i < 5; i++) {
      const check = await rateLimiter.checkRateLimit(
        userId,
        'trade_execution'
      );
      expect(check.limited).toBe(false);
    }

    // Next action should be limited
    const check = await rateLimiter.checkRateLimit(
      userId,
      'trade_execution'
    );
    expect(check.limited).toBe(true);
    expect(check.reason).toBe('per_minute');
  });
});
```

### 10. Configure Per Environment

```typescript
// Development - relaxed limits
if (process.env.NODE_ENV === 'development') {
  await rateLimiter.updateConfig(userId, 'trade_execution', {
    limitPerMinute: 100,
    limitPerHour: 1000,
    limitPerDay: 10000
  });
}

// Production - strict limits
if (process.env.NODE_ENV === 'production') {
  await rateLimiter.updateConfig(userId, 'trade_execution', {
    limitPerMinute: 5,
    limitPerHour: 100,
    limitPerDay: 500
  });
}
```

---

## Performance Considerations

### Database Optimization

1. **Indexes**: All critical columns are indexed for fast queries
2. **Cleanup**: Old tracking records are automatically deleted after 24 hours
3. **Efficient Queries**: Uses database functions for sliding window calculations
4. **Connection Pooling**: Supabase handles connection pooling automatically

### Caching Strategy

Rate limit checks are NOT cached because:
- Need real-time accuracy
- Cached checks could allow limit bypass
- Database queries are fast enough with proper indexing

### Scalability

The system scales well because:
- Per-user isolation (no global locks)
- Efficient sliding window algorithm
- Automatic cleanup prevents table bloat
- Database-backed (not memory-based)

---

## Troubleshooting

### Problem: Rate limits not enforcing

**Solution:**
1. Check if limits are enabled: `config.enabled === true`
2. Verify user has initialized limits
3. Check database connection
4. Verify RLS policies are active

### Problem: False positives (limit hit too early)

**Solution:**
1. Check system clock synchronization
2. Verify cleanup function is running
3. Check for duplicate action recording
4. Review metadata for debugging

### Problem: Violations not logging

**Solution:**
1. Check RLS policies on violations table
2. Verify user authentication
3. Check database permissions
4. Review error logs

### Problem: UI not updating

**Solution:**
1. Refresh data after changes
2. Check authentication state
3. Verify WebSocket connection (if using realtime)
4. Check browser console for errors

---

## Security Considerations

1. **RLS Policies**: All tables have Row Level Security enabled
2. **User Isolation**: Users can only access their own rate limit data
3. **No Bypasses**: Rate limits checked on every action
4. **Audit Trail**: All violations are logged
5. **Metadata Sanitization**: Metadata is sanitized before storage
6. **Input Validation**: All inputs validated before processing

---

## Future Enhancements

Potential improvements:
1. **Dynamic Limits**: Adjust limits based on user tier or behavior
2. **Burst Allowance**: Allow short bursts above limit
3. **Global Limits**: Platform-wide rate limits
4. **Advanced Analytics**: Visualize usage patterns
5. **Predictive Warnings**: Warn before hitting limit
6. **IP-Based Limiting**: Additional layer based on IP address
7. **Custom Time Windows**: User-defined time windows
8. **Rate Limit Tokens**: Purchase additional capacity

---

## Conclusion

The rate limiting system provides robust protection against abuse while maintaining a smooth user experience. By following the best practices and properly integrating rate limits into your actions, you ensure fair usage and system stability.

For questions or issues, please refer to the API reference or contact support.
