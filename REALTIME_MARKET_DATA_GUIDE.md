# Real-time Market Data System Guide

## Overview

The PolyVOX real-time market data system provides automatic price updates, order book depth tracking, and trade activity monitoring for Polymarket markets. It uses polling-based updates (every 5-10 seconds) with intelligent caching, rate limiting, and auto-reconnection to ensure reliable data streaming without API bans.

## Features

### Core Capabilities

- **Live Price Updates**: Automatic market snapshot updates every 8 seconds
- **Order Book Tracking**: Real-time bid/ask depth with up to 10 levels
- **Trade Activity Feed**: Recent trade history with automatic updates
- **Connection Management**: Auto-reconnect on failures with exponential backoff
- **Rate Limiting**: Built-in protection against API rate limits (100 req/min)
- **Database Caching**: All data cached in Supabase for offline access
- **Multiple Market Support**: Subscribe to up to 5 markets simultaneously
- **Price History**: Historical price tracking for charts and analytics
- **Connection Status**: Visual indicators for connection health

### Data Types

#### Market Snapshot
```typescript
interface MarketSnapshot {
  marketId: string;
  question?: string;
  yesPrice: number;        // Current yes price (0-1)
  noPrice: number;         // Current no price (0-1)
  yesBid: number;          // Best yes bid
  yesAsk: number;          // Best yes ask
  noBid: number;           // Best no bid
  noAsk: number;           // Best no ask
  volume24h: number;       // 24-hour volume
  liquidity: number;       // Total liquidity
  openInterest: number;    // Open interest
  lastTradePrice?: number;
  lastTradeTime?: Date;
  active: boolean;
  closed: boolean;
  timestamp: Date;
}
```

#### Order Book
```typescript
interface OrderBook {
  marketId: string;
  tokenId: string;
  bids: OrderBookLevel[];  // Sorted best to worst
  asks: OrderBookLevel[];  // Sorted best to worst
  timestamp: Date;
}

interface OrderBookLevel {
  price: number;
  size: number;
  ordersCount: number;
}
```

#### Trade
```typescript
interface Trade {
  marketId: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  maker?: string;
  taker?: string;
  tradeId: string;
  timestamp: Date;
}
```

## Architecture

### Polling System

The system uses intelligent polling instead of WebSocket for several reasons:
- Polymarket CLOB API doesn't provide WebSocket endpoints
- Better control over request frequency
- Easier rate limit management
- Automatic fallback to cached data

**Default Configuration:**
- Poll Interval: 8000ms (8 seconds)
- Min Interval: 5000ms (5 seconds)
- Max Interval: 30000ms (30 seconds)
- Rate Limit: 100 requests per 60 seconds
- Max Reconnect Attempts: 10
- Reconnect Delay: 5000ms (5 seconds)

### Database Schema

#### `market_snapshots`
Stores periodic market state snapshots.
- Indexed by `market_id` and `timestamp`
- Auto-cleanup after 24 hours
- Public read access for all authenticated users

#### `order_book_snapshots`
Stores order book depth at different price levels.
- Indexed by `market_id`, `token_id`, and `timestamp`
- Auto-cleanup after 24 hours
- Separate records for each price level

#### `trade_activity`
Records recent trades for analysis.
- Indexed by `market_id` and `timestamp`
- Unique constraint on `trade_id`
- Retained for 7 days

#### `market_data_subscriptions`
Tracks which markets users are monitoring.
- Enables usage analytics
- Helps optimize caching strategy
- Tracks last access time

#### `api_rate_limits`
Monitors API usage to prevent rate limit violations.
- Tracks requests per endpoint
- Rolling time windows
- Auto-cleanup after 1 hour

## Usage

### Basic Market Subscription

```typescript
import { useRealTimeMarket } from '../hooks/useRealTimeMarket';

function MarketComponent({ marketId }: { marketId: string }) {
  const {
    snapshot,
    orderBook,
    trades,
    connectionStatus,
    isConnected,
    isLoading,
    error,
    refresh
  } = useRealTimeMarket(marketId, {
    pollInterval: 8000,        // Poll every 8 seconds
    autoConnect: true,          // Auto-start on mount
    enableOrderBook: true,      // Enable order book tracking
    enableTrades: true,         // Enable trade feed
    maxTrades: 20              // Keep last 20 trades
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Current Price: ${snapshot?.yesPrice.toFixed(3)}</h2>
      <p>24h Volume: ${snapshot?.volume24h.toLocaleString()}</p>
      <p>Spread: ${(snapshot?.yesAsk - snapshot?.yesBid).toFixed(4)}</p>

      <h3>Recent Trades:</h3>
      {trades.map(trade => (
        <div key={trade.tradeId}>
          {trade.side} {trade.size} @ ${trade.price}
        </div>
      ))}
    </div>
  );
}
```

