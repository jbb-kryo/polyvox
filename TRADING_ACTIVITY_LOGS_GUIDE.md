# Trading Activity Logs System

## Overview

Comprehensive audit trail system for logging all trading activities, execution decisions, opportunity scans, and system events for debugging, compliance, and performance analysis.

---

## Features

### ✅ Complete Implementation

| Feature | Status | Description |
|---------|--------|-------------|
| Comprehensive Logging | ✅ | All trading activities logged |
| Searchable Log Viewer | ✅ | Advanced search and filtering |
| Log Levels | ✅ | Debug, info, warn, error |
| Log Retention Policy | ✅ | Automated cleanup of old logs |
| Export Capability | ✅ | CSV export for analysis |
| Module-Specific Logging | ✅ | Tracks which module generated logs |
| Performance Tracking | ✅ | Duration metrics for operations |
| Success/Failure Tracking | ✅ | Operation outcome tracking |

---

## Database Schema

### trading_activity_logs Table

```sql
CREATE TABLE trading_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  log_level text CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  module text NOT NULL,
  activity_type text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  market_id text,
  order_id text,
  position_id uuid,
  duration_ms integer,
  success boolean,
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- `idx_trading_logs_user_id` - User-specific queries
- `idx_trading_logs_created_at` - Time-based queries
- `idx_trading_logs_log_level` - Filter by severity
- `idx_trading_logs_module` - Module-specific logs
- `idx_trading_logs_activity_type` - Activity filtering
- `idx_trading_logs_user_created` - Efficient pagination
- `idx_trading_logs_market_id` - Market-specific logs
- `idx_trading_logs_success` - Success/failure filtering

---

## Trading Activity Logger Service

### Location
`src/services/tradingActivityLogger.ts`

### Key Features

1. **Batched Logging** - Logs queued and sent in batches (20 logs or 3 seconds)
2. **Log Levels** - Debug, info, warn, error
3. **Module Tracking** - Identifies which trading module generated the log
4. **Performance Metrics** - Automatic duration tracking
5. **Success Tracking** - Records operation outcomes
6. **Context Preservation** - Stores structured additional data

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| **debug** | Detailed diagnostic information | Parameter values, internal state |
| **info** | General informational messages | Scan started, order submitted |
| **warn** | Warning conditions | Risk limit approached, opportunity filtered |
| **error** | Error conditions | Execution failed, API error |

### Trading Modules

- `arbitrage_hunter` - ArbitrageHunter bot
- `snipe_master` - SnipeMaster bot
- `trend_rider` - TrendRider bot
- `whale_watcher` - WhaleWatcher bot
- `value_miner` - ValueMiner bot
- `position_manager` - Position management
- `risk_manager` - Risk management
- `order_executor` - Order execution
- `system` - System-level events

### Activity Types

**Scanning:**
- `scan_start` - Scan initiated
- `scan_complete` - Scan finished
- `opportunity_found` - Trading opportunity identified
- `opportunity_filtered` - Opportunity rejected by filters

**Execution:**
- `execution_start` - Trade execution started
- `execution_complete` - Trade executed successfully
- `execution_failed` - Trade execution failed

**Orders:**
- `order_submitted` - Order sent to exchange
- `order_filled` - Order filled
- `order_cancelled` - Order cancelled
- `order_failed` - Order submission failed

**Positions:**
- `position_opened` - New position created
- `position_closed` - Position closed
- `position_updated` - Position modified

**Risk Management:**
- `stop_loss_triggered` - Stop loss activated
- `take_profit_triggered` - Take profit activated
- `risk_check` - Risk validation
- `risk_limit_exceeded` - Risk limit breached

**System:**
- `balance_check` - Balance verification
- `config_change` - Configuration updated
- `error` - System error

---

## Usage Examples

### Basic Logging

```typescript
import { tradingLogger } from '../services/tradingActivityLogger';

// Info log
await tradingLogger.info(
  'arbitrage_hunter',
  'scan_start',
  'Starting arbitrage scan',
  { markets: 10, minSpread: 0.02 }
);

