# API Rate Limiting & Caching Guide

## Overview

The PolyVOX API rate limiting and caching system provides comprehensive protection against API overuse, intelligent request queuing, circuit breaker pattern for fault tolerance, exponential backoff for retries, and configurable caching with TTL. This ensures reliable, performant API access while respecting Polymarket's API limits.

## Architecture

### Core Components

1. **APIRateLimiter** - Central rate limiting and request management service
2. **Request Queue** - Priority-based request queuing system
3. **Circuit Breaker** - Fault tolerance and automatic recovery
4. **Cache Layer** - Intelligent caching with configurable TTL
5. **Retry Logic** - Exponential backoff with jitter
6. **CacheManager** - Cache management and utilities
7. **ApiMonitor** - Real-time monitoring dashboard

## Features

### Rate Limiting

**Default Configuration:**
- 100 requests per 60-second window
- 10 concurrent requests maximum
- Per-endpoint tracking
- Automatic request queuing when limit reached

**How It Works:**
- Tracks requests in rolling time windows
- Automatically delays requests when approaching limits
- Records rate limit hits to database for analytics
- Provides remaining request count and reset time

### Request Queue with Prioritization

**Priority Levels:**
```typescript
enum RequestPriority {
  CRITICAL = 0,    // Bypass queue, immediate execution
  HIGH = 1,        // Order execution, real-time data
  NORMAL = 2,      // Market data fetching
  LOW = 3,         // Background refreshes
  BACKGROUND = 4   // Preloading, warmup
}
```

**Queue Behavior:**
- Requests sorted by priority, then timestamp
- High-priority requests jump the queue
- Critical requests bypass queue entirely
- Automatic deduplication of in-flight requests
- Configurable maximum queue size

### Circuit Breaker Pattern

**States:**
- **CLOSED** - Normal operation, requests allowed
- **OPEN** - Too many failures, requests blocked
- **HALF_OPEN** - Testing if service recovered

**Configuration:**
- Failure threshold: 5 consecutive failures opens circuit
- Success threshold: 2 consecutive successes closes circuit
- Timeout: 60 seconds before attempting recovery
- Reset timeout: 30 seconds in open state

**Behavior:**
- Opens after repeated failures
- Returns cached data when open
- Tests service recovery in half-open state
- Automatically closes when service recovers

### Intelligent Caching

**Features:**
- Configurable TTL per cache entry
- Stale-while-revalidate support
- Maximum cache size with LRU eviction
- Request deduplication
- Background revalidation
- Pattern-based invalidation

**Configuration:**
```typescript
{
  ttl: 30000,                    // 30 seconds default
  maxSize: 500,                   // 500 entries max
  staleWhileRevalidate: true      // Serve stale while refreshing
}
```

**Cache Keys:**
- `markets-{limit}-{offset}` - Market lists
- `market-{marketId}` - Individual markets
- `orderbook-{marketId}` - Order books

### Exponential Backoff

**Configuration:**
```typescript
{
  maxRetries: 3,
  initialDelayMs: 1000,     // 1 second initial delay
  maxDelayMs: 30000,        // 30 second maximum delay
  exponentialBase: 2,       // Double delay each retry
  jitterMs: 100             // Random jitter to prevent thundering herd
}
```

**Retry Delays:**
- Attempt 1: 1000ms + jitter
- Attempt 2: 2000ms + jitter
- Attempt 3: 4000ms + jitter
- Attempt 4: 8000ms + jitter (up to maxDelayMs)

**Retryable Errors:**
- Network failures (Failed to fetch)
- HTTP 429 (Rate Limited)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)
- HTTP 5xx (Server Errors)

## Usage

### Basic Request

```typescript
import { polymarketRateLimiter, RequestPriority } from './services/apiRateLimiter';

const data = await polymarketRateLimiter.request(
  'unique-cache-key',
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  {
    priority: RequestPriority.NORMAL,
    endpoint: 'api-endpoint',
    cacheConfig: { ttl: 60000 }
  }
);
```

### Using Polymarket Service

The Polymarket service automatically uses the rate limiter:

```typescript
import { fetchMarkets, fetchMarketById, fetchOrderBook } from './services/polymarket';

const markets = await fetchMarkets(50);

const market = await fetchMarketById('market-id');

const orderBook = await fetchOrderBook('market-id');
```

### High-Priority Request

```typescript
const criticalData = await polymarketRateLimiter.request(
  'critical-order',
  async () => executeOrder(),
  {
    priority: RequestPriority.CRITICAL,
    skipQueue: true,
    skipCache: true
  }
);
```

