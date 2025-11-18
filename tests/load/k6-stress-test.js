/**
 * K6 Stress Test - Find Breaking Point
 * Performance & Scaling Agent - Task PERF-004
 *
 * This test gradually increases load to find the system's breaking point
 *
 * Usage:
 *   k6 run tests/load/k6-stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    // Start low
    { duration: '2m', target: 100 },    // Ramp to 100 users
    { duration: '2m', target: 100 },    // Stay at 100

    // Increase gradually
    { duration: '2m', target: 500 },    // Ramp to 500 users
    { duration: '2m', target: 500 },    // Stay at 500

    { duration: '2m', target: 1000 },   // Ramp to 1000 users
    { duration: '2m', target: 1000 },   // Stay at 1000

    { duration: '2m', target: 2000 },   // Ramp to 2000 users
    { duration: '2m', target: 2000 },   // Stay at 2000

    { duration: '2m', target: 5000 },   // Ramp to 5000 users
    { duration: '5m', target: 5000 },   // Stay at 5000

    { duration: '2m', target: 10000 },  // Ramp to 10000 users
    { duration: '5m', target: 10000 },  // Stay at 10000

    // Cool down
    { duration: '5m', target: 0 },      // Ramp down
  ],

  thresholds: {
    // These are expected to fail - we want to see where they break
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.05'],  // Allow 5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  const res = http.get(`${BASE_URL}/api/analytics/dashboard`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    tags: { test_type: 'stress' },
  });

  responseTime.add(res.timings.duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (!success) {
    failureRate.add(1);
  }

  sleep(1);
}

export function setup() {
  console.log('Starting stress test...');
  console.log('This test will gradually increase load to find breaking point');
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Stress test completed in ${duration} seconds`);
}