### Connection Status Monitoring

```typescript
import { ConnectionStatusIndicator } from '../components/ConnectionStatusIndicator';

function Header() {
  return (
    <header>
      <h1>PolyVOX Trading</h1>
      <ConnectionStatusIndicator
        showText={true}
        showRateLimit={true}
      />
    </header>
  );
}
```

### Order Book Depth

```typescript
import { useOrderBookDepth } from '../hooks/useRealTimeMarket';

function OrderBookComponent({ marketId }: { marketId: string }) {
  const { bids, asks, spread, midPrice, isLoading } = useOrderBookDepth(
    marketId,
    5  // Show 5 levels
  );

  return (
    <div>
      <h3>Order Book</h3>
      <p>Spread: ${spread.toFixed(4)}</p>
      <p>Mid Price: ${midPrice.toFixed(3)}</p>

      <div>
        <h4>Asks</h4>
        {asks.map((ask, i) => (
          <div key={i}>
            ${ask.price.toFixed(3)} - {ask.size} shares (Total: {ask.total})
          </div>
        ))}
      </div>

      <div>
        <h4>Bids</h4>
        {bids.map((bid, i) => (
          <div key={i}>
            ${bid.price.toFixed(3)} - {bid.size} shares (Total: {bid.total})
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Price History

```typescript
import { usePriceHistory } from '../hooks/useRealTimeMarket';

function PriceChartComponent({ marketId }: { marketId: string }) {
  const {
    prices,
    change24h,
    changePercent,
    high24h,
    low24h
  } = usePriceHistory(marketId, 24);

  return (
    <div>
      <h3>24h Price Performance</h3>
      <p>Change: ${change24h.toFixed(4)} ({changePercent.toFixed(2)}%)</p>
      <p>High: ${high24h.toFixed(3)}</p>
      <p>Low: ${low24h.toFixed(3)}</p>
      <p>Data Points: {prices.length}</p>
    </div>
  );
}
```

### Multiple Markets

```typescript
import { useMultipleMarkets } from '../hooks/useRealTimeMarket';

function PortfolioComponent() {
  const marketIds = [
    'market1-id',
    'market2-id',
    'market3-id'
  ];

  const markets = useMultipleMarkets(marketIds, {
    pollInterval: 10000,
    enableTrades: false  // Disable trades for performance
  });

  return (
    <div>
      {marketIds.map(id => {
        const market = markets[id];
        return (
          <div key={id}>
            <h3>{id}</h3>
            <p>Price: ${market?.snapshot?.yesPrice.toFixed(3)}</p>
            <p>Status: {market?.connectionStatus}</p>
          </div>
        );
      })}
    </div>
  );
}
```

### Manual Control

```typescript
function ManualControlComponent({ marketId }: { marketId: string }) {
  const {
    snapshot,
    connectionStatus,
    refresh,
    reconnect,
    disconnect
  } = useRealTimeMarket(marketId, {
    autoConnect: false  // Don't auto-connect
  });

  return (
    <div>
      <button onClick={refresh}>Refresh Data</button>
      <button onClick={reconnect}>Reconnect</button>
      <button onClick={disconnect}>Disconnect</button>

      <p>Status: {connectionStatus}</p>
      {snapshot && <p>Price: ${snapshot.yesPrice}</p>}
    </div>
  );
}
```

## Rate Limiting

### How It Works

The system tracks API requests in a rolling 60-second window. When you approach the limit:
- Warnings logged to console
- Requests automatically delayed
- Rate limit info available via `getRateLimitInfo()`

### Monitoring Rate Limits

```typescript
import { useConnectionStatus } from '../hooks/useRealTimeMarket';

