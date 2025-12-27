# Risk Limits Integration Guide

This guide shows how to integrate risk limit checks into your trading execution flow.

## Quick Start

The risk limits system automatically checks all trades before execution and halts trading when daily loss limits are exceeded.

## Basic Integration

### 1. Wrap Trade Execution

```typescript
import { executeTradeWithRiskChecks } from './services/riskCheckedExecution';

// Before
const result = await executeOrder(params);

// After
const result = await executeTradeWithRiskChecks(
  {
    userId: user.id,
    marketId: 'market-123',
    side: 'YES',
    positionSize: 100,
    entryPrice: 0.65,
    moduleType: 'arbitrage'
  },
  async () => {
    return await executeOrder(params);
  }
);
```

### 2. Manual Pre-Trade Checks

```typescript
import { checkBeforeTrade } from './services/riskCheckedExecution';

const checkResult = await checkBeforeTrade(
  user.id,
  marketId,
  positionSize * entryPrice,
  'arbitrage'
);

if (!checkResult.allowed) {
  console.log('Trade blocked:', checkResult.violations);
  return;
}

// Proceed with trade
```

### 3. Update Daily Tracking After Trade

```typescript
import { notifyTradeResult } from './services/riskCheckedExecution';

// After closing a position
await notifyTradeResult(
  user.id,
  realizedPnl,
  fees
);
```

## Limit Types

### Position Size Limits
- **max_position_size**: Maximum dollar value for a single position
- Checks: Before opening any new position
- Action: Blocks trade if exceeded

### Market Exposure Limits
- **max_positions_per_market**: Maximum concurrent positions in one market
- Checks: Before opening position in that market
- Action: Blocks trade if limit reached

### Portfolio Limits
- **max_total_exposure**: Maximum total dollar exposure across all positions
- **max_open_positions**: Maximum number of open positions
- Checks: Before opening any new position
- Action: Blocks trade if exceeded

### Daily Loss Limits
- **max_daily_loss**: Maximum loss allowed per day (absolute value)
- Checks: After each trade closes
- Action: **Halts all trading** when exceeded

## Configuration

Users can configure limits via the Risk Limits Manager UI:
- Navigate to Settings → Risk Limits
- Set limit values
- Enable/disable individual limits
- Toggle enforcement on/off

## Database Tables

### risk_limits
Stores user-specific risk configuration:
- Position size limits
- Market exposure limits
- Portfolio limits
- Daily loss limits
- Enable/disable flags

### daily_loss_tracking
Tracks daily P&L per user:
- Realized/unrealized P&L
- Trade counts
- Win/loss breakdown
- Limit breach status
- Auto-resets daily

### risk_limit_breaches
Audit trail of all breaches:
- Breach type and severity
- Limit values vs attempted
- Actions taken
- Full context (market, module, etc.)

## Pre-Trade Check Flow

```
1. User initiates trade
   ↓
2. executeTradeWithRiskChecks() called
   ↓
3. performPreTradeChecks()
   ├── Check if trading halted
   ├── Check position size limit
   ├── Check total exposure limit
   ├── Check positions per market limit
   └── Generate warnings (80%+ usage)
   ↓
4. If violations found:
   ├── Log breach to database
   ├── Show error toast
   └── Block trade (return)
   ↓
5. If warnings only:
   ├── Show warning toasts
   └── Proceed with trade
   ↓
6. Execute trade
   ↓
7. On success: Show success toast
8. On failure: Show error toast
```

## Post-Trade Update Flow

```
1. Position closed with P&L
   ↓
2. notifyTradeResult() called
   ↓
3. updateDailyTracking()
   ├── Update realized P&L
   ├── Increment trade counters
   ├── Update fees
   └── Check if daily loss limit exceeded
   ↓
4. If daily loss limit exceeded:
   ├── Set limit_breached = true
   ├── Update risk_limits.trading_halted = true
   ├── Log breach
   └── Show halt alert
   ↓
5. Return
```

## Example: Full Integration in a Trading Module

