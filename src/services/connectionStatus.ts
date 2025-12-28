type ConnectionStatus = 'online' | 'offline' | 'slow' | 'checking';

type StatusListener = (status: ConnectionStatus) => void;

class ConnectionStatusService {
  private status: ConnectionStatus = 'online';
  private listeners: Set<StatusListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private slowConnectionThreshold = 3000;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.status = navigator.onLine ? 'online' : 'offline';

    window.addEventListener('online', () => this.updateStatus('online'));
    window.addEventListener('offline', () => this.updateStatus('offline'));

    this.startPeriodicCheck();
  }

  private startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  private async checkConnection() {
    if (!navigator.onLine) {
      this.updateStatus('offline');
      return;
    }

    try {
      this.updateStatus('checking');

      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (elapsed > this.slowConnectionThreshold) {
        this.updateStatus('slow');
      } else {
        this.updateStatus('online');
      }
    } catch (error) {
      this.updateStatus('offline');
    }
  }

  private updateStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public async testConnection(): Promise<boolean> {
    await this.checkConnection();
    return this.status === 'online' || this.status === 'slow';
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.listeners.clear();
  }
}

export const connectionStatusService = new ConnectionStatusService();

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt, error);
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  throw lastError;
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const networkErrorMessages = [
    'network error',
    'failed to fetch',
    'networkerror',
    'network request failed',
    'connection refused',
    'econnrefused',
    'timeout',
  ];

  const errorMessage = (error.message || error.toString()).toLowerCase();
  return networkErrorMessages.some((msg) => errorMessage.includes(msg));
}
