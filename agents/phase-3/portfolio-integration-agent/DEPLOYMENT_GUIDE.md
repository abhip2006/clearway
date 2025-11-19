# Portfolio Integration Agent - Deployment Guide

## Quick Start

### 1. Prerequisites Installation

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 14+
sudo apt-get install postgresql-14 postgresql-contrib

# Install Redis 6+
sudo apt-get install redis-server

# Verify installations
node --version   # Should be 18+
psql --version   # Should be 14+
redis-cli --version   # Should be 6+
```

### 2. Database Setup

```bash
# Create database
sudo -u postgres createdb clearway_portfolio

# Create user
sudo -u postgres psql -c "CREATE USER clearway WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE clearway_portfolio TO clearway;"

# Run migrations
cd /home/user/clearway/agents/phase-3/portfolio-integration-agent
psql -U clearway -d clearway_portfolio -f database/001_create_portfolio_tables.sql
```

### 3. Application Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Build application
npm run build

# Start in development
npm run dev

# Start in production
npm start
```

### 4. Obtain Platform Credentials

#### Black Diamond
1. Register application at https://developer.blackdiamond.com
2. Get Client ID and Client Secret
3. Set redirect URI: `{BASE_URL}/api/v1/portfolio-connections/callback/black-diamond`
4. Request scopes: `portfolio:read`, `holdings:read`, `transactions:read`, `performance:read`

#### Orion
1. Contact Orion support for API access
2. API keys are generated per-connection in Clearway UI
3. Users enter their Orion API credentials when connecting

#### Addepar
1. Register application at https://developers.addepar.com
2. Get Client ID and Client Secret
3. Set redirect URI: `{BASE_URL}/api/v1/portfolio-connections/callback/addepar`
4. Request scopes: `analytics:read`, `portfolios:read`, `wealth-plan:read`

### 5. Monitoring Setup

```bash
# Prometheus metrics available at
http://localhost:9090/metrics

# Add to prometheus.yml:
scrape_configs:
  - job_name: 'portfolio-integration'
    static_configs:
      - targets: ['localhost:9090']
```

### 6. Health Check

```bash
# Test API
curl http://localhost:3000/health

# Test database connection
npm run migrate

# Test Redis connection
redis-cli ping
```

## Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile (create this)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000 9090

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t portfolio-integration-agent .
docker run -p 3000:3000 -p 9090:9090 \
  --env-file .env \
  portfolio-integration-agent
```

### Kubernetes Deployment

```yaml
# deployment.yaml (create this)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio-integration-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: portfolio-integration
  template:
    metadata:
      labels:
        app: portfolio-integration
    spec:
      containers:
      - name: app
        image: portfolio-integration-agent:latest
        ports:
        - containerPort: 3000
        - containerPort: 9090
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        # ... other env vars
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### SSL/TLS Configuration

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d api.clearway.app

# Or configure in nginx
server {
    listen 443 ssl http2;
    server_name api.clearway.app;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /metrics {
        proxy_pass http://localhost:9090;
        # Restrict access to monitoring tools only
        allow 10.0.0.0/8;
        deny all;
    }
}
```

## Security Hardening

### 1. Generate Secure Keys

```bash
# Generate encryption key (32 characters)
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 64
```

### 2. Database Security

```bash
# Enable SSL for PostgreSQL
# Edit /etc/postgresql/14/main/postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 3000/tcp  # Block direct access
sudo ufw deny 5432/tcp  # Block external DB access
sudo ufw enable
```

## Monitoring & Alerting

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Portfolio Integration Monitoring",
    "panels": [
      {
        "title": "Sync Success Rate",
        "targets": [
          {
            "expr": "rate(sync_operations_total{status=\"COMPLETED\"}[5m]) / rate(sync_operations_total[5m])"
          }
        ]
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "sum(active_connections) by (platform)"
          }
        ]
      },
      {
        "title": "API Latency p95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
groups:
  - name: portfolio_integration_alerts
    rules:
      - alert: HighSyncFailureRate
        expr: rate(sync_operations_total{status="FAILED"}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High sync failure rate detected"

      - alert: ConnectionDown
        expr: active_connections{status="ERROR"} > 0
        for: 1m
        annotations:
          summary: "Portfolio connection in error state"

      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        annotations:
          summary: "API latency exceeds 1 second (p95)"
```

## Backup & Recovery

### Database Backup

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR=/backups/portfolio-integration
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U clearway clearway_portfolio | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
# Stop application
systemctl stop portfolio-integration

# Restore database
gunzip < backup_20250119_120000.sql.gz | psql -U clearway clearway_portfolio

# Start application
systemctl start portfolio-integration
```

## Scaling

### Horizontal Scaling

```bash
# Add more application instances behind load balancer
# Each instance shares the same database and Redis

# Using PM2 for clustering
npm install -g pm2
pm2 start npm --name "portfolio-integration" -i max -- start
```

### Database Scaling

```bash
# Set up read replicas for PostgreSQL
# Update connection strings to use replica for read operations

# In config:
DB_WRITE_HOST=primary.db.example.com
DB_READ_HOST=replica.db.example.com
```

## Troubleshooting

### Common Issues

**Issue**: Sync operations failing with "Token expired"
```bash
# Check token expiration
SELECT id, platform, token_expires_at
FROM portfolio_connections
WHERE token_expires_at < NOW();

# Tokens should auto-refresh, check logs for refresh errors
docker logs portfolio-integration | grep "refresh token"
```

**Issue**: High memory usage
```bash
# Check for memory leaks
node --inspect=0.0.0.0:9229 dist/backend/index.js

# Adjust batch sizes in config
SYNC_BATCH_SIZE=500  # Reduce from 1000
```

**Issue**: Database connection pool exhausted
```bash
# Increase pool size in config/default.json
"pool": {
  "min": 5,
  "max": 20
}
```

## Performance Tuning

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM holdings WHERE portfolio_id = 'xxx';

-- Add missing indexes if needed
CREATE INDEX CONCURRENTLY idx_holdings_custom ON holdings(column_name);

-- Update table statistics
ANALYZE holdings;
ANALYZE transactions;
```

### Caching Strategy

```typescript
// Implement Redis caching for frequently accessed data
// Example: Cache portfolio summary for 5 minutes

const cacheKey = `portfolio:${portfolioId}:summary`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const summary = await computePortfolioSummary(portfolioId);
await redis.setex(cacheKey, 300, JSON.stringify(summary));
return summary;
```

## Maintenance

### Regular Tasks

**Daily**:
- Monitor sync success rates
- Check error logs
- Verify backup completion

**Weekly**:
- Review performance metrics
- Check disk space
- Rotate logs

**Monthly**:
- Update dependencies
- Review security patches
- Audit access logs
- Test disaster recovery

### Upgrade Procedure

```bash
# 1. Backup current version
pg_dump clearway_portfolio > backup_before_upgrade.sql

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run migrations
npm run migrate

# 5. Build
npm run build

# 6. Run tests
npm test

# 7. Deploy with zero downtime
pm2 reload portfolio-integration
```

## Support

For issues:
- Check logs: `docker logs portfolio-integration`
- Monitor metrics: `http://localhost:9090/metrics`
- Review documentation: `README.md`
- Contact support: support@clearway.app