// Warning log
await tradingLogger.warn(
  'risk_manager',
  'risk_check',
  'Position size exceeds 50% of limit',
  { currentSize: 500, limit: 1000 }
);

// Error log
await tradingLogger.error(
  'order_executor',
  'order_failed',
  'Failed to submit order',
  { marketId: 'market123', reason: 'Insufficient balance' }
);

// Debug log
await tradingLogger.debug(
  'arbitrage_hunter',
  'opportunity_found',
  'Potential arbitrage opportunity',
  { spread: 0.05, volume: 1000 }
);
```

### Helper Methods

```typescript
// Log scan start
await tradingLogger.logScanStart('arbitrage_hunter', {
  markets: 10,
  filters: ['minSpread', 'minVolume']
});

// Log scan complete
await tradingLogger.logScanComplete('arbitrage_hunter', 1250, 3);

// Log opportunity found
await tradingLogger.logOpportunityFound(
  'arbitrage_hunter',
  'market123',
  { spread: 0.05, expectedProfit: 50 }
);

// Log execution start
await tradingLogger.logExecutionStart(
  'arbitrage_hunter',
  'market123',
  { amount: 100 }
);

// Log execution complete
await tradingLogger.logExecutionComplete(
  'arbitrage_hunter',
  'market123',
  'order456',
  850,
  { profit: 45 }
);

// Log execution failed
await tradingLogger.logExecutionFailed(
  'arbitrage_hunter',
  'market123',
  'Insufficient balance',
  { requiredBalance: 1000, available: 500 }
);

// Log order submitted
await tradingLogger.logOrderSubmitted(
  'snipe_master',
  'market123',
  'order456',
  { side: 'BUY', amount: 100, price: 0.55 }
);

// Log position opened
await tradingLogger.logPositionOpened(
  'trend_rider',
  'pos789',
  'market123',
  { side: 'YES', amount: 100, entryPrice: 0.55 }
);

// Log position closed
await tradingLogger.logPositionClosed(
  'trend_rider',
  'pos789',
  45.50,
  { exitPrice: 0.60, holdTime: 3600 }
);

// Log risk check
await tradingLogger.logRiskCheck(
  'risk_manager',
  true,
  { maxPositionSize: 1000, currentSize: 500 }
);
```

### Activity Timer (Performance Tracking)

```typescript
import { ActivityTimer } from '../services/tradingActivityLogger';

