/**
 * K6 Load Test - Capital Calls API
 * Performance & Scaling Agent - Task PERF-004
 *
 * Tests the capital calls API endpoints under various load scenarios
 *
 * Usage:
 *   k6 run tests/load/k6-capital-calls.js
 *   k6 run --vus 100 --duration 10m tests/load/k6-capital-calls.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const failureRate = new Rate('failed_requests');
const responseTime = new Trend('response_time');
const successfulRequests = new Counter('successful_requests');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '1m', target: 100 },   // Ramp up to 100 users over 1 minute
    { duration: '5m', target: 100 },   // Stay at 100 users for 5 minutes

    // Scale up
    { duration: '1m', target: 500 },   // Ramp up to 500 users over 1 minute
    { duration: '5m', target: 500 },   // Stay at 500 users for 5 minutes

    // Spike test
    { duration: '1m', target: 1000 },  // Spike to 1000 users
    { duration: '2m', target: 1000 },  // Stay at 1000 users for 2 minutes

    // Scale down
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],

  // Performance thresholds
  thresholds: {
    // 95th percentile response time should be under 500ms
    'http_req_duration': ['p(95)<500'],

    // 99th percentile response time should be under 1s
    'http_req_duration{p99}': ['p(99)<1000'],

    // Error rate should be under 1%
    'http_req_failed': ['rate<0.01'],

    // Successful requests rate
    'successful_requests': ['count>10000'],

    // Custom metrics
    'failed_requests': ['rate<0.01'],
    'response_time': ['p(95)<500', 'p(99)<1000'],
  },

  // Test tags
  tags: {
    test_type: 'load',
    service: 'capital-calls-api',
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test scenarios
export default function () {
  // Test 1: Dashboard metrics
  testDashboardMetrics();
  sleep(1);

  // Test 2: Capital calls list
  testCapitalCallsList();
  sleep(1);

  // Test 3: Capital call detail
  testCapitalCallDetail();
  sleep(2);

  // Test 4: Fund performance
  testFundPerformance();
  sleep(1);
}

/**
 * Test dashboard metrics endpoint
 */
function testDashboardMetrics() {
  const startTime = Date.now();

  const res = http.get(`${BASE_URL}/api/analytics/dashboard`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'dashboard' },
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  const success = check(res, {
    'dashboard: status is 200': (r) => r.status === 200,
    'dashboard: response time < 500ms': (r) => r.timings.duration < 500,
    'dashboard: has total_calls': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.total_calls !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failureRate.add(1);
  }
}

/**
 * Test capital calls list endpoint
 */
function testCapitalCallsList() {
  const startTime = Date.now();

  const res = http.get(`${BASE_URL}/api/capital-calls?limit=50&offset=0`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'capital-calls-list' },
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  const success = check(res, {
    'list: status is 200': (r) => r.status === 200,
    'list: response time < 300ms': (r) => r.timings.duration < 300,
    'list: response is array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failureRate.add(1);
  }
}

/**
 * Test capital call detail endpoint
 */
function testCapitalCallDetail() {
  // Use a test ID - in real tests, this would come from the list endpoint
  const testId = __ENV.TEST_CAPITAL_CALL_ID || 'test-id';

  const startTime = Date.now();

  const res = http.get(`${BASE_URL}/api/capital-calls/${testId}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'capital-call-detail' },
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  const success = check(res, {
    'detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'detail: response time < 200ms': (r) => r.timings.duration < 200,
  });

  if (success && res.status === 200) {
    successfulRequests.add(1);
  } else if (res.status !== 404) {
    failureRate.add(1);
  }
}

/**
 * Test fund performance endpoint
 */
function testFundPerformance() {
  const startTime = Date.now();

  const res = http.get(`${BASE_URL}/api/analytics/funds`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'fund-performance' },
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  const success = check(res, {
    'funds: status is 200': (r) => r.status === 200,
    'funds: response time < 400ms': (r) => r.timings.duration < 400,
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failureRate.add(1);
  }
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Target: 1000 concurrent users`);
  return { startTime: Date.now() };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration} seconds`);
}