function RateLimitMonitor() {
  const { rateLimitInfo } = useConnectionStatus();

  return (
    <div>
      <p>Requests Remaining: {rateLimitInfo.remaining}/100</p>
      {rateLimitInfo.remaining < 20 && (
        <p className="warning">
          Rate limit approaching! Reset in {rateLimitInfo.resetTime}ms
        </p>
      )}
    </div>
  );
}
```

### Rate Limit Best Practices

1. **Use appropriate poll intervals**: Don't poll faster than needed
   ```typescript
   // Good: 8-10 second intervals for dashboard
   useRealTimeMarket(marketId, { pollInterval: 8000 });

   // Bad: 1 second intervals will hit rate limits
   useRealTimeMarket(marketId, { pollInterval: 1000 });
   ```

2. **Disable unnecessary features**:
   ```typescript
   // Only enable what you need
   useRealTimeMarket(marketId, {
     enableOrderBook: false,  // Disable if not displaying
     enableTrades: false      // Disable if not displaying
   });
   ```

3. **Limit concurrent subscriptions**:
   ```typescript
   // Good: Monitor 3-5 markets
   const marketIds = markets.slice(0, 5);

   // Bad: Monitoring 20+ markets simultaneously
   const marketIds = allMarkets;  // Too many!
   ```

4. **Use cached data when possible**:
   ```typescript
   // The hook automatically falls back to cached data
   // when rate limited or offline
   ```

## Connection Management

### Connection States

- **connecting**: Initial connection attempt
- **connected**: Successfully receiving data
- **reconnecting**: Attempting to reconnect after error
- **disconnected**: Not connected (intentional)
- **error**: Connection failed after max retries

### Auto-Reconnect Behavior

The system automatically attempts to reconnect on failures:
1. First failure: Retry after 5 seconds
2. Subsequent failures: Continue retrying (max 10 attempts)
3. After max attempts: Enters error state
4. User can manually reconnect anytime

```typescript
const { connectionStatus, reconnect } = useRealTimeMarket(marketId);

useEffect(() => {
  if (connectionStatus === 'error') {
    // Notify user of connection issues
    toast.error('Connection lost. Click to reconnect.');
  }
}, [connectionStatus]);
```

### Handling Disconnections

```typescript
function ResilientComponent({ marketId }: { marketId: string }) {
  const {
    snapshot,
    connectionStatus,
    isConnected,
    error,
    reconnect
  } = useRealTimeMarket(marketId);

  // Show cached data even when disconnected
  if (!isConnected && snapshot) {
    return (
      <div>
        <div className="warning">
          Using cached data from {snapshot.timestamp.toLocaleString()}
        </div>
        <div>Price: ${snapshot.yesPrice}</div>
        <button onClick={reconnect}>Reconnect</button>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div>
        <div className="error">{error}</div>
        <button onClick={reconnect}>Retry Connection</button>
      </div>
    );
  }

  // Normal connected state
  return <div>Price: ${snapshot?.yesPrice}</div>;
}
```

## Caching Strategy

### How Caching Works

1. **First Request**: Fetches from Polymarket API
2. **Success**: Data cached in Supabase
3. **Subsequent Requests**: Returns cached data if API fails
4. **Updates**: Cache updated on every successful fetch
5. **Expiration**: Old data cleaned up automatically

### Cache Retention

- **Market Snapshots**: 24 hours
- **Order Book**: 24 hours
- **Trades**: 7 days
- **Rate Limits**: 1 hour

### Manual Cache Cleanup

```typescript
// Cleanup happens automatically, but you can trigger it:
import { supabase } from '../lib/supabase';

async function cleanupMarketData() {
  const { error } = await supabase.rpc('cleanup_old_market_data');
  if (error) console.error('Cleanup failed:', error);
}
```

## Performance Optimization

### Reducing API Calls

1. **Increase poll interval** for less critical data:
   ```typescript
   useRealTimeMarket(marketId, { pollInterval: 15000 });
   ```

2. **Disable features** you don't display:
   ```typescript
   useRealTimeMarket(marketId, {
     enableOrderBook: false,
     enableTrades: false
   });
   ```

3. **Unsubscribe** when component unmounts:
   ```typescript
   // Automatic with the hook
   useEffect(() => {
     return () => {
       // Cleanup happens automatically
     };
   }, []);
   ```

### Memory Management

The system automatically manages memory:
- Limits stored trades to `maxTrades` (default 20)
- Cleans up polling intervals on unmount
- Removes subscriptions when no listeners
- Clears cached data for unsubscribed markets

### Batch Updates

When monitoring multiple markets, use `useMultipleMarkets`:
```typescript
// Better: Single hook for multiple markets
const markets = useMultipleMarkets(marketIds);

