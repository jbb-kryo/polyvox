# Stop Loss & Take Profit System Guide

## Overview

The Stop Loss & Take Profit system provides automated risk management for your trading positions. It continuously monitors your open positions and automatically closes them when specified price thresholds are reached.

## Features

### 1. Stop Loss
Automatically closes a losing position when the price falls to a specified level, limiting your downside risk.

**Types:**
- **Percentage-Based**: Set a loss percentage (e.g., 5% below entry price)
- **Fixed Price**: Specify an exact price level (e.g., $0.45)

### 2. Take Profit
Automatically closes a winning position when the price reaches your profit target, locking in gains.

**Types:**
- **Percentage-Based**: Set a profit percentage (e.g., 10% above entry price)
- **Fixed Price**: Specify an exact price level (e.g., $0.65)

### 3. Trailing Stop
A dynamic stop loss that follows the price upward while maintaining a fixed distance below the highest price reached.

**Configuration:**
- **Activation Price**: The price level where trailing begins (e.g., $0.60)
- **Trail Distance**: Percentage distance from highest price (e.g., 3%)

**How It Works:**
1. Position is opened at entry price
2. When price reaches activation price, trailing stop activates
3. As price moves up, the stop loss automatically adjusts upward
4. Stop loss maintains the specified percentage distance from the highest price
5. If price drops by the trail distance from peak, position closes automatically

## Getting Started

### Setting Up Risk Management

1. **Navigate to Positions**
   - Click on "Positions" in the main navigation
   - View your active positions

2. **Enable Monitoring**
   - Click the "Start Monitoring" button in the Positions page
   - The system will check your positions every 5 seconds
   - Monitor status shows "Monitoring Active" when running

3. **Configure Risk Settings**
   - Click the shield icon on any position
   - This opens the Risk Settings modal

### Configuring Stop Loss

1. Check "Stop Loss" to enable
2. Choose your type:
   - **Percentage**: Enter loss percentage (e.g., 5 for 5%)
   - **Fixed Price**: Enter exact stop price

**Example:**
- Entry price: $0.50
- Stop loss: 5%
- Trigger price: $0.475 (automatic closure)

### Configuring Take Profit

1. Check "Take Profit" to enable
2. Choose your type:
   - **Percentage**: Enter profit percentage (e.g., 10 for 10%)
   - **Fixed Price**: Enter exact target price

**Example:**
- Entry price: $0.50
- Take profit: 10%
- Trigger price: $0.55 (automatic closure)

### Configuring Trailing Stop

1. Check "Trailing Stop" to enable
2. Set activation price (when trailing begins)
3. Set trail distance percentage

**Example:**
- Entry price: $0.50
- Activation: $0.60
- Trail: 3%

**Scenario:**
1. Price reaches $0.60 → Trailing activates, stop at $0.582 (3% below)
2. Price rises to $0.70 → Stop moves to $0.679 (3% below)
3. Price rises to $0.80 → Stop moves to $0.776 (3% below)
4. Price drops to $0.76 → Position closes at $0.776 stop

## Monitoring and Execution

### Continuous Monitoring
- System checks positions every 5 seconds when monitoring is active
- Compares current prices against configured thresholds
- Updates trailing stop levels automatically

### Automatic Execution
When a threshold is hit:
1. Position is automatically marked for closure
2. System records the trigger in history
3. Notification is sent to user
4. Position status updated to closed
5. Execution details logged for review

### Trigger History
View all triggered stops and profits:
- Access through Analytics or Position History
- See trigger type, price, and P&L
- Review execution success/failure
- Analyze performance patterns

## Best Practices

### Stop Loss Guidelines
1. **Risk Per Trade**: Common practice is 1-2% of portfolio per position
2. **Volatility Adjustment**: Wider stops for volatile markets, tighter for stable markets
3. **Entry Quality**: Better entries allow tighter stops
4. **Market Conditions**: Adjust based on overall market volatility

### Take Profit Guidelines
1. **Risk/Reward Ratio**: Aim for at least 1:2 (risk $1 to make $2)
2. **Multiple Targets**: Consider partial exits at different levels
3. **Market Structure**: Use key resistance levels as targets
4. **Time Horizon**: Shorter timeframes may need tighter targets