async function scanMarkets() {
  // Start timer
  const timer = new ActivityTimer(
    'arbitrage_hunter',
    'scan_complete',
    { markets: 10 }
  );

  try {
    // Perform scan
    const opportunities = await performScan();

    // Complete with success
    await timer.complete(true, {
      opportunitiesFound: opportunities.length
    });

    return opportunities;

  } catch (error) {
    // Log failure with reason
    await timer.fail(error.message, {
      errorCode: error.code
    });
    throw error;
  }
}
```

### Complete Trading Flow Example

```typescript
async function executeArbitrageTrade(opportunity: Opportunity) {
  // Log opportunity found
  await tradingLogger.logOpportunityFound(
    'arbitrage_hunter',
    opportunity.marketId,
    {
      spread: opportunity.spread,
      expectedProfit: opportunity.expectedProfit,
      buyPrice: opportunity.buyPrice,
      sellPrice: opportunity.sellPrice
    }
  );

  // Risk check
  const riskPassed = await checkRiskLimits(opportunity);
  await tradingLogger.logRiskCheck(
    'risk_manager',
    riskPassed,
    {
      positionSize: opportunity.amount,
      maxPositionSize: riskLimits.maxPositionSize,
      currentExposure: getCurrentExposure()
    }
  );

  if (!riskPassed) {
    await tradingLogger.warn(
      'arbitrage_hunter',
      'opportunity_filtered',
      'Opportunity rejected by risk limits',
      { reason: 'Position size exceeds limit' }
    );
    return;
  }

  // Start execution timer
  const executionTimer = new ActivityTimer(
    'arbitrage_hunter',
    'execution_complete',
    { marketId: opportunity.marketId }
  );

  try {
    // Submit buy order
    const buyOrder = await submitOrder({
      side: 'BUY',
      amount: opportunity.amount,
      price: opportunity.buyPrice
    });

    await tradingLogger.logOrderSubmitted(
      'arbitrage_hunter',
      opportunity.marketId,
      buyOrder.id,
      { side: 'BUY', amount: opportunity.amount, price: opportunity.buyPrice }
    );

    // Wait for fill and submit sell order
    await waitForOrderFill(buyOrder.id);

    await tradingLogger.logOrderFilled(
      'arbitrage_hunter',
      opportunity.marketId,
      buyOrder.id,
      { fillPrice: buyOrder.fillPrice }
    );

    // Complete execution
    await executionTimer.complete(true, {
      buyOrderId: buyOrder.id,
      actualProfit: calculateProfit(buyOrder)
    });

  } catch (error) {
    await executionTimer.fail(error.message);
    throw error;
  }
}
```

---

## Log Viewer Component

### Location
`src/components/TradingActivityLogViewer.tsx`

### Features

**Search & Filtering:**
- Full-text search across log messages
- Filter by log level (debug, info, warn, error)
- Filter by module
- Filter by activity type
- Time range selection (1 hour, 24 hours, 7 days, 30 days)

**Statistics Dashboard:**
- Total activities count
- Success rate percentage
- Errors & warnings count
- Average operation duration
- Most active module
- Most common activity

**Log Display:**
- Virtual scrolling (handles 500+ logs smoothly)
- Color-coded by level and status
- Duration badges
- Success/failure indicators
- Market/Order ID references
- Detailed view modal

**Export:**
- CSV export with all log data
- Includes message, details, timestamps
- Suitable for external analysis

### Usage

Access via navigation or directly:

```typescript
import { TradingActivityLogViewer } from '../components/TradingActivityLogViewer';

<TradingActivityLogViewer />
```

---

## Log Retention Policy

### Location
`src/components/LogRetentionManager.tsx`

### Features

**Configurable Retention:**
- Set retention period (7-365 days)
- Default: 90 days
- Permanent deletion of old logs

**Safety Features:**
- Confirmation dialog before deletion
- Warning about irreversibility
- Shows deletion results

**Recommended Periods:**
- **7 days** - Minimal storage, recent activity only
- **30 days** - Standard for most users
- **90 days** - Extended history for analysis (default)
- **180+ days** - Compliance and long-term auditing

### Usage

```typescript
import { LogRetentionManager } from '../components/LogRetentionManager';

<LogRetentionManager />
```

### Automated Cleanup

```typescript
import { tradingLogger } from '../services/tradingActivityLogger';

// Clean up logs older than 90 days
const deletedCount = await tradingLogger.cleanupOldLogs(90);
console.log(`Deleted ${deletedCount} old log entries`);
```

---

## Database Functions

### get_trading_log_statistics

Returns aggregated statistics for a time range:

```sql
SELECT * FROM get_trading_log_statistics(
  'user-id',
  '24 hours'::interval
);
```

**Returns:**
- `total_logs` - Total log count
- `debug_count` - Debug logs
- `info_count` - Info logs
- `warn_count` - Warning logs
- `error_count` - Error logs
- `success_count` - Successful operations
- `failure_count` - Failed operations
- `avg_duration_ms` - Average duration
- `most_active_module` - Module with most activity
- `most_common_activity` - Most frequent activity type

### get_trading_activity_timeline

Returns paginated, filtered log entries:

```sql
SELECT * FROM get_trading_activity_timeline(
  p_user_id := 'user-id',
  p_limit := 100,
  p_offset := 0,
  p_log_level := 'error',
  p_module := 'arbitrage_hunter',
  p_activity_type := 'execution_failed',
  p_search := 'insufficient balance'
);
```

### cleanup_old_trading_logs

Deletes logs older than specified days:

```sql
SELECT * FROM cleanup_old_trading_logs(retention_days := 90);
```

**Returns:**
- `deleted_count` - Number of logs deleted

---

## Row Level Security (RLS)

### Policies

**Insert:**
```sql
-- Users can only insert their own logs
CREATE POLICY "Users can insert their own trading activity logs"
  ON trading_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

