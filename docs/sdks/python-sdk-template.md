# Clearway Python SDK

## Installation

```bash
pip install clearway-sdk
```

## Quick Start

```python
from clearway import ClearwayClient

client = ClearwayClient(
    api_key='key_abc123',
    api_secret='secret_xyz789'
)

# Create an app
app = client.apps.create(
    name='My Integration',
    slug='my-integration',
    description='Integration with my service',
    long_description='Full description here',
    category='Integrations',
    features=['Feature 1', 'Feature 2'],
    permissions=['read:apps', 'write:apps']
)

print(f'App created: {app.id}')

# Get usage analytics
usage = client.analytics.get_usage(period='2025-11-19')

print(f'API calls: {usage.request_count}')
print(f'Errors: {usage.error_count}')
print(f'Top endpoints: {usage.by_endpoint[:5]}')

# Subscribe to webhooks
webhook = client.webhooks.create(
    url='https://myapp.com/webhook',
    events=['app.installed', 'app.uninstalled']
)

print(f'Webhook created: {webhook.id}')
print(f'Secret: {webhook.secret}')  # Save this!
```

## Async Support

```python
import asyncio
from clearway import AsyncClearwayClient

async def main():
    client = AsyncClearwayClient(
        api_key='key_abc123',
        api_secret='secret_xyz789'
    )

    # Async requests
    apps = await client.apps.list_async()

    for app in apps:
        print(f'{app.name}: {app.install_count} installs')

    await client.close()

asyncio.run(main())
```

## Type Hints

```python
from clearway.types import App, Usage, Webhook
from typing import List

def process_apps(apps: List[App]) -> None:
    for app in apps:
        print(f'{app.name}: {app.rating}/5')

usage: Usage = client.analytics.get_usage()
print(f'Requests: {usage.request_count}')
```

## Error Handling

```python
from clearway.exceptions import (
    ValidationError,
    RateLimitError,
    AuthenticationError
)

try:
    app = client.apps.create(name='Test App', slug='test')
except ValidationError as e:
    print(f'Validation failed: {e.details}')
except RateLimitError as e:
    print(f'Rate limit exceeded. Retry after: {e.retry_after}')
except AuthenticationError:
    print('Invalid API credentials')
```

## Pagination

```python
# Iterate through all apps
for app in client.apps.list(per_page=25):
    print(app.name)

# Manual pagination
page = client.apps.list(page=1, per_page=10)
print(f'Total apps: {page.total}')
print(f'Current page: {page.page}')
print(f'Apps: {page.items}')
```

## Webhooks Verification

```python
import hmac
import hashlib

def verify_webhook(payload: dict, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(
        signature,
        f'sha256={expected}'
    )
```
