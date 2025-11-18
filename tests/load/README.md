# Load Testing Suite

Performance & Scaling Agent - Task PERF-004

## Overview

This directory contains K6 load testing scripts to validate Clearway's performance under various load scenarios. The test suite is designed to ensure the platform can handle 10,000+ concurrent users with sub-second response times.

## Prerequisites

1. Install K6:
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Set up environment variables:
   ```bash
   export BASE_URL=https://clearway.com
   export AUTH_TOKEN=your_test_token
   ```

## Test Scenarios

### 1. Load Test (`k6-capital-calls.js`)

**Purpose**: Validate performance under expected production load

**Configuration**:
- Duration: 16 minutes
- Max concurrent users: 1000
- Ramp pattern: Gradual increase
- Endpoints tested:
  - Dashboard metrics
  - Capital calls list
  - Capital call detail
  - Fund performance

**Performance Targets**:
- p95 response time: < 500ms
- p99 response time: < 1000ms
- Error rate: < 1%
- Successful requests: > 10,000

**Run**:
```bash
k6 run tests/load/k6-capital-calls.js
```

### 2. Stress Test (`k6-stress-test.js`)

**Purpose**: Find the system's breaking point

**Configuration**:
- Duration: 40 minutes
- Max concurrent users: 10,000
- Ramp pattern: Progressive increase (100 → 500 → 1000 → 2000 → 5000 → 10000)

**Expected Behavior**:
- System should gracefully handle increasing load
- Identify bottlenecks and resource constraints
- Monitor error rates and response time degradation

**Run**:
```bash
k6 run tests/load/k6-stress-test.js
```

### 3. Spike Test (`k6-spike-test.js`)

**Purpose**: Test system resilience to sudden traffic spikes

**Configuration**:
- Duration: 20 minutes
- Spike patterns:
  - Normal: 100 users
  - Spike 1: 5000 users (10 second ramp)
  - Spike 2: 10000 users (10 second ramp)

**Expected Behavior**:
- Auto-scaling should trigger quickly
- No cascading failures
- System should recover after spike

**Run**:
```bash
k6 run tests/load/k6-spike-test.js
```

### 4. Soak Test (`k6-soak-test.js`)

**Purpose**: Validate stability over extended periods

**Configuration**:
- Duration: 2+ hours
- Concurrent users: 500 (constant)
- Focus: Memory leaks, resource exhaustion, performance degradation

**Expected Behavior**:
- Response times should remain consistent
- No memory leaks
- No performance degradation over time

**Run**:
```bash
k6 run tests/load/k6-soak-test.js
```

## Running Tests

### Quick Start

Use the provided script to run tests:

```bash
# Run load test on localhost
./tests/load/run-load-tests.sh load

# Run stress test on staging
./tests/load/run-load-tests.sh stress https://staging.clearway.com YOUR_TOKEN

# Run all tests (except soak)
./tests/load/run-load-tests.sh all https://clearway.com YOUR_TOKEN

# Run soak test
./tests/load/run-load-tests.sh soak
```

### Manual Execution

Run individual tests with custom parameters:

```bash
# Basic run
k6 run tests/load/k6-capital-calls.js

# With environment variables
k6 run -e BASE_URL=https://clearway.com -e AUTH_TOKEN=token tests/load/k6-capital-calls.js

# With custom VUs and duration
k6 run --vus 100 --duration 10m tests/load/k6-capital-calls.js

# With output to file
k6 run --out json=results.json tests/load/k6-capital-calls.js

# With multiple outputs
k6 run \
  --out json=results.json \
  --out csv=results.csv \
  --out influxdb=http://localhost:8086/k6 \
  tests/load/k6-capital-calls.js
```

## Results Analysis

### K6 Metrics

K6 provides comprehensive metrics:

- `http_req_duration`: Total request duration
- `http_req_waiting`: Time waiting for response
- `http_req_connecting`: Time establishing connection
- `http_req_sending`: Time sending data
- `http_req_receiving`: Time receiving data
- `http_req_failed`: Failed requests rate
- `iterations`: Total completed iterations
- `vus`: Current virtual users

### Reading Results

