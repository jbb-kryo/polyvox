import { useEffect, useRef, useCallback } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  );
}

export function useMeasurePerformance(componentName: string, enabled: boolean = false) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current++;

    if (enabled && process.env.NODE_ENV === 'development') {
      const renderTime = Date.now() - mountTime.current;
      console.log(`[Performance] ${componentName} - Render #${renderCount.current} - ${renderTime}ms`);
    }
  });

  useEffect(() => {
    mountTime.current = Date.now();

    if (enabled && process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} mounted`);
    }

    return () => {
      if (enabled && process.env.NODE_ENV === 'development') {
        const lifetime = Date.now() - mountTime.current;
        console.log(`[Performance] ${componentName} unmounted after ${lifetime}ms (${renderCount.current} renders)`);
      }
    };
  }, [componentName, enabled]);

  return { renderCount: renderCount.current };
}

export function useRenderCount(componentName: string) {
  const count = useRef(0);
  count.current++;

  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      console.log(`${componentName} rendered ${count.current} times`);
    });
  }

  return count.current;
}

export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}

interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options: LazyLoadOptions = {}
) {
  const { threshold = 0.1, rootMargin = '50px' } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, callback, threshold, rootMargin]);
}

export function useRequestIdleCallback(callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(callback);
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(callback, 1);
      return () => clearTimeout(id);
    }
  }, deps);
}
