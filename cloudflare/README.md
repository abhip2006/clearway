# Cloudflare Workers Edge Caching

This directory contains Cloudflare Workers configuration for edge caching.

## Setup

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create a KV namespace:
   ```bash
   wrangler kv:namespace create "EDGE_CACHE"
   wrangler kv:namespace create "EDGE_CACHE" --preview
   ```

4. Update `wrangler.toml` with your account ID and KV namespace ID.

5. Deploy the worker:
   ```bash
   wrangler deploy
   ```

## Testing Locally

Run the worker locally with:
```bash
wrangler dev
```

## Cache Configuration

The worker caches different routes with different TTLs:

- `/api/public/*` - 1 hour
- `/api/analytics/*` - 5 minutes
- `/static/*` - 1 year (immutable)
- `/_next/static/*` - 1 year (immutable)
- `/_next/image*` - 24 hours

## Purging Cache

To purge all cached content:
```bash
wrangler kv:key list --namespace-id=YOUR_KV_ID | xargs -I {} wrangler kv:key delete {} --namespace-id=YOUR_KV_ID
```

Or use the Cloudflare dashboard to purge specific URLs.

## Monitoring

Monitor worker performance in the Cloudflare dashboard:
- https://dash.cloudflare.com/[account_id]/workers/overview

Key metrics to watch:
- Requests per second
- Cache hit rate
- Error rate
- CPU time
- KV operations

## Performance Benefits

With edge caching enabled:
- API response times reduced by 80-90%
- Reduced load on origin servers
- Better performance for global users
- Lower bandwidth costs