Example output:
```
checks.........................: 100.00% ✓ 45123    ✗ 0
data_received..................: 127 MB  211 kB/s
data_sent......................: 8.4 MB  14 kB/s
http_req_duration..............: avg=287ms   min=102ms med=245ms max=1.2s  p(90)=420ms p(95)=480ms
http_req_failed................: 0.00%   ✓ 0        ✗ 15041
http_reqs......................: 15041   25/s
iteration_duration.............: avg=3.98s   min=3.1s  med=3.9s  max=5.2s  p(90)=4.5s  p(95)=4.8s
iterations.....................: 3760    6.26/s
vus............................: 100     min=0      max=1000
vus_max........................: 1000    min=1000   max=1000
```

### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| p95 Response Time | < 500ms | < 1000ms | > 2000ms |
| p99 Response Time | < 1000ms | < 2000ms | > 5000ms |
| Error Rate | < 0.1% | < 1% | > 5% |
| Throughput | > 1000 req/s | > 500 req/s | < 100 req/s |
| Concurrent Users | 10,000+ | 5,000+ | < 1,000 |

## Integration with CI/CD

### GitHub Actions

```yaml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Test
        run: |
          k6 run \
            --out json=results.json \
            -e BASE_URL=${{ secrets.STAGING_URL }} \
            -e AUTH_TOKEN=${{ secrets.TEST_TOKEN }} \
            tests/load/k6-capital-calls.js

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: results.json
```

## Monitoring During Tests

### What to Monitor

1. **Application Metrics**:
   - Response times (p50, p95, p99)
   - Error rates
   - Request throughput
   - Active connections

2. **Infrastructure Metrics**:
   - CPU utilization
   - Memory usage
   - Network I/O
   - Database connections
   - Redis operations

3. **Database Metrics**:
   - Query execution time
   - Connection pool utilization
   - Active queries
   - Lock waits

4. **Cache Metrics**:
   - Cache hit rate
   - Cache miss rate
   - Redis memory usage
   - Evictions

### Tools

- **New Relic APM**: Real-time application performance monitoring
- **Datadog**: Infrastructure and application metrics
- **Grafana**: Custom dashboards
- **K6 Cloud**: Cloud-based load testing platform

## Troubleshooting

### Common Issues

**High Response Times**:
- Check database query performance
- Verify cache hit rates
- Review API endpoint optimization
- Check network latency

**High Error Rates**:
- Review application logs
- Check database connection pool
- Verify rate limiting configuration
- Monitor resource utilization

**Memory Leaks**:
- Run soak test
- Monitor memory usage over time
- Check for unclosed connections
- Review memory profiling data

**Connection Errors**:
- Increase connection pool size
- Check firewall rules
- Verify network configuration
- Review timeout settings

## Best Practices

1. **Test in Isolated Environment**: Run load tests in staging, not production
2. **Warm Up**: Always include a ramp-up period
3. **Realistic Scenarios**: Simulate actual user behavior
4. **Monitor Continuously**: Watch metrics during tests
5. **Document Results**: Keep historical performance data
6. **Iterate**: Run tests regularly to catch regressions
7. **Test Before Deploy**: Run load tests before major releases

## Performance Benchmarks

### Baseline Performance (No Load)

- API Response Time: ~50ms
- Database Query Time: ~10ms
- Cache Lookup Time: ~2ms

### Target Performance (1000 Users)

- p95 Response Time: < 500ms
- p99 Response Time: < 1000ms
- Error Rate: < 0.1%
- Throughput: > 1000 req/s

### Expected Performance (10,000 Users)

With proper optimization and scaling:
- p95 Response Time: < 1000ms
- p99 Response Time: < 2000ms
- Error Rate: < 1%
- Throughput: > 5000 req/s

## Next Steps

1. Run baseline tests to establish current performance
2. Identify and fix bottlenecks
3. Implement caching strategies
4. Optimize database queries
5. Configure auto-scaling
6. Run stress tests to validate improvements
7. Document performance improvements
8. Set up continuous load testing in CI/CD

## Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Cloud](https://k6.io/cloud/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/automated-performance-testing/)
- [API Load Testing Guide](https://k6.io/docs/testing-guides/api-load-testing/)
