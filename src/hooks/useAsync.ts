import { useState, useEffect, useCallback, useRef } from 'react';
import { withRetry, isNetworkError } from '../services/connectionStatus';

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface UseAsyncOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const {
    initialData = null,
    onSuccess,
    onError,
    retry = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setState({
      data: state.data,
      error: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    try {
      const result = retry
        ? await withRetry(asyncFunction, { maxRetries, retryDelay })
        : await asyncFunction();

      if (isMountedRef.current) {
        setState({
          data: result,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });

        if (onSuccess) {
          onSuccess(result);
        }
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      if (isMountedRef.current) {
        setState({
          data: null,
          error: errorObj,
          isLoading: false,
          isError: true,
          isSuccess: false,
        });

        if (onError) {
          onError(errorObj);
        }
      }

      throw errorObj;
    }
  }, [asyncFunction, retry, maxRetries, retryDelay, onSuccess, onError, state.data]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
    isNetworkError: state.error ? isNetworkError(state.error) : false,
  };
}

export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[],
  options: UseAsyncOptions<T> = {}
) {
  const asyncState = useAsync(asyncFunction, options);

  useEffect(() => {
    asyncState.execute();
  }, dependencies);

  return asyncState;
}
