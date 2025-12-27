# Order Execution System Guide

## Overview

The PolyVOX order execution system provides a complete, production-ready solution for trading on Polymarket. It handles the entire order lifecycle from creation to settlement, with comprehensive error handling, retry logic, and real-time status monitoring.

## Features

### Core Capabilities

- **EIP-712 Order Signing**: Secure cryptographic signing of orders using Ethereum standards
- **CLOB Integration**: Direct submission to Polymarket's Central Limit Order Book
- **Real-time Status Tracking**: Automatic polling of order status with configurable intervals
- **Partial Fill Handling**: Tracks and records partial order executions
- **Automatic Retry Logic**: Intelligent retry mechanism for failed submissions (up to 3 attempts)
- **Paper Trading Mode**: Full simulation using real market data without blockchain transactions
- **Comprehensive Logging**: Detailed execution logs for debugging and auditing
- **Database Persistence**: All orders, fills, and logs stored in Supabase

### Error Handling

The system gracefully handles:
- Insufficient balance errors
- Order rejection by CLOB
- Network connectivity issues
- Partial fill scenarios
- Order timeouts and expiration
- Signature failures

## Architecture

### Database Schema

#### `orders` Table
Stores complete order information and lifecycle state.

```sql
- id: Order UUID
- user_id: User who created the order
- module_type: Trading module (arbitrage, trend, snipe, whale, value)
- market_id: Polymarket market identifier
- token_id: Outcome token identifier
- side: BUY or SELL
- order_type: LIMIT, MARKET, GTC, FOK, IOC
- price: Order price (0-1 range)
- size: Order size in tokens
- filled_size: Amount filled
- remaining_size: Amount unfilled
- status: Current order status
- clob_order_id: CLOB-assigned ID
- signature: EIP-712 signature
- paper_trading: Paper vs live trading
- created_at, updated_at, submitted_at, filled_at, cancelled_at
- error_message: Error details if failed
- retry_count: Number of retry attempts
- metadata: Additional data (JSONB)
```

#### `order_fills` Table
Tracks individual fill events for orders.

```sql
- id: Fill UUID
- order_id: Reference to orders table
- fill_id: CLOB fill identifier
- price: Fill execution price
- size: Fill size
- fee: Trading fee paid
- timestamp: Fill timestamp
- transaction_hash: Blockchain tx hash
- metadata: Additional fill data
```

#### `order_execution_logs` Table
Detailed execution logs for debugging.

```sql
- id: Log UUID
- order_id: Reference to orders table
- event_type: Type of event
- message: Human-readable message
- data: Structured event data (JSONB)
- timestamp: Event timestamp
```

### Order Status Flow

```
PENDING → SUBMITTED → OPEN → PARTIALLY_FILLED → FILLED
                         ↓
                    CANCELLED
                         ↓
                    REJECTED/FAILED
```

- **PENDING**: Order created but not yet submitted
- **SUBMITTED**: Order signed and sent to CLOB
- **OPEN**: Order active on orderbook
- **PARTIALLY_FILLED**: Order partially executed
- **FILLED**: Order completely filled
- **CANCELLED**: Order cancelled by user
- **REJECTED**: Order rejected by CLOB
- **FAILED**: Order execution failed
- **EXPIRED**: Order expired

## Usage

### Creating an Order

```typescript
import { createOrder } from './services/database/ordersDb';
import { CreateOrderRequest, OrderSide } from './services/orderExecution';

async function placeOrder(
  userId: string,
  walletAddress: string,
  privateKey: string | undefined,
  paperTradingMode: boolean
) {
  const request: CreateOrderRequest = {
    userId,
    moduleType: 'arbitrage',
    marketId: '0x123abc...',
    tokenId: '456789',
    side: 'BUY' as OrderSide,
    orderType: 'LIMIT',
    price: 0.65,
    size: 100,
    paperTrading: paperTradingMode,
    walletAddress,
    privateKey: paperTradingMode ? undefined : privateKey,
    metadata: {
      strategy: 'arbitrage-hunter',
      confidence: 0.85,
      expectedProfit: 5.2
    }
  };

  try {
    const order = await createOrder(request);
    console.log('Order created:', order.id);
    return order;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw error;
  }
}
```

### Monitoring Orders

