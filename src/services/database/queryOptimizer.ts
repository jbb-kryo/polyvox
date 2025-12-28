import { supabase } from '../../lib/supabase';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface QueryPerformanceMetrics {
  queryName: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
}

class QueryOptimizer {
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private readonly MAX_METRICS_STORED = 100;

  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<{ data: T; error: any }>
  ): Promise<{ data: T; error: any; metrics: QueryPerformanceMetrics }> {
    const startTime = performance.now();

    const result = await queryFn();

    const executionTime = performance.now() - startTime;
    const rowsReturned = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;

    const metrics: QueryPerformanceMetrics = {
      queryName,
      executionTime,
      rowsReturned,
      timestamp: new Date()
    };

    this.recordMetrics(metrics);

    if (executionTime > 100) {
      console.warn(`Slow query detected: ${queryName} took ${executionTime.toFixed(2)}ms`);
    }

    return { ...result, metrics };
  }

  private recordMetrics(metrics: QueryPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);

    if (this.performanceMetrics.length > this.MAX_METRICS_STORED) {
      this.performanceMetrics.shift();
    }
  }

  getMetrics(): QueryPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  getAverageExecutionTime(queryName?: string): number {
    const relevantMetrics = queryName
      ? this.performanceMetrics.filter(m => m.queryName === queryName)
      : this.performanceMetrics;

    if (relevantMetrics.length === 0) return 0;

    const totalTime = relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return totalTime / relevantMetrics.length;
  }

  getSlowQueries(threshold: number = 100): QueryPerformanceMetrics[] {
    return this.performanceMetrics.filter(m => m.executionTime > threshold);
  }

  clearMetrics(): void {
    this.performanceMetrics = [];
  }

  async paginatedQuery<T>(
    table: string,
    params: PaginationParams,
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending?: boolean }
  ): Promise<PaginatedResult<T>> {
    const { page, pageSize } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let countQuery = supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from(table)
      .select('*')
      .range(from, to);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = countQuery.eq(key, value);
          dataQuery = dataQuery.eq(key, value);
        }
      });
    }

    if (orderBy) {
      dataQuery = dataQuery.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    }

    const [{ count }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    if (error) {
      console.error(`Pagination error for ${table}:`, error);
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: (data || []) as T[],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  buildOptimizedQuery(baseQuery: any, options: {
    userId?: string;
    status?: string;
    module?: string;
    marketId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    orderBy?: { column: string; ascending?: boolean };
  }) {
    let query = baseQuery;

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.module) {
      query = query.eq('module', options.module);
    }

    if (options.marketId) {
      query = query.eq('market_id', options.marketId);
    }

    if (options.dateFrom) {
      query = query.gte('created_at', options.dateFrom.toISOString());
    }

    if (options.dateTo) {
      query = query.lte('created_at', options.dateTo.toISOString());
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    return query;
  }

  async getOrdersPaginated(
    userId: string,
    params: PaginationParams,
    filters?: {
      status?: string;
      module?: string;
      marketId?: string;
    }
  ): Promise<PaginatedResult<any>> {
    return this.paginatedQuery(
      'orders',
      params,
      { user_id: userId, ...filters },
      { column: 'created_at', ascending: false }
    );
  }

  async getPositionsPaginated(
    table: string,
    userId: string,
    params: PaginationParams,
    status?: string
  ): Promise<PaginatedResult<any>> {
    return this.paginatedQuery(
      table,
      params,
      { user_id: userId, ...(status && { status }) },
      { column: 'created_at', ascending: false }
    );
  }

  async getTradeAnalyticsPaginated(
    userId: string,
    params: PaginationParams,
    module?: string
  ): Promise<PaginatedResult<any>> {
    return this.paginatedQuery(
      'trade_analytics',
      params,
      { user_id: userId, ...(module && { module }) },
      { column: 'entry_time', ascending: false }
    );
  }

  async getNotificationsPaginated(
    userId: string,
    params: PaginationParams,
    filters?: {
      isRead?: boolean;
      type?: string;
      category?: string;
    }
  ): Promise<PaginatedResult<any>> {
    return this.paginatedQuery(
      'notifications',
      params,
      { user_id: userId, ...(filters?.isRead !== undefined && { is_read: filters.isRead }), ...(filters?.type && { type: filters.type }), ...(filters?.category && { category: filters.category }) },
      { column: 'created_at', ascending: false }
    );
  }
}

export const queryOptimizer = new QueryOptimizer();

export async function batchQuery<T>(
  queries: Array<() => Promise<{ data: T; error: any }>>,
  concurrency: number = 5
): Promise<Array<{ data: T; error: any }>> {
  const results: Array<{ data: T; error: any }> = [];

  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(q => q()));
    results.push(...batchResults);
  }

  return results;
}

export async function optimizedCount(
  table: string,
  filters?: Record<string, any>
): Promise<number> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  const { count, error } = await query;

  if (error) {
    console.error(`Count error for ${table}:`, error);
    return 0;
  }

  return count || 0;
}

export function createCursorPagination(lastId: string, pageSize: number) {
  return {
    gt: (column: string) => ({ [column]: lastId }),
    limit: pageSize
  };
}

export async function parallelQueries<T extends Record<string, any>>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(queries);
  const promises = Object.values(queries);

  const results = await Promise.all(promises);

  return keys.reduce((acc, key, index) => {
    acc[key as keyof T] = results[index];
    return acc;
  }, {} as { [K in keyof T]: Awaited<T[K]> });
}
