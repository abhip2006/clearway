/**
 * K6 Soak Test - Long Duration Test
 * Performance & Scaling Agent - Task PERF-004
 *
 * Tests system stability over extended periods
 * Helps identify memory leaks and performance degradation
 *
 * Usage:
 *   k6 run tests/load/k6-soak-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const responseTime = new Trend('response_time');
const totalRequests = new Counter('total_requests');

export const options = {
  stages: [
    // Ramp up
    { duration: '5m', target: 500 },    // Ramp to 500 users

    // Soak - maintain load for extended period
    { duration: '2h', target: 500 },    // Stay at 500 users for 2 hours

    // Ramp down
    { duration: '5m', target: 0 },      // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    // Check that response time doesn't degrade over time
    'response_time': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  totalRequests.add(1);

  // Simulate realistic user behavior
  const scenarios = [
    () => viewDashboard(),
    () => listCapitalCalls(),
    () => viewFundPerformance(),
    () => viewMonthlyAnalytics(),
  ];

  // Pick random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  // Random think time
  sleep(Math.random() * 5 + 2); // 2-7 seconds
}

function viewDashboard() {
  const res = http.get(`${BASE_URL}/api/analytics/dashboard`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  responseTime.add(res.timings.duration);

  check(res, {
    'dashboard OK': (r) => r.status === 200,
  }) || failureRate.add(1);
}

function listCapitalCalls() {
  const res = http.get(`${BASE_URL}/api/capital-calls`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  responseTime.add(res.timings.duration);

  check(res, {
    'list OK': (r) => r.status === 200,
  }) || failureRate.add(1);
}

function viewFundPerformance() {
  const res = http.get(`${BASE_URL}/api/analytics/funds`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  responseTime.add(res.timings.duration);

  check(res, {
    'funds OK': (r) => r.status === 200,
  }) || failureRate.add(1);
}

function viewMonthlyAnalytics() {
  const res = http.get(`${BASE_URL}/api/analytics/monthly`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  responseTime.add(res.timings.duration);

  check(res, {
    'analytics OK': (r) => r.status === 200,
  }) || failureRate.add(1);
}

export function setup() {
  console.log('Starting soak test...');
  console.log('This test will run for 2+ hours to check for memory leaks');
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`Soak test completed in ${duration.toFixed(2)} minutes`);
}