```typescript
import { getOpenOrders, getOrderFills, getOrderLogs } from './services/database/ordersDb';

async function monitorOrders(userId: string, moduleType: string) {
  const openOrders = await getOpenOrders(userId, moduleType);

  for (const order of openOrders) {
    console.log(`Order ${order.id}:`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Filled: ${order.filled_size}/${order.size}`);
    console.log(`  Remaining: ${order.remaining_size}`);

    const fills = await getOrderFills(order.id);
    console.log(`  Fills: ${fills.length}`);

    const logs = await getOrderLogs(order.id);
    console.log(`  Recent events: ${logs.slice(-3).map(l => l.event_type).join(', ')}`);
  }
}
```

### Cancelling Orders

```typescript
import { cancelOrder, cancelAllOpenOrders } from './services/database/ordersDb';

async function cancelSingleOrder(orderId: string, privateKey: string) {
  try {
    const success = await cancelOrder(orderId, privateKey);
    if (success) {
      console.log('Order cancelled successfully');
    } else {
      console.log('Failed to cancel order');
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
  }
}

async function cancelAllOrders(userId: string, privateKey: string, moduleType?: string) {
  try {
    const result = await cancelAllOpenOrders(userId, privateKey, moduleType);
    console.log(`Cancelled: ${result.cancelled}, Failed: ${result.failed}`);
  } catch (error) {
    console.error('Error cancelling orders:', error);
  }
}
```

### Getting Trading Statistics

```typescript
import { getOrderSummary, getTotalOrderVolume } from './services/database/ordersDb';

async function getStats(userId: string, moduleType: string) {
  const summary = await getOrderSummary(userId, moduleType);

  console.log('Trading Statistics:');
  console.log(`  Total Orders: ${summary.totalOrders}`);
  console.log(`  Open: ${summary.openOrders}`);
  console.log(`  Filled: ${summary.filledOrders}`);
  console.log(`  Success Rate: ${(summary.filledOrders / summary.totalOrders * 100).toFixed(1)}%`);
  console.log(`  Total Volume: $${summary.totalVolume.toFixed(2)}`);
  console.log(`  Total Fees: $${summary.totalFees.toFixed(2)}`);

  const liveVolume = await getTotalOrderVolume(userId, moduleType, false);
  const paperVolume = await getTotalOrderVolume(userId, moduleType, true);

  console.log(`  Live Trading Volume: $${liveVolume.toFixed(2)}`);
  console.log(`  Paper Trading Volume: $${paperVolume.toFixed(2)}`);
}
```

## Paper Trading vs Live Trading

### Paper Trading (Default)

- Uses real market data from Polymarket API
- Simulates order execution without blockchain transactions
- No gas fees or real money at risk
- Orders complete in 3-5 seconds (simulated)
- Perfect for strategy testing and development

```typescript
const order = await createOrder({
  // ... other params
  paperTrading: true,
  privateKey: undefined  // Not needed for paper trading
});
```

### Live Trading

- Executes real blockchain transactions
- Requires USDC balance for buy orders
- Incurs gas fees on Polygon network
- Orders subject to real market conditions
- Must provide wallet private key

```typescript
const order = await createOrder({
  // ... other params
  paperTrading: false,
  privateKey: walletPrivateKey  // Required!
});
```

## Error Handling Best Practices

### Balance Checks

Always verify sufficient balance before creating orders:

```typescript
import { checkUSDCBalance } from './services/polymarketTrading';

async function safeOrderCreation(
  walletAddress: string,
  privateKey: string,
  orderSize: number,
  orderPrice: number
) {
  const balance = await checkUSDCBalance(walletAddress, privateKey);
  const required = orderSize * orderPrice;

  if (balance.balance < required) {
    throw new Error(`Insufficient balance. Required: $${required}, Available: $${balance.balance}`);
  }

  // Proceed with order creation
}
```

### Retry Logic

The system automatically retries failed orders up to 3 times. You can monitor retry attempts:

```typescript
const order = await getOrderById(orderId);
console.log(`Retry count: ${order.retry_count}`);

if (order.status === 'FAILED' && order.retry_count >= 3) {
  console.log('Order failed after maximum retries');
  console.log('Error:', order.error_message);
}
```

### Logging and Debugging

Access detailed execution logs for troubleshooting:

```typescript
const logs = await getOrderLogs(orderId);

logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.event_type}: ${log.message}`);
  if (log.data) {
    console.log('  Data:', JSON.stringify(log.data, null, 2));
  }
});
```