### Monitoring Rate Limits

```typescript
import { getRateLimiterStatus } from './services/polymarket';

const status = getRateLimiterStatus('gamma-markets');
console.log(`Requests: ${status.current}/${status.max}`);
console.log(`Reset in: ${status.resetIn}ms`);
```

### Checking Circuit Breaker

```typescript
import { getCircuitBreakerStatus } from './services/polymarket';

const breaker = getCircuitBreakerStatus('gamma-markets');
console.log(`State: ${breaker.state}`);
console.log(`Failures: ${breaker.failureCount}`);
```

### Cache Management

```typescript
import { cacheManager } from './services/cacheManager';

cacheManager.invalidateAll();

cacheManager.invalidateMarkets();

cacheManager.invalidateMarket('market-id');

cacheManager.invalidateByPattern('^orderbook-');

const stats = cacheManager.getStatistics();
console.log(`Hit rate: ${stats.hitRate}%`);

await cacheManager.warmupCache(['market1', 'market2']);

await cacheManager.preloadPopularMarkets(20);
```

### Using the API Monitor

```typescript
import { ApiMonitor } from './components/ApiMonitor';

function Dashboard() {
  return (
    <div>
      <ApiMonitor />
    </div>
  );
}
```

## Configuration

### Customizing Rate Limiter

```typescript
import { APIRateLimiter } from './services/apiRateLimiter';

const customLimiter = new APIRateLimiter(
  {
    maxRequestsPerWindow: 50,    // Stricter limit
    windowMs: 60000,
    maxConcurrent: 5
  },
  {
    ttl: 60000,                   // Longer cache
    maxSize: 1000,
    staleWhileRevalidate: true
  },
  {
    maxRetries: 5,                // More retries
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    exponentialBase: 2,
    jitterMs: 200
  },
  {
    failureThreshold: 3,          // Open circuit faster
    successThreshold: 3,
    timeout: 120000,
    resetTimeout: 60000
  }
);
```

### Per-Request Configuration

```typescript
await polymarketRateLimiter.request(
  'custom-key',
  executor,
  {
    priority: RequestPriority.HIGH,
    cacheConfig: {
      ttl: 120000,               // Custom TTL
      maxSize: 100,
      staleWhileRevalidate: false
    },
    retryConfig: {
      maxRetries: 5,
      initialDelayMs: 500
    },
    endpoint: 'custom-endpoint',
    skipCache: false,
    skipQueue: false
  }
);
```

## Monitoring

### Metrics Available

```typescript
import { getRateLimiterMetrics } from './services/polymarket';

const metrics = getRateLimiterMetrics();

metrics.totalRequests        // Total API requests
metrics.successfulRequests   // Successful requests
metrics.failedRequests       // Failed requests
metrics.cachedRequests       // Cache hits
metrics.queuedRequests       // Requests queued
metrics.averageLatency       // Average response time
metrics.circuitBreaks        // Circuit breaker activations
metrics.rateLimitHits        // Rate limit violations
```

### API Health Check

```typescript
import { getApiHealth } from './services/polymarket';

const health = getApiHealth();

health.healthy               // Overall health status
health.metrics               // Request metrics
health.rateLimits            // Rate limit status per endpoint
health.cacheSize             // Current cache size
health.queueLength           // Pending requests
health.activeRequests        // In-flight requests
```

### Cache Statistics

```typescript
import { cacheManager } from './services/cacheManager';

const stats = cacheManager.getStatistics();

stats.totalEntries           // Number of cached items
stats.hitRate                // Cache hit percentage
stats.missRate               // Cache miss percentage
stats.memoryUsageEstimate    // Estimated memory usage
```

### Real-Time Monitoring

The `ApiMonitor` component provides a comprehensive dashboard:

- **Total Requests** - All API requests made
- **Success Rate** - Percentage of successful requests
- **Cache Hit Rate** - Percentage of cached responses
- **Average Latency** - Mean response time
- **API Health** - Overall system health
- **Rate Limits** - Current usage per endpoint
- **Circuit Breakers** - Status of all circuit breakers
- **Cache Performance** - Hit rate, memory usage
- **Request Metrics** - Detailed breakdown

## Best Practices

### 1. Use Appropriate Priorities

