# Clearway Node.js SDK

## Installation

```bash
npm install @clearway/sdk
# or
yarn add @clearway/sdk
```

## Quick Start

```javascript
const { ClearwayClient } = require('@clearway/sdk');

const client = new ClearwayClient({
  apiKey: 'key_abc123',
  apiSecret: 'secret_xyz789'
});

// Create an app
async function createApp() {
  const app = await client.apps.create({
    name: 'My Integration',
    slug: 'my-integration',
    description: 'Integration with my service',
    longDescription: 'Full description here',
    category: 'Integrations',
    features: ['Feature 1', 'Feature 2'],
    permissions: ['read:apps', 'write:apps'],
  });

  console.log('App created:', app.id);
}

// Get usage analytics
async function getUsage() {
  const usage = await client.analytics.getUsage({
    period: '2025-11-19'
  });

  console.log('API calls:', usage.requestCount);
  console.log('Errors:', usage.errorCount);
  console.log('Top endpoints:', usage.byEndpoint.slice(0, 5));
}

// Subscribe to webhooks
async function setupWebhook() {
  const webhook = await client.webhooks.create({
    url: 'https://myapp.com/webhook',
    events: ['app.installed', 'app.uninstalled']
  });

  console.log('Webhook created:', webhook.id);
  console.log('Secret:', webhook.secret); // Save this!
}
```

## Advanced Features

### Batch Operations

```javascript
const results = await client.batch([
  { method: 'GET', url: '/api/v1/apps/app1' },
  { method: 'GET', url: '/api/v1/apps/app2' },
  { method: 'GET', url: '/api/v1/apps/app3' }
]);

console.log('Batch results:', results);
```

### Pagination

```javascript
let page = await client.apps.list({ limit: 10 });

while (page.hasNextPage) {
  console.log('Apps:', page.data);
  page = await page.nextPage();
}
```

### Event Streaming

```javascript
client.on('app.installed', (event) => {
  console.log(`App installed: ${event.data.app_name}`);
  console.log(`User: ${event.data.user_id}`);
});

client.on('quota.exceeded', (event) => {
  console.log('API quota exceeded!');
  console.log(`Limit: ${event.data.limit}`);
});

// Start listening
client.startEventStream();
```

### Error Handling

```javascript
try {
  const app = await client.apps.create({ /* ... */ });
} catch (error) {
  if (error.type === 'validation_error') {
    console.error('Validation failed:', error.details);
  } else if (error.type === 'rate_limit_exceeded') {
    console.error('Rate limit exceeded. Retry after:', error.retryAfter);
  } else {
    console.error('Error:', error.message);
  }
}
```

## API Reference

### Apps

- `client.apps.list(options)` - List all apps
- `client.apps.create(data)` - Create new app
- `client.apps.get(appId)` - Get app details
- `client.apps.update(appId, data)` - Update app
- `client.apps.delete(appId)` - Delete app

### API Keys

- `client.keys.list()` - List API keys
- `client.keys.create(data)` - Create new API key
- `client.keys.get(keyId)` - Get key details
- `client.keys.update(keyId, data)` - Update key
- `client.keys.delete(keyId)` - Revoke key

### Analytics

- `client.analytics.getUsage(options)` - Get usage statistics
- `client.analytics.getEndpoints()` - Get per-endpoint analytics
- `client.analytics.getErrors()` - Get error tracking

### Webhooks

- `client.webhooks.list()` - List webhooks
- `client.webhooks.create(data)` - Create webhook
- `client.webhooks.get(webhookId)` - Get webhook details
- `client.webhooks.update(webhookId, data)` - Update webhook
- `client.webhooks.delete(webhookId)` - Delete webhook
- `client.webhooks.test(webhookId)` - Send test webhook