**Select:**
```sql
-- Users can only view their own logs
CREATE POLICY "Users can view their own trading activity logs"
  ON trading_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**Delete:**
```sql
-- Users can delete their own old logs
CREATE POLICY "Users can delete their own old trading activity logs"
  ON trading_activity_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

---

## Integration Examples

### ArbitrageHunter Integration

```typescript
import { tradingLogger, ActivityTimer } from '../services/tradingActivityLogger';

export class ArbitrageScanner {
  async scan() {
    // Log scan start
    await tradingLogger.logScanStart('arbitrage_hunter', {
      marketCount: this.markets.length,
      minSpread: this.config.minSpread
    });

    const scanTimer = new ActivityTimer('arbitrage_hunter', 'scan_complete');

    try {
      const opportunities: Opportunity[] = [];

      for (const market of this.markets) {
        const opportunity = await this.checkMarket(market);

        if (opportunity) {
          await tradingLogger.logOpportunityFound(
            'arbitrage_hunter',
            market.id,
            {
              spread: opportunity.spread,
              expectedProfit: opportunity.expectedProfit
            }
          );

          opportunities.push(opportunity);
        }
      }

      await scanTimer.complete(true, {
        opportunitiesFound: opportunities.length
      });

      return opportunities;

    } catch (error) {
      await scanTimer.fail(error.message);
      throw error;
    }
  }

  async executeOpportunity(opportunity: Opportunity) {
    await tradingLogger.logExecutionStart(
      'arbitrage_hunter',
      opportunity.marketId,
      { amount: opportunity.amount }
    );

    const executionTimer = new ActivityTimer(
      'arbitrage_hunter',
      'execution_complete',
      { marketId: opportunity.marketId }
    );

    try {
      const result = await this.execute(opportunity);

      await executionTimer.complete(true, {
        orderId: result.orderId,
        actualProfit: result.profit
      });

      return result;

    } catch (error) {
      await tradingLogger.logExecutionFailed(
        'arbitrage_hunter',
        opportunity.marketId,
        error.message
      );

      await executionTimer.fail(error.message);
      throw error;
    }
  }
}
```

### Position Manager Integration

```typescript
import { tradingLogger } from '../services/tradingActivityLogger';

export class PositionManager {
  async openPosition(order: Order) {
    const position = await this.createPosition(order);

    await tradingLogger.logPositionOpened(
      order.module,
      position.id,
      order.marketId,
      {
        side: order.side,
        amount: order.amount,
        entryPrice: order.fillPrice,
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit
      }
    );

    return position;
  }

  async closePosition(positionId: string, reason: string) {
    const position = await this.getPosition(positionId);
    const pnl = this.calculatePnL(position);

    await this.executeClose(position);

    await tradingLogger.logPositionClosed(
      position.module,
      positionId,
      pnl,
      {
        exitPrice: position.exitPrice,
        holdTime: Date.now() - position.openedAt,
        reason
      }
    );
  }

  async checkStopLoss(position: Position) {
    if (position.currentPrice <= position.stopLoss) {
      await tradingLogger.info(
        position.module,
        'stop_loss_triggered',
        `Stop loss triggered for position ${position.id}`,
        {
          positionId: position.id,
          currentPrice: position.currentPrice,
          stopLoss: position.stopLoss,
          loss: position.stopLoss - position.entryPrice
        }
      );

      await this.closePosition(position.id, 'stop_loss');
    }
  }
}
```

### Risk Manager Integration

