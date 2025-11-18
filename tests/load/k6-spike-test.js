/**
 * K6 Spike Test - Sudden Traffic Spike
 * Performance & Scaling Agent - Task PERF-004
 *
 * Tests how the system handles sudden traffic spikes
 *
 * Usage:
 *   k6 run tests/load/k6-spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    // Normal load
    { duration: '2m', target: 100 },    // Warm up to 100 users
    { duration: '2m', target: 100 },    // Stay at 100

    // Sudden spike
    { duration: '10s', target: 5000 },  // Spike to 5000 users in 10 seconds
    { duration: '3m', target: 5000 },   // Maintain spike

    // Drop back
    { duration: '10s', target: 100 },   // Drop back to 100 users
    { duration: '2m', target: 100 },    // Stay at 100

    // Another spike
    { duration: '10s', target: 10000 }, // Spike to 10000 users
    { duration: '3m', target: 10000 },  // Maintain spike

    // Recovery
    { duration: '5m', target: 0 },      // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<2000'], // More lenient during spikes
    'http_req_failed': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  // Test multiple endpoints during spike
  const endpoints = [
    '/api/analytics/dashboard',
    '/api/capital-calls',
    '/api/analytics/funds',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    tags: { test_type: 'spike', endpoint },
  });

  responseTime.add(res.timings.duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!success) {
    failureRate.add(1);
  }

  sleep(Math.random() * 2); // Random sleep 0-2 seconds
}

export function setup() {
  console.log('Starting spike test...');
  console.log('This test simulates sudden traffic spikes');
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Spike test completed in ${duration} seconds`);
}
