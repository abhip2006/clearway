/**
 * Monitoring Middleware
 * Prometheus metrics and logging
 */

import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, Gauge, register } from 'prom-client';

// HTTP Metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Sync Metrics
const syncOperationsTotal = new Counter({
  name: 'sync_operations_total',
  help: 'Total number of sync operations',
  labelNames: ['platform', 'data_type', 'status']
});

const syncOperationDuration = new Histogram({
  name: 'sync_operation_duration_seconds',
  help: 'Duration of sync operations in seconds',
  labelNames: ['platform', 'data_type', 'status'],
  buckets: [10, 30, 60, 120, 300, 600]
});

const syncRecordsProcessed = new Counter({
  name: 'sync_records_processed_total',
  help: 'Total number of records processed during sync',
  labelNames: ['platform', 'data_type', 'operation']
});

// Connection Metrics
const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active portfolio connections',
  labelNames: ['platform', 'status']
});

const conflictsTotal = new Counter({
  name: 'conflicts_total',
  help: 'Total number of data conflicts detected',
  labelNames: ['conflict_type', 'data_type']
});

/**
 * HTTP request monitoring middleware
 */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status: res.statusCode
      },
      duration
    );
  });

  next();
}

/**
 * Record sync operation metrics
 */
export function recordSyncMetrics(
  platform: string,
  dataType: string,
  status: string,
  duration: number,
  recordsProcessed: number,
  recordsInserted: number,
  recordsUpdated: number,
  recordsFailed: number
) {
  syncOperationsTotal.inc({ platform, data_type: dataType, status });
  syncOperationDuration.observe({ platform, data_type: dataType, status }, duration);

  syncRecordsProcessed.inc({ platform, data_type: dataType, operation: 'processed' }, recordsProcessed);
  syncRecordsProcessed.inc({ platform, data_type: dataType, operation: 'inserted' }, recordsInserted);
  syncRecordsProcessed.inc({ platform, data_type: dataType, operation: 'updated' }, recordsUpdated);
  syncRecordsProcessed.inc({ platform, data_type: dataType, operation: 'failed' }, recordsFailed);
}

/**
 * Update connection metrics
 */
export function updateConnectionMetrics(connections: any[]) {
  // Reset gauges
  activeConnections.reset();

  // Count connections by platform and status
  const counts = new Map<string, number>();

  for (const conn of connections) {
    const key = `${conn.platform}:${conn.status}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const [key, count] of counts.entries()) {
    const [platform, status] = key.split(':');
    activeConnections.set({ platform, status }, count);
  }
}

/**
 * Record conflict detection
 */
export function recordConflict(conflictType: string, dataType: string) {
  conflictsTotal.inc({ conflict_type: conflictType, data_type: dataType });
}

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

/**
 * Logging middleware
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    console.log(JSON.stringify(log));
  });

  next();
}