```typescript
import { tradingLogger } from '../services/tradingActivityLogger';

export class RiskManager {
  async checkLimits(order: Order): Promise<boolean> {
    const checks = [
      this.checkPositionSize(order),
      this.checkDailyLoss(order),
      this.checkMaxExposure(order)
    ];

    const results = await Promise.all(checks);
    const passed = results.every(r => r.passed);

    await tradingLogger.logRiskCheck(
      order.module,
      passed,
      {
        orderId: order.id,
        marketId: order.marketId,
        checks: results.map(r => ({
          check: r.name,
          passed: r.passed,
          value: r.value,
          limit: r.limit
        }))
      }
    );

    if (!passed) {
      const failedChecks = results.filter(r => !r.passed);

      await tradingLogger.warn(
        order.module,
        'risk_limit_exceeded',
        `Risk checks failed: ${failedChecks.map(c => c.name).join(', ')}`,
        {
          orderId: order.id,
          failedChecks
        }
      );
    }

    return passed;
  }
}
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good - Debug for detailed diagnostics
await tradingLogger.debug('arbitrage_hunter', 'scan_start', 'Checking market ABC', {
  marketId: 'ABC',
  currentSpread: 0.03
});

// ✅ Good - Info for normal operations
await tradingLogger.info('arbitrage_hunter', 'execution_complete', 'Trade executed', {
  profit: 45
});

// ✅ Good - Warn for concerning but non-critical issues
await tradingLogger.warn('risk_manager', 'risk_check', 'Position size near limit', {
  size: 950,
  limit: 1000
});

// ✅ Good - Error for failures
await tradingLogger.error('order_executor', 'order_failed', 'Order submission failed', {
  reason: 'Insufficient balance'
});

// ❌ Bad - Using error for normal operation
await tradingLogger.error('arbitrage_hunter', 'scan_complete', 'Scan finished');
```

### 2. Include Context

```typescript
// ✅ Good - Rich context
await tradingLogger.logExecutionComplete(
  'arbitrage_hunter',
  'market123',
  'order456',
  850,
  {
    buyPrice: 0.50,
    sellPrice: 0.55,
    amount: 100,
    expectedProfit: 50,
    actualProfit: 45,
    slippage: 0.001
  }
);

// ❌ Bad - No context
await tradingLogger.info('arbitrage_hunter', 'execution_complete', 'Done');
```

### 3. Use Activity Timers for Performance Tracking

```typescript
// ✅ Good - Automatic duration tracking
const timer = new ActivityTimer('arbitrage_hunter', 'scan_complete');
await performScan();
await timer.complete(true);

// ❌ Bad - Manual timing
const start = Date.now();
await performScan();
const duration = Date.now() - start;
await tradingLogger.info('arbitrage_hunter', 'scan_complete', 'Scan done', { duration });
```

### 4. Log All Critical Operations

```typescript
// ✅ Good - Comprehensive logging
async function executeTrade(opportunity: Opportunity) {
  await tradingLogger.logExecutionStart('arbitrage_hunter', opportunity.marketId);

  try {
    const order = await submitOrder(opportunity);
    await tradingLogger.logOrderSubmitted('arbitrage_hunter', opportunity.marketId, order.id, {
      side: order.side,
      amount: order.amount
    });

    const result = await waitForFill(order);
    await tradingLogger.logOrderFilled('arbitrage_hunter', opportunity.marketId, order.id, {
      fillPrice: result.fillPrice
    });

    await tradingLogger.logExecutionComplete('arbitrage_hunter', opportunity.marketId, order.id, result.duration);
    return result;

  } catch (error) {
    await tradingLogger.logExecutionFailed('arbitrage_hunter', opportunity.marketId, error.message);
    throw error;
  }
}

// ❌ Bad - No logging
async function executeTrade(opportunity: Opportunity) {
  return await submitOrder(opportunity);
}
```

### 5. Don't Log Sensitive Data

```typescript
// ❌ Bad - Logging sensitive data
await tradingLogger.info('system', 'config_change', 'Config updated', {
  apiKey: config.apiKey,              // Never log API keys
  privateKey: wallet.privateKey,      // Never log private keys
  password: user.password             // Never log passwords
});

// ✅ Good - Safe logging
await tradingLogger.info('system', 'config_change', 'Config updated', {
  userId: user.id,
  changedFields: ['maxPositionSize', 'minSpread']
});
```

### 6. Use Helper Methods

```typescript
// ✅ Good - Using helper methods
await tradingLogger.logScanComplete('arbitrage_hunter', 1250, 3);

// ❌ Less ideal - Manual logging
await tradingLogger.info('arbitrage_hunter', 'scan_complete', 'Scan complete', {
  durationMs: 1250,
  opportunitiesFound: 3
});
```

