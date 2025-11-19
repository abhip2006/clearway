# Portfolio Integration Agent - Clearway Phase 3

## Overview

The Portfolio Integration Agent manages comprehensive multi-platform portfolio data integration for Clearway Phase 3, enabling seamless synchronization of holdings, transactions, and performance metrics across Black Diamond, Orion, and Addepar platforms.

## Features

### Platform Integrations

- **Black Diamond**: OAuth 2.0 authentication, holdings/transactions/performance sync
- **Orion**: API key authentication, portfolio composition, tax lot tracking
- **Addepar**: OAuth 2.0 + API tokens, advanced analytics, benchmarks

### Core Capabilities

- ✅ Multi-platform authentication (OAuth 2.0, API keys)
- ✅ Real-time data synchronization
- ✅ Bidirectional data flow with conflict resolution
- ✅ Automatic sync scheduling and retry logic
- ✅ Data validation and reconciliation
- ✅ Real-time monitoring and alerting

## Architecture

```
portfolio-integration-agent/
├── backend/
│   ├── models/              # Data models (TypeScript)
│   ├── services/
│   │   ├── integrations/    # Platform-specific services
│   │   ├── sync/            # Sync engine and conflict resolution
│   │   └── reconciliation/  # Data reconciliation
│   ├── controllers/         # API route handlers
│   ├── middleware/          # Authentication, monitoring
│   └── utils/               # Encryption, helpers
├── frontend/
│   ├── pages/               # React pages
│   ├── components/          # Reusable components
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Frontend utilities
├── database/                # SQL migrations
├── config/                  # Configuration files
├── tests/                   # Unit and integration tests
└── docs/                    # Documentation
```

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.11+ (optional, for async operations)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run migrate

# Start the server
npm run dev
```

## Configuration

Create a `.env` file with the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clearway_portfolio
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Black Diamond
BLACK_DIAMOND_CLIENT_ID=your_client_id
BLACK_DIAMOND_CLIENT_SECRET=your_client_secret

# Orion
# API keys are configured per connection

# Addepar
ADDEPAR_CLIENT_ID=your_client_id
ADDEPAR_CLIENT_SECRET=your_client_secret

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

# Security
JWT_SECRET=your_jwt_secret

# Server
BASE_URL=http://localhost:3000
PORT=3000
```

## API Endpoints

### Portfolio Connections

- `POST /api/v1/portfolio-connections/initiate` - Start OAuth flow
- `POST /api/v1/portfolio-connections/callback` - Handle OAuth callback
- `GET /api/v1/portfolio-connections` - List connections
- `GET /api/v1/portfolio-connections/:id` - Get connection details
- `PUT /api/v1/portfolio-connections/:id` - Update connection
- `DELETE /api/v1/portfolio-connections/:id` - Disconnect
- `POST /api/v1/portfolio-connections/:id/sync` - Trigger manual sync

### Portfolio Management

- `POST /api/v1/portfolios` - Create portfolio
- `GET /api/v1/portfolios/:id` - Get portfolio
- `GET /api/v1/portfolios/:id/holdings` - Get holdings
- `GET /api/v1/portfolios/:id/transactions` - Get transactions
- `GET /api/v1/portfolios/:id/performance` - Get performance metrics
- `GET /api/v1/portfolios/:id/conflicts` - Get conflicts
- `PUT /api/v1/portfolios/:id/conflicts/:conflictId/resolve` - Resolve conflict

### Sync Monitoring

- `GET /api/v1/sync-operations` - Get sync history
- `GET /api/v1/sync-operations/:id` - Get operation details
- `GET /api/v1/sync-status` - Get real-time sync status
- `POST /api/v1/sync-operations/:id/retry` - Retry failed sync

### Reconciliation

- `POST /api/v1/reconciliation/start` - Start reconciliation
- `GET /api/v1/reconciliation/:id` - Get reconciliation results
- `POST /api/v1/reconciliation/:id/fix` - Auto-fix discrepancies

## Frontend Pages

### Portfolio Connections (`/dashboard/integrations/portfolio-connections`)