## Integration with Trading Modules

### Module Integration Pattern

```typescript
import { useAuth } from '../contexts/AuthContext';
import { createOrder, getOpenOrders } from '../services/database/ordersDb';
import { CreateOrderRequest } from '../services/orderExecution';

function TradingModuleComponent({ paperTradingMode }: { paperTradingMode: boolean }) {
  const { user, profile } = useAuth();

  const executeTrade = async (
    marketId: string,
    tokenId: string,
    side: 'BUY' | 'SELL',
    price: number,
    size: number
  ) => {
    if (!user || !profile) {
      throw new Error('User not authenticated');
    }

    const request: CreateOrderRequest = {
      userId: user.id,
      moduleType: 'arbitrage',
      marketId,
      tokenId,
      side,
      orderType: 'LIMIT',
      price,
      size,
      paperTrading: paperTradingMode,
      walletAddress: profile.wallet_address || '',
      privateKey: paperTradingMode ? undefined : getDecryptedPrivateKey(),
      metadata: {
        module: 'arbitrage-hunter',
        timestamp: Date.now()
      }
    };

    const order = await createOrder(request);
    return order;
  };

  // Component implementation
}
```

## Performance Considerations

### Status Polling

- Default interval: 5 seconds
- Maximum attempts: 60 (5 minutes total)
- Polls stopped when order reaches terminal state (FILLED, CANCELLED, FAILED)

### Database Queries

- All queries use proper indexes for performance
- RLS policies ensure users only see their own data
- Aggregate queries (summaries) optimized with proper joins

### Memory Management

```typescript
import { orderExecutionService } from './services/orderExecution';

// Clean up polling intervals when component unmounts
useEffect(() => {
  return () => {
    orderExecutionService.cleanup();
  };
}, []);
```

## Security

### Private Key Handling

- Never log or expose private keys
- Store encrypted in database only
- Pass only when needed for signing
- Use master password encryption

### RLS Policies

All tables protected by Row Level Security:
- Users can only access their own orders
- Authenticated users only
- No cross-user data leakage

### Order Signing

- Uses EIP-712 standard
- Cryptographic verification
- Nonce prevents replay attacks
- Expiration timestamps for safety

## Monitoring and Alerts

### Order Status Changes

Listen for status changes to trigger notifications:

```typescript
async function checkOrderUpdates(userId: string) {
  const recentOrders = await getRecentOrderActivity(userId, 24);

  recentOrders.forEach(order => {
    if (order.status === 'FILLED') {
      console.log(`✓ Order ${order.id} filled at ${order.price}`);
    } else if (order.status === 'FAILED') {
      console.log(`✗ Order ${order.id} failed: ${order.error_message}`);
    } else if (order.status === 'PARTIALLY_FILLED') {
      console.log(`⚠ Order ${order.id} partially filled: ${order.filled_size}/${order.size}`);
    }
  });
}
```

## Troubleshooting

### Common Issues

**Order stuck in PENDING**
- Check if balance verification passed
- Review execution logs for errors
- Verify wallet credentials are correct

**Order rejected by CLOB**
- Price may be outside valid range (0-1)
- Token ID may be invalid
- Market may be closed or expired

**Partial fills not completing**
- Low liquidity in market
- Price may not be competitive
- Consider cancelling and creating new order at better price

**Status polling timeout**
- Network connectivity issues
- CLOB API may be slow
- Check execution logs for API errors

## Best Practices

1. **Always start with paper trading** to test strategies
2. **Monitor open orders regularly** to avoid stuck positions
3. **Set appropriate retry limits** for your use case
4. **Log execution details** for post-trade analysis
5. **Cancel stale orders** that haven't filled
6. **Validate inputs** before creating orders
7. **Check balance** before live trading
8. **Use metadata** to track strategy performance
9. **Monitor gas costs** on live trades
10. **Keep private keys secure** and encrypted

## API Reference

See `/src/services/orderExecution.ts` for complete API documentation.
See `/src/services/database/ordersDb.ts` for database helper functions.