```typescript
import { executeTradeWithRiskChecks, notifyTradeResult } from './services/riskCheckedExecution';
import riskLimitsService from './services/riskLimits';

async function openPosition(
  userId: string,
  marketId: string,
  side: 'YES' | 'NO',
  amount: number,
  price: number
) {
  // Execute with automatic risk checks
  const result = await executeTradeWithRiskChecks(
    {
      userId,
      marketId,
      side,
      positionSize: amount,
      entryPrice: price,
      moduleType: 'arbitrage'
    },
    async () => {
      // Your actual order execution logic
      return await placeOrder(marketId, side, amount, price);
    }
  );

  if (!result.success) {
    if (result.riskCheckFailed) {
      console.log('Trade blocked by risk limits:', result.violations);
    } else {
      console.error('Trade execution failed:', result.error);
    }
    return null;
  }

  return result.positionId;
}

async function closePosition(
  userId: string,
  positionId: string,
  realizedPnl: number,
  fees: number
) {
  // Close the position
  await executeClose(positionId);

  // Update daily tracking
  await notifyTradeResult(userId, realizedPnl, fees);

  // Check if trading was halted
  const halted = await riskLimitsService.isTradingHalted(userId);

  if (halted) {
    console.warn('Trading has been halted due to daily loss limit');
    // Optionally notify user or UI
  }
}
```

## Manual Trading Halt/Resume

```typescript
import riskLimitsService from './services/riskLimits';

// Manually halt trading
await riskLimitsService.haltTrading(userId, 'Manual halt by user');

// Resume trading
await riskLimitsService.resumeTrading(userId);

// Check status
const halted = await riskLimitsService.isTradingHalted(userId);
```

## Getting Current Risk Status

```typescript
const status = await riskLimitsService.getCurrentRiskStatus(userId);

console.log('Limits:', status.limits);
console.log('Daily tracking:', status.dailyTracking);
console.log('Trading halted:', status.tradingHalted);
console.log('Recent breaches:', status.recentBreaches);
console.log('Current exposure:', status.currentExposure);
console.log('Open positions:', status.openPositions);
```

## Best Practices

1. **Always use `executeTradeWithRiskChecks()`** for all trade executions
2. **Always call `notifyTradeResult()`** after closing positions
3. **Check halt status** periodically in auto-trading loops
4. **Set reasonable defaults** for new users
5. **Test limit enforcement** thoroughly before live trading
6. **Monitor breach logs** for patterns
7. **Provide clear feedback** to users when trades are blocked
8. **Allow manual override** for experienced users (optional)

## Error Handling

```typescript
try {
  const result = await executeTradeWithRiskChecks(tradeRequest, executeFn);

  if (!result.success) {
    if (result.riskCheckFailed) {
      // Handle risk limit violation
      // Violations are already logged and toasts shown
      // Optionally: notify user via other channels
    } else {
      // Handle execution error
      // Error is already logged and toast shown
    }
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Security Considerations

1. **All limits are enforced at the database level** using RLS
2. **Users can only access their own limits** and tracking
3. **Limit breaches are immutable** once logged
4. **Database functions use SECURITY DEFINER** carefully
5. **No client-side bypasses** - all checks run server-side

## Performance Notes

- Pre-trade checks: ~50-100ms
- Post-trade updates: ~30-50ms
- Status queries: ~20-30ms
- All queries are indexed and optimized
- Daily tracking resets automatically

## Testing

```typescript
// Test position size limit
await executeTradeWithRiskChecks(
  {
    userId,
    marketId,
    side: 'YES',
    positionSize: 10000, // Exceeds default limit
    entryPrice: 1.0,
    moduleType: 'test'
  },
  async () => ({ success: true })
);
// Expected: Trade blocked, toast shown

// Test daily loss limit
await notifyTradeResult(userId, -600, 0); // Exceeds default $500 limit
const halted = await riskLimitsService.isTradingHalted(userId);
// Expected: halted === true

// Resume trading
await riskLimitsService.resumeTrading(userId);
```

## Monitoring

Monitor these metrics:
- Total breaches per day
- Most common breach types
- Average exposure usage
- Daily loss trends
- Halt frequency

Query recent breaches:
```typescript
const breaches = await riskLimitsService.getRecentBreaches(userId, 20);
```

## Support

For issues or questions:
- Check the console for detailed error logs
- Review the breach audit trail
- Verify limit configuration
- Test with paper trading first
