import React from 'react';

export function Skeleton({ className = '', variant = 'default' }: { className?: string; variant?: 'default' | 'circular' | 'text' }) {
  const baseClass = 'animate-pulse bg-gray-700';
  const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'text' ? 'rounded h-4' : 'rounded-lg';

  return <div className={`${baseClass} ${variantClass} ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${height}`}>
      <Skeleton className="h-5 w-40 mb-6" />
      <div className="flex items-end justify-between h-full pb-8 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: `${Math.random() * 60 + 40}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-10 h-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <ListSkeleton items={3} />
    </div>
  );
}

export function ModuleCardSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-12 h-12" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