### Trailing Stop Guidelines
1. **Activation Timing**: Set activation after position moves into profit
2. **Trail Distance**: Balance between protection and room to breathe
   - Tight trails (1-2%): Lock profits quickly, may exit early
   - Wide trails (5-10%): Allow more movement, may give back gains
3. **Trend Following**: Works best in trending markets
4. **Volatile Markets**: Use wider trail distances

## Risk Management Scenarios

### Conservative Approach
- Stop Loss: 3-5%
- Take Profit: 6-10%
- Trailing Stop: Activate at +8%, trail 2%

**Profile**: Protect capital, consistent small gains

### Balanced Approach
- Stop Loss: 5-7%
- Take Profit: 10-15%
- Trailing Stop: Activate at +12%, trail 3%

**Profile**: Standard risk/reward, flexible management

### Aggressive Approach
- Stop Loss: 8-10%
- Take Profit: 20-30%
- Trailing Stop: Activate at +15%, trail 5%

**Profile**: Bigger positions, wider swings, higher upside

## Technical Details

### Database Tables

**position_risk_settings**
- Stores stop loss, take profit, and trailing stop configurations
- One record per position
- Tracks highest/lowest prices for trailing logic

**risk_trigger_history**
- Complete audit trail of all triggers
- Execution success/failure tracking
- P&L at trigger time

### Monitoring Service

**stopLossManager**
- Background service checking positions every 5 seconds
- Calculates trigger levels dynamically
- Updates trailing stops based on price movement
- Executes position closures when thresholds hit

### Safety Features

1. **RLS Security**: Users can only access their own settings
2. **Audit Trail**: Every trigger is logged with full details
3. **Error Handling**: Failed executions are recorded and notified
4. **Status Tracking**: Clear visibility of monitoring state
5. **Price Validation**: Checks ensure valid price data before triggering

## Troubleshooting

### Monitoring Not Working
- Ensure "Start Monitoring" button shows "Monitoring Active"
- Check browser console for errors
- Verify you have active positions with risk settings

### Settings Not Saving
- Confirm you're signed in
- Check all required fields are filled
- Verify percentages are within valid ranges (0-100%)

### Triggers Not Executing
- Verify monitoring is active
- Check that current price has actually reached trigger level
- Review trigger history for execution errors
- Ensure position is still open

### Trailing Stop Not Activating
- Confirm activation price has been reached
- Check that trailing stop is enabled
- Verify trail distance is set correctly

## API Integration

### Starting Monitoring
```typescript
import { stopLossManager } from './services/stopLossManager';

// Start monitoring for a user
await stopLossManager.startMonitoring(userId);
```

### Setting Risk Parameters
```typescript
await stopLossManager.setRiskSettings(userId, positionId, {
  stopLossEnabled: true,
  stopLossType: 'percentage',
  stopLossPercentage: 5,

  takeProfitEnabled: true,
  takeProfitType: 'percentage',
  takeProfitPercentage: 10,

  trailingStopEnabled: true,
  trailingActivationPrice: 0.60,
  trailingDistancePercentage: 3
});
```

### Checking Monitoring Status
```typescript
const status = stopLossManager.getMonitoringStatus();
console.log(status.isMonitoring); // true/false
console.log(status.checkIntervalMs); // 5000
```

### Viewing Trigger History
```typescript
const history = await stopLossManager.getTriggerHistory(userId, 50);
// Returns last 50 triggers with full details
```

## Notifications

When a stop loss or take profit triggers:
- **Toast Notification**: Immediate on-screen alert
- **Trigger Type**: Stop loss, take profit, or trailing stop
- **Market Details**: Market question and outcome
- **Execution Status**: Success or failure

## Performance Considerations

- Monitoring runs in background without blocking UI
- Database queries optimized with indexes
- Only active positions are checked
- Efficient price comparison algorithms
- Minimal network overhead

## Future Enhancements

Planned features:
- Email/SMS notifications on triggers
- Multiple take profit levels
- Time-based exits
- Break-even stop automation
- Advanced trailing algorithms
- Position scaling on triggers
- Integration with exchange APIs for instant execution

## Support

For issues or questions:
- Check troubleshooting section above
- Review trigger history for execution details
- Check browser console for detailed error messages
- Verify database migrations are applied
