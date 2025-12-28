import { queryOptimizer, QueryPerformanceMetrics } from './queryOptimizer';

export interface DatabasePerformanceReport {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: QueryPerformanceMetrics[];
  queryBreakdown: Record<string, {
    count: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  }>;
  recommendations: string[];
}

class PerformanceMonitor {
  private readonly SLOW_QUERY_THRESHOLD = 100;
  private readonly VERY_SLOW_QUERY_THRESHOLD = 500;

  generateReport(): DatabasePerformanceReport {
    const metrics = queryOptimizer.getMetrics();

    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: [],
        queryBreakdown: {},
        recommendations: ['No query data collected yet. Run some queries to see performance metrics.']
      };
    }

    const totalTime = metrics.reduce((sum, m) => sum + m.executionTime, 0);
    const averageExecutionTime = totalTime / metrics.length;

    const slowQueries = queryOptimizer.getSlowQueries(this.SLOW_QUERY_THRESHOLD);

    const queryBreakdown: Record<string, {
      count: number;
      averageTime: number;
      minTime: number;
      maxTime: number;
    }> = {};

    metrics.forEach(metric => {
      if (!queryBreakdown[metric.queryName]) {
        queryBreakdown[metric.queryName] = {
          count: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }

      const breakdown = queryBreakdown[metric.queryName];
      breakdown.count++;
      breakdown.minTime = Math.min(breakdown.minTime, metric.executionTime);
      breakdown.maxTime = Math.max(breakdown.maxTime, metric.executionTime);
    });

    Object.keys(queryBreakdown).forEach(queryName => {
      const breakdown = queryBreakdown[queryName];
      const queryMetrics = metrics.filter(m => m.queryName === queryName);
      const totalQueryTime = queryMetrics.reduce((sum, m) => sum + m.executionTime, 0);
      breakdown.averageTime = totalQueryTime / breakdown.count;
    });

    const recommendations = this.generateRecommendations(
      metrics,
      slowQueries,
      queryBreakdown,
      averageExecutionTime
    );

    return {
      totalQueries: metrics.length,
      averageExecutionTime,
      slowQueries,
      queryBreakdown,
      recommendations
    };
  }

  private generateRecommendations(
    metrics: QueryPerformanceMetrics[],
    slowQueries: QueryPerformanceMetrics[],
    queryBreakdown: Record<string, any>,
    averageExecutionTime: number
  ): string[] {
    const recommendations: string[] = [];

    if (averageExecutionTime > this.SLOW_QUERY_THRESHOLD) {
      recommendations.push(
        `Average query time (${averageExecutionTime.toFixed(2)}ms) exceeds ${this.SLOW_QUERY_THRESHOLD}ms threshold. ` +
        'Consider reviewing indexes and query patterns.'
      );
    } else if (averageExecutionTime < 50) {
      recommendations.push('Excellent! All queries are performing well under 50ms average.');
    }

    const verySlowQueries = slowQueries.filter(
      q => q.executionTime > this.VERY_SLOW_QUERY_THRESHOLD
    );

    if (verySlowQueries.length > 0) {
      const slowestQuery = verySlowQueries.reduce((a, b) =>
        a.executionTime > b.executionTime ? a : b
      );

      recommendations.push(
        `Critical: ${verySlowQueries.length} very slow queries detected (>${this.VERY_SLOW_QUERY_THRESHOLD}ms). ` +
        `Slowest: ${slowestQuery.queryName} at ${slowestQuery.executionTime.toFixed(2)}ms.`
      );
    }

    if (slowQueries.length > 0 && slowQueries.length / metrics.length > 0.2) {
      recommendations.push(
        `${((slowQueries.length / metrics.length) * 100).toFixed(1)}% of queries are slow (>${this.SLOW_QUERY_THRESHOLD}ms). ` +
        'Review database indexes and query optimization.'
      );
    }

    Object.entries(queryBreakdown).forEach(([queryName, data]) => {
      if (data.averageTime > this.SLOW_QUERY_THRESHOLD && data.count > 5) {
        recommendations.push(
          `Frequently slow query: "${queryName}" (${data.count} calls, ${data.averageTime.toFixed(2)}ms avg). ` +
          'Consider adding indexes or optimizing query structure.'
        );
      }

      if (data.maxTime > data.averageTime * 5 && data.count > 3) {
        recommendations.push(
          `Inconsistent performance: "${queryName}" has high variance ` +
          `(avg: ${data.averageTime.toFixed(2)}ms, max: ${data.maxTime.toFixed(2)}ms). ` +
          'May indicate missing indexes or table locks.'
        );
      }
    });

    const largeResultQueries = metrics.filter(m => m.rowsReturned > 1000);
    if (largeResultQueries.length > 0) {
      recommendations.push(
        `${largeResultQueries.length} queries returned more than 1000 rows. ` +
        'Consider implementing pagination for better performance.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('All queries performing optimally. No issues detected.');
    }

    return recommendations;
  }

  getQueryStatistics(queryName: string): {
    totalCalls: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalRows: number;
    averageRows: number;
  } | null {
    const metrics = queryOptimizer.getMetrics().filter(m => m.queryName === queryName);

    if (metrics.length === 0) {
      return null;
    }

    const totalTime = metrics.reduce((sum, m) => sum + m.executionTime, 0);
    const totalRows = metrics.reduce((sum, m) => sum + m.rowsReturned, 0);

    return {
      totalCalls: metrics.length,
      averageTime: totalTime / metrics.length,
      minTime: Math.min(...metrics.map(m => m.executionTime)),
      maxTime: Math.max(...metrics.map(m => m.executionTime)),
      totalRows,
      averageRows: totalRows / metrics.length
    };
  }

  getSlowestQueries(limit: number = 10): QueryPerformanceMetrics[] {
    const metrics = queryOptimizer.getMetrics();
    return metrics
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  getMostFrequentQueries(limit: number = 10): Array<{ queryName: string; count: number }> {
    const metrics = queryOptimizer.getMetrics();
    const frequency: Record<string, number> = {};

    metrics.forEach(m => {
      frequency[m.queryName] = (frequency[m.queryName] || 0) + 1;
    });

    return Object.entries(frequency)
      .map(([queryName, count]) => ({ queryName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  clearMetrics(): void {
    queryOptimizer.clearMetrics();
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function logPerformanceReport(): void {
  const report = performanceMonitor.generateReport();

  console.group('📊 Database Performance Report');
  console.log(`Total Queries: ${report.totalQueries}`);
  console.log(`Average Execution Time: ${report.averageExecutionTime.toFixed(2)}ms`);
  console.log(`Slow Queries (>100ms): ${report.slowQueries.length}`);

  if (report.slowQueries.length > 0) {
    console.group('⚠️ Slow Queries');
    report.slowQueries.forEach(q => {
      console.log(`${q.queryName}: ${q.executionTime.toFixed(2)}ms (${q.rowsReturned} rows)`);
    });
    console.groupEnd();
  }

  console.group('💡 Recommendations');
  report.recommendations.forEach(rec => console.log(`• ${rec}`));
  console.groupEnd();

  console.groupEnd();
}

export async function measureQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = performance.now();
  const result = await queryFn();
  const executionTime = performance.now() - startTime;

  if (executionTime > 100) {
    console.warn(
      `⚠️ Slow query detected: ${queryName} took ${executionTime.toFixed(2)}ms`
    );
  }

  return { result, executionTime };
}
