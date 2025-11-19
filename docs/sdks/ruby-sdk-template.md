# Clearway Ruby SDK

## Installation

Add to your Gemfile:

```ruby
gem 'clearway-sdk'
```

Then run:

```bash
bundle install
```

## Quick Start

```ruby
require 'clearway'

client = Clearway::Client.new(
  api_key: 'key_abc123',
  api_secret: 'secret_xyz789'
)

# Create an app
app = client.apps.create(
  name: 'My Integration',
  slug: 'my-integration',
  description: 'Integration with my service',
  long_description: 'Full description here',
  category: 'Integrations',
  features: ['Feature 1', 'Feature 2'],
  permissions: ['read:apps', 'write:apps']
)

puts "App created: #{app.id}"

# Get usage analytics
usage = client.analytics.usage(period: '2025-11-19')

puts "API calls: #{usage.request_count}"
puts "Errors: #{usage.error_count}"
puts "Top endpoints: #{usage.by_endpoint.first(5)}"

# Subscribe to webhooks
webhook = client.webhooks.create(
  url: 'https://myapp.com/webhook',
  events: ['app.installed', 'app.uninstalled']
)

puts "Webhook created: #{webhook.id}"
puts "Secret: #{webhook.secret}" # Save this!
```

## Iteration

```ruby
# Iterate through all apps
client.apps.list(per_page: 25).each do |app|
  puts "#{app.name}: #{app.rating}/5"
end

# With block
client.apps.list do |app|
  puts app.name
end
```

## Error Handling

```ruby
begin
  app = client.apps.create(
    name: 'Test App',
    slug: 'test'
  )
rescue Clearway::ValidationError => e
  puts "Validation failed: #{e.details}"
rescue Clearway::RateLimitError => e
  puts "Rate limit exceeded. Retry after: #{e.retry_after}"
rescue Clearway::AuthenticationError
  puts 'Invalid API credentials'
end
```

## Webhooks

```ruby
# Create webhook
webhook = client.webhooks.create(
  url: 'https://myapp.com/webhook',
  events: ['app.installed']
)

# Verify webhook signature in your app
def verify_webhook(payload, signature, secret)
  expected = OpenSSL::HMAC.hexdigest(
    'SHA256',
    secret,
    payload.to_json
  )

  Rack::Utils.secure_compare(
    signature,
    "sha256=#{expected}"
  )
end
```