```typescript
await polymarketRateLimiter.request(key, executor, {
  priority: RequestPriority.CRITICAL  // Only for critical operations
});

await polymarketRateLimiter.request(key, executor, {
  priority: RequestPriority.HIGH      // Order execution, real-time data
});

await polymarketRateLimiter.request(key, executor, {
  priority: RequestPriority.NORMAL    // Standard market data
});

await polymarketRateLimiter.request(key, executor, {
  priority: RequestPriority.BACKGROUND // Preloading, analytics
});
```

### 2. Set Appropriate TTL

```typescript
await polymarketRateLimiter.request(key, executor, {
  cacheConfig: {
    ttl: 5000      // Real-time data: 5 seconds
  }
});

await polymarketRateLimiter.request(key, executor, {
  cacheConfig: {
    ttl: 30000     // Market data: 30 seconds
  }
});

await polymarketRateLimiter.request(key, executor, {
  cacheConfig: {
    ttl: 300000    // Historical data: 5 minutes
  }
});
```

### 3. Use Stale-While-Revalidate

```typescript
await polymarketRateLimiter.request(key, executor, {
  cacheConfig: {
    staleWhileRevalidate: true  // Serve stale data while refreshing
  }
});
```

### 4. Warm Up Cache

```typescript
const popularMarketIds = await getPopularMarkets();
await cacheManager.warmupCache(popularMarketIds);

await cacheManager.preloadPopularMarkets(50);
```

### 5. Handle Circuit Breaker States

```typescript
const breaker = getCircuitBreakerStatus(endpoint);

if (breaker.state === CircuitState.OPEN) {
  const cachedData = getCachedData(key);
  if (cachedData) {
    return cachedData;
  }

  toast.error('API temporarily unavailable. Using cached data.');
}
```

### 6. Monitor and Alert

```typescript
const health = getApiHealth();

if (!health.healthy) {
  console.error('API health degraded:', health);
  notifyAdmins(health);
}

if (health.queueLength > 50) {
  console.warn('Request queue building up');
}

const rateLimits = getRateLimiterStatus('gamma-markets');
if (rateLimits.current > rateLimits.max * 0.8) {
  console.warn('Approaching rate limit');
}
```

### 7. Invalidate Cache Strategically

```typescript
cacheManager.invalidateMarket(marketId);

cacheManager.invalidateMarkets();

cacheManager.invalidateByPattern('^market-category-sports');

cacheManager.schedulePeriodicInvalidation(300000);
```

### 8. Handle Errors Gracefully

```typescript
try {
  const data = await polymarketRateLimiter.request(key, executor);
  return data;
} catch (error) {
  const cachedData = getCachedData(key);

  if (cachedData) {
    console.warn('Using stale cached data due to error');
    return cachedData;
  }

  throw error;
}
```

## Troubleshooting

### Rate Limit Exceeded

**Symptoms:**
- Requests delayed or queued
- `rateLimitHits` increasing in metrics
- Console warnings about rate limits

**Solutions:**
1. Increase cache TTL to reduce API calls
2. Reduce concurrent request limit
3. Use lower priority for non-critical requests
4. Implement request batching

```typescript
cacheConfig: { ttl: 60000 }  // Increase from 30s to 60s
maxConcurrent: 5               // Reduce from 10 to 5
```

### Circuit Breaker Opens

**Symptoms:**
- `circuitBreaks` increasing
- Errors: "Circuit breaker open"
- Stale cache data returned

**Solutions:**
1. Check API endpoint health
2. Increase failure threshold
3. Reduce request frequency
4. Implement better error handling

```typescript
{
  failureThreshold: 10,        // Increase from 5
  resetTimeout: 60000          // Increase from 30s
}
```

### High Queue Length

**Symptoms:**
- `queueLength` > 50
- Slow response times
- Requests timing out

**Solutions:**
1. Increase concurrent request limit
2. Use higher priorities for critical requests
3. Reduce non-essential background requests
4. Implement request throttling

```typescript
{
  maxConcurrent: 20            // Increase from 10
}
```

### Low Cache Hit Rate

**Symptoms:**
- `hitRate` < 50%
- High API usage
- Slow performance

**Solutions:**
1. Increase cache TTL
2. Implement cache warmup
3. Enable stale-while-revalidate
4. Preload popular data

```typescript
await cacheManager.preloadPopularMarkets(50);

cacheConfig: {
  ttl: 60000,
  staleWhileRevalidate: true
}
```

### Memory Issues

**Symptoms:**
- High `memoryUsageEstimate`
- Slow performance
- Browser tab crashes

**Solutions:**
1. Reduce max cache size
2. Implement more aggressive eviction
3. Clear cache periodically
4. Use shorter TTL

