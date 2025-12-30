import { supabase } from '../lib/supabase';
import rateLimiter from './rateLimiter';

export enum RequestPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface RateLimitConfig {
  maxRequestsPerWindow: number;
  windowMs: number;
  maxConcurrent: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  staleWhileRevalidate?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

interface QueuedRequest<T> {
  id: string;
  key: string;
  priority: RequestPriority;
  executor: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  retries: number;
  endpoint: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  stale: boolean;
}

interface RateLimitBucket {
  requests: number[];
  lastRequest: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  queuedRequests: number;
  averageLatency: number;
  circuitBreaks: number;
  rateLimitHits: number;
}

export class APIRateLimiter {
  private requestQueue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private rateLimitBuckets = new Map<string, RateLimitBucket>();
  private cache = new Map<string, CacheEntry<any>>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedRequests: 0,
    queuedRequests: 0,
    averageLatency: 0,
    circuitBreaks: 0,
    rateLimitHits: 0
  };

  private processingQueue = false;
  private defaultRateLimitConfig: RateLimitConfig;
  private defaultCacheConfig: CacheConfig;
  private defaultRetryConfig: RetryConfig;
  private defaultCircuitBreakerConfig: CircuitBreakerConfig;

  constructor(
    rateLimitConfig?: Partial<RateLimitConfig>,
    cacheConfig?: Partial<CacheConfig>,
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.defaultRateLimitConfig = {
      maxRequestsPerWindow: 100,
      windowMs: 60000,
      maxConcurrent: 10,
      ...rateLimitConfig
    };

    this.defaultCacheConfig = {
      ttl: 30000,
      maxSize: 1000,
      staleWhileRevalidate: true,
      ...cacheConfig
    };

    this.defaultRetryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      exponentialBase: 2,
      jitterMs: 100,
      ...retryConfig
    };

