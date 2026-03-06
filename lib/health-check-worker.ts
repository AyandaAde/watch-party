'use client';

/**
 * Health check worker that pings the server every 5 seconds to keep it alive
 */
export class HealthCheckWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private readonly intervalMs = 5000; // 5 seconds
  private readonly healthCheckUrl = '/api/health';

  /**
   * Start the health check worker
   */
  start(): void {
    if (this.isActive) {
      console.warn('[HealthCheck] Worker is already running');
      return;
    }

    this.isActive = true;
    console.log('[HealthCheck] Starting health check worker');

    // Initial ping
    this.ping();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.intervalMs);
  }

  /**
   * Stop the health check worker
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[HealthCheck] Stopped health check worker');
  }

  /**
   * Ping the health check endpoint
   */
  private async ping(): Promise<void> {
    console.log('Hi');
    
    try {
      const response = await fetch(this.healthCheckUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn('[HealthCheck] Ping failed with status:', response.status);
      }
    } catch (error) {
      console.error('[HealthCheck] Ping error:', error);
    }
  }

  /**
   * Check if the worker is active
   */
  get active(): boolean {
    return this.isActive;
  }
}

// Singleton instance
let workerInstance: HealthCheckWorker | null = null;

/**
 * Get or create the health check worker instance
 */
export function getHealthCheckWorker(): HealthCheckWorker {
  if (!workerInstance) {
    workerInstance = new HealthCheckWorker();
  }
  return workerInstance;
}
