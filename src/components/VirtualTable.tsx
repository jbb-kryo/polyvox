import { useCallback, useRef, useEffect, useState, memo } from 'react';

interface VirtualTableProps<T> {
  data: T[];
  rowHeight: number;
  containerHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

function VirtualTableComponent<T>({
  data,
  rowHeight,
  containerHeight,
  renderRow,
  overscan = 3
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = data.length * rowHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    data.length - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleData = data.slice(startIndex, endIndex + 1);

  const offsetY = startIndex * rowHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleData.map((item, virtualIndex) => {
            const actualIndex = startIndex + virtualIndex;
            return (
              <div
                key={actualIndex}
                style={{ height: rowHeight }}
              >
                {renderRow(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const VirtualTable = memo(VirtualTableComponent) as typeof VirtualTableComponent;

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualListComponent<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className = ''
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(height / itemHeight);
  const overscan = 3;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleCount + overscan * 2
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height, overflow: 'auto' }}
      className={`scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 ${className}`}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => {
            const index = startIndex + i;
            return (
              <div key={index} style={{ height: itemHeight }}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const VirtualList = memo(VirtualListComponent) as typeof VirtualListComponent;

interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  columns: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
}

function VirtualGridComponent<T>({
  items,
  itemHeight,
  columns,
  height,
  renderItem,
  gap = 16
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount * (itemHeight + gap);
  const visibleRowCount = Math.ceil(height / (itemHeight + gap));
  const overscan = 1;

  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endRow = Math.min(rowCount - 1, startRow + visibleRowCount + overscan * 2);

  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startRow * (itemHeight + gap);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      onScroll={handleScroll}
      style={{ height, overflow: 'auto' }}
      className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`
          }}
        >
          {visibleItems.map((item, i) => {
            const index = startIndex + i;
            return <div key={index}>{renderItem(item, index)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

export const VirtualGrid = memo(VirtualGridComponent) as typeof VirtualGridComponent;