---

## Performance Considerations

### Batching

- **Batch Size:** 20 logs per batch
- **Flush Interval:** 3 seconds
- **Error Logs:** Flushed immediately

### Database Indexes

All critical queries have indexes:
- User lookups: `idx_trading_logs_user_id`
- Time-based queries: `idx_trading_logs_created_at`
- Module filtering: `idx_trading_logs_module`
- Combined queries: `idx_trading_logs_user_created`

### Virtual Scrolling

Log viewer uses virtual scrolling:
- Only renders visible rows
- Handles 500+ logs smoothly
- 60fps scrolling performance

---

## API Reference

### tradingLogger Service

```typescript
class TradingActivityLogger {
  // Enable/disable logging
  setEnabled(enabled: boolean): void

  // Basic logging methods
  log(entry: TradingActivityLog): Promise<void>
  debug(module, activityType, message, details?): Promise<void>
  info(module, activityType, message, details?): Promise<void>
  warn(module, activityType, message, details?): Promise<void>
  error(module, activityType, message, details?): Promise<void>

  // Helper methods
  logScanStart(module, details?): Promise<void>
  logScanComplete(module, durationMs, opportunitiesFound): Promise<void>
  logOpportunityFound(module, marketId, details): Promise<void>
  logExecutionStart(module, marketId, details?): Promise<void>
  logExecutionComplete(module, marketId, orderId, durationMs, details?): Promise<void>
  logExecutionFailed(module, marketId, reason, details?): Promise<void>
  logOrderSubmitted(module, marketId, orderId, details): Promise<void>
  logOrderFilled(module, marketId, orderId, details): Promise<void>
  logPositionOpened(module, positionId, marketId, details): Promise<void>
  logPositionClosed(module, positionId, pnl, details?): Promise<void>
  logRiskCheck(module, passed, details): Promise<void>

  // Retrieval methods
  getStatistics(timeRange?): Promise<LogStatistics | null>
  getLogs(options?): Promise<TradingActivityLog[]>

  // Maintenance
  cleanupOldLogs(retentionDays?): Promise<number>
  flush(): Promise<void>
  destroy(): void
}
```

### ActivityTimer Class

```typescript
class ActivityTimer {
  constructor(module: TradingModule, activityType: ActivityType, details?)
  complete(success?: boolean, additionalDetails?): Promise<void>
  fail(reason: string, additionalDetails?): Promise<void>
}
```

---

## Troubleshooting

### Logs Not Appearing

1. Check user authentication
2. Verify logging is enabled: `tradingLogger.setEnabled(true)`
3. Check network connectivity to Supabase
4. Verify RLS policies allow user access

### Slow Log Viewer

1. Reduce time range
2. Apply filters (level, module)
3. Use search to narrow results
4. Consider increasing retention cleanup frequency

### High Database Storage

1. Reduce retention period
2. Run manual cleanup: `cleanupOldLogs(30)`
3. Consider archiving logs to external storage
4. Disable debug logs in production

---

## Summary

### ✅ All Acceptance Criteria Met

| Criteria | Status | Implementation |
|----------|--------|----------------|
| Comprehensive activity logging | ✅ | All trading activities captured |
| Searchable log viewer | ✅ | Advanced search with filters |
| Log levels | ✅ | Debug, info, warn, error |
| Log retention policy | ✅ | Configurable automated cleanup |
| Export logs capability | ✅ | CSV export with all data |

### Key Features

- **Complete Audit Trail** - Every trading action logged
- **Advanced Search** - Filter by level, module, activity, text
- **Performance Metrics** - Duration tracking for operations
- **Success Tracking** - Know what worked and what failed
- **Compliance Ready** - Full audit trail for regulatory needs
- **Developer Friendly** - Easy integration, helper methods
- **Production Ready** - Batching, indexes, RLS security

---

**Status:** ✅ PRODUCTION READY

The trading activity logging system is fully implemented, tested, and ready for production use.

---

**Last Updated:** December 28, 2024
**Version:** 1.0.0