Manage connections to external platforms:
- View all connected platforms
- Add new connections (OAuth or API key)
- Configure sync settings
- Monitor connection health
- Trigger manual syncs

### Sync Monitoring (`/dashboard/integrations/sync-monitoring`)

Real-time sync operation monitoring:
- Overall system health
- Connection status dashboard
- Recent sync operations
- Success/failure metrics
- Detailed operation logs

### Conflict Resolution (`/dashboard/integrations/conflicts`)

Review and resolve data conflicts:
- Pending conflicts list
- Side-by-side comparison
- Resolution strategies (Clearway wins, Platform wins, Merge)
- Manual override capability

## Database Schema

Key tables:
- `portfolio_connections` - Platform connections
- `portfolios` - Consolidated portfolios
- `holdings` - Portfolio holdings
- `source_holdings` - Multi-platform tracking
- `transactions` - Portfolio transactions
- `sync_operations` - Sync audit trail
- `portfolio_conflicts` - Data conflicts

See `database/001_create_portfolio_tables.sql` for complete schema.

## Sync Engine

### Sync Frequency

- **Holdings**: Every 4 hours (configurable)
- **Transactions**: Real-time via webhooks, fallback 2 hours
- **Performance**: Daily at 8 PM UTC
- **Manual sync**: Available anytime

### Conflict Resolution Strategies

1. **CLEARWAY_WINS**: Use existing Clearway data
2. **PLATFORM_WINS**: Use platform data
3. **MERGE**: Average or intelligently merge
4. **TIMESTAMP**: Use most recent
5. **MANUAL_REVIEW**: Flag for user review

### Retry Logic

- Maximum 3 retries
- Exponential backoff (2x multiplier)
- Automatic scheduling on transient failures

## Monitoring

### Prometheus Metrics

Available at `/metrics`:
- `http_requests_total` - HTTP request counter
- `http_request_duration_seconds` - Request duration histogram
- `sync_operations_total` - Sync operation counter
- `sync_operation_duration_seconds` - Sync duration histogram
- `active_connections` - Active connection gauge
- `conflicts_total` - Conflict counter

### Logging

Structured JSON logging with:
- Timestamp
- Log level
- Request details
- Error context
- User ID

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Security

### Credential Storage

- OAuth tokens encrypted with AES-256-GCM
- API keys hashed with SHA-256
- Encryption keys stored in secure vault
- Token rotation every 30 days

### Authentication

- JWT-based authentication
- Role-based access control
- Rate limiting (1000 req/min per account)
- OAuth state parameter validation

## Deployment

### Production Checklist

- [ ] Configure production database
- [ ] Set up Redis cluster
- [ ] Configure OAuth credentials
- [ ] Set encryption keys
- [ ] Enable SSL/TLS
- [ ] Configure monitoring
- [ ] Set up backup procedures
- [ ] Review security settings
- [ ] Load test sync operations
- [ ] Configure alerting

### Docker Deployment

```bash
# Build image
docker build -t portfolio-integration-agent .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  portfolio-integration-agent
```

## Performance

### Benchmarks

- Holdings sync: <5 minutes for 50,000+ holdings
- Transaction sync: <2 minutes for 10,000+ transactions
- Concurrent connections: 1,000+ simultaneous syncs
- API response time: <500ms (p95)
- Database query time: <500ms (p95)

## Troubleshooting

### Common Issues

**Sync failing with "Token expired"**
- Tokens are automatically refreshed 5 minutes before expiry
- Check OAuth credentials are valid
- Verify refresh token is present

**Data conflicts not resolving**
- Check conflict resolution strategy setting
- Review manual conflicts in conflict center
- Verify source data quality

**Performance degradation**
- Check database connection pool
- Review sync batch sizes
- Monitor API rate limits

## Support

For issues and questions:
- GitHub Issues: https://github.com/clearway/portfolio-integration-agent
- Documentation: https://docs.clearway.app/portfolio-integration
- Email: support@clearway.app

## License

Proprietary - Clearway Phase 3
Copyright (c) 2025 Clearway