    this.defaultCircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      resetTimeout: 30000,
      ...circuitBreakerConfig
    };

    this.startCacheCleanup();
    this.startMetricsReporting();
  }

  async requestWithUserLimit<T>(
    userId: string,
    key: string,
    executor: () => Promise<T>,
    options: {
      priority?: RequestPriority;
      cacheConfig?: Partial<CacheConfig>;
      retryConfig?: Partial<RetryConfig>;
      endpoint?: string;
      skipCache?: boolean;
      skipQueue?: boolean;
    } = {}
  ): Promise<T> {
    const check = await rateLimiter.checkRateLimit(
      userId,
      'api_call',
      { endpoint: options.endpoint || 'default', key }
    );

    if (check.limited) {
      rateLimiter.showRateLimitToast(check, 'API call');
      throw new Error(rateLimiter.formatRateLimitError(check));
    }

    return this.request(key, executor, options);
  }

  async request<T>(
    key: string,
    executor: () => Promise<T>,
    options: {
      priority?: RequestPriority;
      cacheConfig?: Partial<CacheConfig>;
      retryConfig?: Partial<RetryConfig>;
      endpoint?: string;
      skipCache?: boolean;
      skipQueue?: boolean;
    } = {}
  ): Promise<T> {
    const {
      priority = RequestPriority.NORMAL,
      cacheConfig = {},
      retryConfig = {},
      endpoint = 'default',
      skipCache = false,
      skipQueue = false
    } = options;

    this.metrics.totalRequests++;

    if (!skipCache) {
      const cached = this.getCached<T>(key);
      if (cached) {
        this.metrics.cachedRequests++;

        if (this.defaultCacheConfig.staleWhileRevalidate && cached.stale) {
          this.revalidateInBackground(key, executor, endpoint);
        }

        return cached.data;
      }
    }

    const inFlight = this.inFlightRequests.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const circuitBreaker = this.getCircuitBreaker(endpoint);
    if (circuitBreaker.state === CircuitState.OPEN) {
      if (Date.now() < circuitBreaker.nextAttemptTime) {
        const cachedFallback = this.getCached<T>(key, true);
        if (cachedFallback) {
          console.warn(`Circuit breaker open for ${endpoint}, returning stale cache`);
          return cachedFallback.data;
        }
        throw new Error(`Circuit breaker open for ${endpoint}. Try again later.`);
      } else {
        circuitBreaker.state = CircuitState.HALF_OPEN;
        circuitBreaker.successCount = 0;
        console.log(`Circuit breaker entering HALF_OPEN state for ${endpoint}`);
      }
    }

    if (skipQueue || priority === RequestPriority.CRITICAL) {
      return this.executeRequest(key, executor, endpoint, { ...this.defaultRetryConfig, ...retryConfig }, 0);
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${Date.now()}-${Math.random()}`,
        key,
        priority,
        executor,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
        endpoint
      };

      this.requestQueue.push(request);
      this.metrics.queuedRequests++;

      this.requestQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.timestamp - b.timestamp;
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      if (this.activeRequests >= this.defaultRateLimitConfig.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const request = this.requestQueue.shift();
      if (!request) break;

      const rateLimitCheck = await this.checkRateLimit(request.endpoint);
      if (!rateLimitCheck.allowed) {
        this.requestQueue.unshift(request);
        this.metrics.rateLimitHits++;
        await new Promise(resolve => setTimeout(resolve, rateLimitCheck.retryAfter));
        continue;
      }

      this.activeRequests++;
      this.recordRequest(request.endpoint);

      this.executeRequest(
        request.key,
        request.executor,
        request.endpoint,
        this.defaultRetryConfig,
        request.retries
      )
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }

    this.processingQueue = false;
  }

  private async executeRequest<T>(
    key: string,
    executor: () => Promise<T>,
    endpoint: string,
    retryConfig: RetryConfig,
    currentRetry: number
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const promise = executor();
      this.inFlightRequests.set(key, promise);

      const result = await promise;

      this.inFlightRequests.delete(key);

      this.setCached(key, result);

      this.recordSuccess(endpoint);

      const latency = Date.now() - startTime;
      this.updateAverageLatency(latency);

      this.metrics.successfulRequests++;

      return result;
    } catch (error) {
      this.inFlightRequests.delete(key);

      this.recordFailure(endpoint);

      const shouldRetry = currentRetry < retryConfig.maxRetries;
      const isRetryableError = this.isRetryableError(error);

      if (shouldRetry && isRetryableError) {
        const delay = this.calculateExponentialBackoff(
          currentRetry,
          retryConfig.initialDelayMs,
          retryConfig.maxDelayMs,
          retryConfig.exponentialBase,
          retryConfig.jitterMs
        );

        console.log(
          `Retrying request (${currentRetry + 1}/${retryConfig.maxRetries}) after ${delay}ms`
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.executeRequest(key, executor, endpoint, retryConfig, currentRetry + 1);
      }

      this.metrics.failedRequests++;
      throw error;
    }
  }

  private calculateExponentialBackoff(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    base: number,
    jitter: number
  ): number {
    const exponentialDelay = initialDelay * Math.pow(base, attempt);
    const jitterAmount = Math.random() * jitter;
    return Math.min(exponentialDelay + jitterAmount, maxDelay);
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return true;
    }

    if (error.response) {
      const status = error.response.status;
      return status === 429 || status === 503 || status === 504 || status >= 500;
    }

    return false;
  }

  private async checkRateLimit(
    endpoint: string
  ): Promise<{ allowed: boolean; retryAfter: number }> {
    const bucket = this.getRateLimitBucket(endpoint);
    const now = Date.now();

    bucket.requests = bucket.requests.filter(
      time => now - time < this.defaultRateLimitConfig.windowMs
    );

    if (bucket.requests.length >= this.defaultRateLimitConfig.maxRequestsPerWindow) {
      const oldestRequest = Math.min(...bucket.requests);
      const retryAfter = this.defaultRateLimitConfig.windowMs - (now - oldestRequest);

      await this.recordRateLimitToDb(endpoint, bucket.requests.length);

      return { allowed: false, retryAfter: Math.max(retryAfter, 1000) };
    }

    return { allowed: true, retryAfter: 0 };
  }

  private recordRequest(endpoint: string): void {
    const bucket = this.getRateLimitBucket(endpoint);
    bucket.requests.push(Date.now());
    bucket.lastRequest = Date.now();
  }

  private getRateLimitBucket(endpoint: string): RateLimitBucket {
    if (!this.rateLimitBuckets.has(endpoint)) {
      this.rateLimitBuckets.set(endpoint, {
        requests: [],
        lastRequest: 0
      });
    }
    return this.rateLimitBuckets.get(endpoint)!;
  }

  private getCircuitBreaker(endpoint: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      });
    }
    return this.circuitBreakers.get(endpoint)!;
  }

  private recordSuccess(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint);

    if (breaker.state === CircuitState.HALF_OPEN) {
      breaker.successCount++;

      if (breaker.successCount >= this.defaultCircuitBreakerConfig.successThreshold) {
        breaker.state = CircuitState.CLOSED;
        breaker.failureCount = 0;
        breaker.successCount = 0;
        console.log(`Circuit breaker closed for ${endpoint}`);
      }
    } else if (breaker.state === CircuitState.CLOSED) {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  private recordFailure(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint);
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.state === CircuitState.HALF_OPEN) {
      this.openCircuit(endpoint);
    } else if (
      breaker.state === CircuitState.CLOSED &&
      breaker.failureCount >= this.defaultCircuitBreakerConfig.failureThreshold
    ) {
      this.openCircuit(endpoint);
    }
  }

  private openCircuit(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint);
    breaker.state = CircuitState.OPEN;
    breaker.nextAttemptTime = Date.now() + this.defaultCircuitBreakerConfig.resetTimeout;
    this.metrics.circuitBreaks++;

    console.error(
      `Circuit breaker opened for ${endpoint}. Will retry at ${new Date(breaker.nextAttemptTime).toISOString()}`
    );

    setTimeout(() => {
      if (breaker.state === CircuitState.OPEN) {
        breaker.state = CircuitState.HALF_OPEN;
        console.log(`Circuit breaker entering HALF_OPEN state for ${endpoint}`);
      }
    }, this.defaultCircuitBreakerConfig.resetTimeout);
  }

  getCached<T>(key: string, allowStale = false): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl;

    if (isExpired && !allowStale) {
      this.cache.delete(key);
      return null;
    }

    if (isExpired) {
      entry.stale = true;
    }

    return entry as CacheEntry<T>;
  }

  setCached<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.defaultCacheConfig.maxSize) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultCacheConfig.ttl,
      stale: false
    });
  }

  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      console.log('Cache cleared');
      return;
    }

    const regex = new RegExp(pattern);
    let removed = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }

    console.log(`Invalidated ${removed} cache entries matching pattern: ${pattern}`);
  }

  private async revalidateInBackground<T>(
    key: string,
    executor: () => Promise<T>,
    endpoint: string
  ): Promise<void> {
    try {
      const result = await this.executeRequest(
        key,
        executor,
        endpoint,
        this.defaultRetryConfig,
        0
      );
      this.setCached(key, result);
    } catch (error) {
      console.warn('Background revalidation failed:', error);
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      let removed = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        const age = now - entry.timestamp;
        if (age > entry.ttl * 2) {
          this.cache.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} expired entries`);
      }
    }, 60000);
  }

  private startMetricsReporting(): void {
    setInterval(() => {
      this.reportMetricsToDb().catch(console.error);
    }, 300000);
  }

  private async reportMetricsToDb(): Promise<void> {
    try {
      const circuitBreakerStates: Record<string, string> = {};
      for (const [endpoint, breaker] of this.circuitBreakers.entries()) {
        circuitBreakerStates[endpoint] = breaker.state;
      }

      const rateLimitStatus: Record<string, number> = {};
      for (const [endpoint, bucket] of this.rateLimitBuckets.entries()) {
        rateLimitStatus[endpoint] = bucket.requests.length;
      }

      await supabase.from('api_rate_limits').insert({
        endpoint: 'api-metrics',
        request_count: this.metrics.totalRequests,
        window_start: new Date().toISOString(),
        window_end: new Date().toISOString(),
        last_request: new Date().toISOString(),
        metadata: {
          metrics: this.metrics,
          circuitBreakers: circuitBreakerStates,
          rateLimits: rateLimitStatus,
          cacheSize: this.cache.size,
          queueSize: this.requestQueue.length,
          activeRequests: this.activeRequests
        }
      });
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }

  private async recordRateLimitToDb(endpoint: string, count: number): Promise<void> {
    try {
      await supabase.from('api_rate_limits').insert({
        endpoint,
        request_count: count,
        window_start: new Date().toISOString(),
        window_end: new Date(Date.now() + this.defaultRateLimitConfig.windowMs).toISOString(),
        last_request: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to record rate limit:', error);
    }
  }

  private updateAverageLatency(latency: number): void {
    const totalLatency = this.metrics.averageLatency * (this.metrics.successfulRequests - 1);
    this.metrics.averageLatency = (totalLatency + latency) / this.metrics.successfulRequests;
  }

  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCircuitBreakerStatus(endpoint: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(endpoint) || null;
  }

  getRateLimitStatus(endpoint: string): { current: number; max: number; resetIn: number } {
    const bucket = this.rateLimitBuckets.get(endpoint);
    if (!bucket) {
      return {
        current: 0,
        max: this.defaultRateLimitConfig.maxRequestsPerWindow,
        resetIn: this.defaultRateLimitConfig.windowMs
      };
    }

    const now = Date.now();
    const validRequests = bucket.requests.filter(
      time => now - time < this.defaultRateLimitConfig.windowMs
    );

    const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;
    const resetIn = Math.max(0, this.defaultRateLimitConfig.windowMs - (now - oldestRequest));

    return {
      current: validRequests.length,
      max: this.defaultRateLimitConfig.maxRequestsPerWindow,
      resetIn
    };
  }

  reset(): void {
    this.requestQueue = [];
    this.cache.clear();
    this.rateLimitBuckets.clear();
    this.circuitBreakers.clear();
    this.inFlightRequests.clear();
    this.activeRequests = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      queuedRequests: 0,
      averageLatency: 0,
      circuitBreaks: 0,
      rateLimitHits: 0
    };
    console.log('Rate limiter reset');
  }
}

export const polymarketRateLimiter = new APIRateLimiter(
  {
    maxRequestsPerWindow: 100,
    windowMs: 60000,
    maxConcurrent: 10
  },
  {
    ttl: 30000,
    maxSize: 500,
    staleWhileRevalidate: true
  },
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    exponentialBase: 2,
    jitterMs: 100
  },
  {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    resetTimeout: 30000
  }
);
