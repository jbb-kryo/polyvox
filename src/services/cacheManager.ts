import { supabase } from '../lib/supabase';
import { polymarketRateLimiter } from './apiRateLimiter';

export interface CacheStatistics {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  averageAge: number;
  oldestEntry: number;
  newestEntry: number;
  memoryUsageEstimate: number;
}

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  invalidateAll(): void {
    polymarketRateLimiter.invalidateCache();
    console.log('All caches cleared');
  }

  invalidateMarkets(): void {
    polymarketRateLimiter.invalidateCache('^markets-');
    console.log('Market list caches cleared');
  }

  invalidateMarket(marketId: string): void {
    polymarketRateLimiter.invalidateCache(`^market-${marketId}`);
    polymarketRateLimiter.invalidateCache(`^orderbook-${marketId}`);
    console.log(`Market ${marketId} cache cleared`);
  }

  invalidateOrderBooks(): void {
    polymarketRateLimiter.invalidateCache('^orderbook-');
    console.log('Order book caches cleared');
  }

  invalidateByPattern(pattern: string): void {
    polymarketRateLimiter.invalidateCache(pattern);
    console.log(`Caches matching pattern "${pattern}" cleared`);
  }

  getStatistics(): CacheStatistics {
    const metrics = polymarketRateLimiter.getMetrics();
    const cacheSize = polymarketRateLimiter.getCacheSize();

    const totalRequests = metrics.totalRequests;
    const cachedRequests = metrics.cachedRequests;

    const hitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;

    const estimatedMemoryPerEntry = 2048;
    const memoryUsageEstimate = cacheSize * estimatedMemoryPerEntry;

    return {
      totalEntries: cacheSize,
      hitRate,
      missRate,
      averageAge: 0,
      oldestEntry: 0,
      newestEntry: 0,
      memoryUsageEstimate
    };
  }

  async warmupCache(marketIds: string[]): Promise<void> {
    console.log(`Warming up cache for ${marketIds.length} markets...`);

    const { fetchMarketById, fetchOrderBook } = await import('./polymarket');

    const promises = marketIds.map(async (marketId) => {
      try {
        await Promise.all([
          fetchMarketById(marketId),
          fetchOrderBook(marketId)
        ]);
      } catch (error) {
        console.error(`Failed to warm up cache for market ${marketId}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('Cache warmup completed');
  }

  async preloadPopularMarkets(limit: number = 20): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('market_id, volume_24h')
        .order('volume_24h', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const marketIds = Array.from(new Set(data?.map(d => d.market_id) || []));
      await this.warmupCache(marketIds);
    } catch (error) {
      console.error('Failed to preload popular markets:', error);
    }
  }

  schedulePeriodicInvalidation(intervalMs: number = 300000): NodeJS.Timeout {
    console.log(`Scheduling cache invalidation every ${intervalMs}ms`);

    return setInterval(() => {
      this.invalidateMarkets();
      console.log('Periodic cache invalidation completed');
    }, intervalMs);
  }

  async exportCacheMetrics(): Promise<Record<string, any>> {
    const stats = this.getStatistics();
    const metrics = polymarketRateLimiter.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      cache: stats,
      rateLimiter: metrics,
      health: {
        cacheSize: stats.totalEntries,
        hitRate: stats.hitRate,
        queueLength: polymarketRateLimiter.getQueueLength(),
        activeRequests: polymarketRateLimiter.getActiveRequests()
      }
    };
  }

  async saveCacheSnapshot(): Promise<void> {
    try {
      const snapshot = await this.exportCacheMetrics();

      await supabase.from('api_rate_limits').insert({
        endpoint: 'cache-snapshot',
        request_count: snapshot.cache.totalEntries,
        window_start: new Date().toISOString(),
        window_end: new Date().toISOString(),
        last_request: new Date().toISOString(),
        metadata: snapshot
      });

      console.log('Cache snapshot saved to database');
    } catch (error) {
      console.error('Failed to save cache snapshot:', error);
    }
  }
}

export const cacheManager = CacheManager.getInstance();

export interface CacheControlOptions {
  maxAge?: number;
  staleWhileRevalidate?: boolean;
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
}

export function parseCacheControl(cacheControl: string): CacheControlOptions {
  const options: CacheControlOptions = {};

  const directives = cacheControl.split(',').map(d => d.trim());

  for (const directive of directives) {
    const [key, value] = directive.split('=');

    switch (key.toLowerCase()) {
      case 'max-age':
        options.maxAge = parseInt(value, 10) * 1000;
        break;
      case 'stale-while-revalidate':
        options.staleWhileRevalidate = true;
        break;
      case 'must-revalidate':
        options.mustRevalidate = true;
        break;
      case 'no-cache':
        options.noCache = true;
        break;
      case 'no-store':
        options.noStore = true;
        break;
    }
  }

  return options;
}

export function buildCacheControl(options: CacheControlOptions): string {
  const directives: string[] = [];

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${Math.floor(options.maxAge / 1000)}`);
  }

  if (options.staleWhileRevalidate) {
    directives.push('stale-while-revalidate');
  }

  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }

  if (options.noCache) {
    directives.push('no-cache');
  }

  if (options.noStore) {
    directives.push('no-store');
  }

  return directives.join(', ');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatHitRate(hitRate: number): string {
  return `${hitRate.toFixed(1)}%`;
}

export function getCacheRecommendations(stats: CacheStatistics): string[] {
  const recommendations: string[] = [];

  if (stats.hitRate < 50) {
    recommendations.push('Low cache hit rate. Consider increasing TTL values.');
  }

  if (stats.totalEntries > 800) {
    recommendations.push('Cache size is large. Consider implementing more aggressive eviction.');
  }

  if (stats.memoryUsageEstimate > 10 * 1024 * 1024) {
    recommendations.push('High memory usage. Consider reducing max cache size.');
  }

  if (stats.hitRate > 90) {
    recommendations.push('Excellent cache performance! TTL values are well tuned.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache performance is healthy.');
  }

  return recommendations;
}