// Worse: Multiple individual hooks
// const market1 = useRealTimeMarket(marketIds[0]);
// const market2 = useRealTimeMarket(marketIds[1]);
// const market3 = useRealTimeMarket(marketIds[2]);
```

## Error Handling

### Common Errors

**Rate Limit Exceeded**
```typescript
// Automatically handled - requests queued until limit resets
// Warning logged: "Rate limit reached. Waiting..."
```

**Network Errors**
```typescript
// Automatic reconnection attempts
// Falls back to cached data
const { snapshot, connectionStatus } = useRealTimeMarket(marketId);

if (connectionStatus === 'reconnecting') {
  // Show reconnecting UI
}
```

**Invalid Market ID**
```typescript
const { error } = useRealTimeMarket(invalidMarketId);

if (error) {
  // Handle gracefully
  return <div>Market not found: {error}</div>;
}
```

### Error Recovery

```typescript
function ErrorResilientComponent({ marketId }: { marketId: string }) {
  const {
    snapshot,
    error,
    connectionStatus,
    refresh,
    reconnect
  } = useRealTimeMarket(marketId);

  // Try to recover from errors
  useEffect(() => {
    if (connectionStatus === 'error') {
      const timer = setTimeout(() => {
        console.log('Auto-recovering from error...');
        reconnect();
      }, 10000);  // Retry after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [connectionStatus, reconnect]);

  // Rest of component...
}
```

## Integration with Trading Modules

### Arbitrage Hunter

```typescript
import { useRealTimeMarket } from '../hooks/useRealTimeMarket';

function ArbitrageComponent({ market1, market2 }: Props) {
  const market1Data = useRealTimeMarket(market1.id);
  const market2Data = useRealTimeMarket(market2.id);

  const spread = Math.abs(
    (market1Data.snapshot?.yesPrice || 0) -
    (market2Data.snapshot?.yesPrice || 0)
  );

  const isOpportunity = spread > 0.05;

  return (
    <div>
      <h3>Arbitrage Opportunity</h3>
      <p>Spread: ${spread.toFixed(4)}</p>
      {isOpportunity && (
        <button>Execute Arbitrage</button>
      )}
    </div>
  );
}
```

### Value Miner

```typescript
function ValueMinerComponent({ marketId }: { marketId: string }) {
  const { snapshot } = useRealTimeMarket(marketId);
  const { change24h, changePercent } = usePriceHistory(marketId, 24);

  // Calculate fair value
  const fairValue = 0.65;
  const currentPrice = snapshot?.yesPrice || 0;
  const edge = fairValue - currentPrice;

  const isUndervalued = edge > 0.05;

  return (
    <div>
      <h3>Value Analysis</h3>
      <p>Current: ${currentPrice.toFixed(3)}</p>
      <p>Fair Value: ${fairValue.toFixed(3)}</p>
      <p>Edge: ${edge.toFixed(4)}</p>
      {isUndervalued && (
        <button>Buy Undervalued</button>
      )}
    </div>
  );
}
```

## Troubleshooting

### Data Not Updating

1. Check connection status
2. Verify market ID is correct
3. Check rate limit status
4. Look for console errors
5. Try manual refresh

### High Memory Usage

1. Reduce `maxTrades` limit
2. Decrease number of subscribed markets
3. Increase poll interval
4. Disable unused features

### Slow Performance

1. Increase poll interval
2. Disable order book if not needed
3. Reduce number of markets
4. Check network speed

## Best Practices

1. **Always check connection status** before displaying data
2. **Show cached data** when disconnected
3. **Provide manual refresh** option
4. **Monitor rate limits** in development
5. **Use appropriate poll intervals** for use case
6. **Cleanup subscriptions** on unmount
7. **Handle errors gracefully** with fallbacks
8. **Test with poor network** conditions
9. **Cache aggressively** for offline support
10. **Log issues** for debugging

## API Reference

See `/src/services/marketDataStream.ts` for core service API.
See `/src/hooks/useRealTimeMarket.ts` for React hooks API.
See `/src/components/ConnectionStatusIndicator.tsx` for UI components.