```typescript
{
  maxSize: 200,                // Reduce from 500
  ttl: 15000                   // Reduce from 30000
}

cacheManager.schedulePeriodicInvalidation(180000);
```

## Performance Optimization

### 1. Request Batching

```typescript
const requests = marketIds.map(id =>
  polymarketRateLimiter.request(
    `market-${id}`,
    () => fetchMarketById(id),
    { priority: RequestPriority.BACKGROUND }
  )
);

const results = await Promise.all(requests);
```

### 2. Parallel vs Sequential

```typescript
await Promise.all([
  fetchMarkets(),
  fetchOrderBook(marketId)
]);

const markets = await fetchMarkets();
const market = await fetchMarketById(markets[0].id);
```

### 3. Smart Caching

```typescript
const cacheKey = `markets-${limit}-${offset}-${category}`;

await polymarketRateLimiter.request(
  cacheKey,
  executor,
  {
    cacheConfig: {
      ttl: category === 'sports' ? 60000 : 30000
    }
  }
);
```

### 4. Preloading

```typescript
useEffect(() => {
  const preload = async () => {
    const popular = await getPopularMarkets();
    await cacheManager.warmupCache(popular.map(m => m.id));
  };

  preload();
}, []);
```

## Integration Examples

### Trading Module Integration

```typescript
async function executeArbitrageTrade(market1Id: string, market2Id: string) {
  const [market1, market2, orderBook1, orderBook2] = await Promise.all([
    polymarketRateLimiter.request(
      `market-${market1Id}`,
      () => fetchMarketById(market1Id),
      { priority: RequestPriority.HIGH }
    ),
    polymarketRateLimiter.request(
      `market-${market2Id}`,
      () => fetchMarketById(market2Id),
      { priority: RequestPriority.HIGH }
    ),
    polymarketRateLimiter.request(
      `orderbook-${market1Id}`,
      () => fetchOrderBook(market1Id),
      { priority: RequestPriority.HIGH }
    ),
    polymarketRateLimiter.request(
      `orderbook-${market2Id}`,
      () => fetchOrderBook(market2Id),
      { priority: RequestPriority.HIGH }
    )
  ]);

  const spreadAnalysis = analyzeSpread(orderBook1, orderBook2);

  if (spreadAnalysis.profitable) {
    await executeTrade({
      market1,
      market2,
      amount: spreadAnalysis.optimalAmount
    });
  }
}
```

### Dashboard Integration

```typescript
function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const [marketsData, healthData] = await Promise.all([
        fetchMarkets(50),
        getApiHealth()
      ]);

      setMarkets(marketsData);
      setHealth(healthData);
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {health && !health.healthy && (
        <Alert variant="warning">
          API performance degraded. Some data may be stale.
        </Alert>
      )}

      <MarketList markets={markets} />
      <ApiMonitor />
    </div>
  );
}
```

## API Reference

### APIRateLimiter

- `request<T>(key, executor, options)` - Execute rate-limited request
- `getMetrics()` - Get request metrics
- `getRateLimitStatus(endpoint)` - Get rate limit status
- `getCircuitBreakerStatus(endpoint)` - Get circuit breaker state
- `getCached<T>(key, allowStale)` - Get cached value
- `setCached<T>(key, data, ttl)` - Set cache value
- `invalidateCache(pattern)` - Clear cache entries
- `getQueueLength()` - Get pending requests count
- `getActiveRequests()` - Get in-flight requests count
- `getCacheSize()` - Get cache entry count
- `reset()` - Reset all state

### CacheManager

- `invalidateAll()` - Clear all cache
- `invalidateMarkets()` - Clear market list cache
- `invalidateMarket(marketId)` - Clear specific market cache
- `invalidateOrderBooks()` - Clear order book cache
- `invalidateByPattern(pattern)` - Clear matching cache entries
- `getStatistics()` - Get cache statistics
- `warmupCache(marketIds)` - Preload markets
- `preloadPopularMarkets(limit)` - Preload popular markets
- `schedulePeriodicInvalidation(interval)` - Auto-invalidate cache
- `exportCacheMetrics()` - Export metrics
- `saveCacheSnapshot()` - Save to database

## Files Reference

- `src/services/apiRateLimiter.ts` - Core rate limiting service
- `src/services/polymarket.ts` - Polymarket API with rate limiting
- `src/services/cacheManager.ts` - Cache management utilities
- `src/components/ApiMonitor.tsx` - Monitoring dashboard
