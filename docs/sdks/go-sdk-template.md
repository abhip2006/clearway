# Clearway Go SDK

## Installation

```bash
go get github.com/clearway/sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    clearway "github.com/clearway/sdk-go/v1"
)

func main() {
    ctx := context.Background()

    client := clearway.NewClient(
        clearway.WithAPIKey("key_abc123"),
        clearway.WithAPISecret("secret_xyz789"),
    )

    // Create an app
    app, err := client.Apps.Create(ctx, &clearway.CreateAppInput{
        Name:            "My Integration",
        Slug:            "my-integration",
        Description:     "Integration with my service",
        LongDescription: "Full description here",
        Category:        "Integrations",
        Features:        []string{"Feature 1", "Feature 2"},
        Permissions:     []string{"read:apps", "write:apps"},
    })

    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("App created: %s\n", app.ID)

    // Get usage analytics
    usage, err := client.Analytics.GetUsage(ctx, &clearway.UsageFilter{
        Period: "2025-11-19",
    })

    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("API calls: %d\n", usage.RequestCount)
    fmt.Printf("Errors: %d\n", usage.ErrorCount)

    // Subscribe to webhooks
    webhook, err := client.Webhooks.Create(ctx, &clearway.CreateWebhookInput{
        URL:    "https://myapp.com/webhook",
        Events: []string{"app.installed", "app.uninstalled"},
    })

    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Webhook created: %s\n", webhook.ID)
    fmt.Printf("Secret: %s\n", webhook.Secret) // Save this!
}
```

## Error Handling

```go
app, err := client.Apps.Create(ctx, input)

if err != nil {
    switch e := err.(type) {
    case *clearway.ValidationError:
        fmt.Printf("Validation failed: %v\n", e.Details)
    case *clearway.RateLimitError:
        fmt.Printf("Rate limit exceeded. Retry after: %v\n", e.RetryAfter)
    case *clearway.AuthenticationError:
        fmt.Println("Invalid API credentials")
    default:
        log.Fatal(err)
    }
}
```

## Pagination

```go
// List apps with pagination
apps, err := client.Apps.List(ctx, &clearway.ListOptions{
    Limit:  10,
    Offset: 0,
})

if err != nil {
    log.Fatal(err)
}

for _, app := range apps.Items {
    fmt.Printf("%s: %f/5\n", app.Name, app.Rating)
}

fmt.Printf("Total: %d\n", apps.Total)
fmt.Printf("Has more: %t\n", apps.HasMore)
```

## Webhook Verification

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
)

func VerifyWebhook(payload []byte, signature string, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    return hmac.Equal([]byte(signature), []byte(expected))
}
```

## Context Support

```go
import (
    "context"
    "time"
)

// With timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

app, err := client.Apps.Get(ctx, "app_123")

// With cancellation
ctx, cancel := context.WithCancel(context.Background())

go func() {
    // Cancel after some condition
    time.Sleep(2 * time.Second)
    cancel()
}()

apps, err := client.Apps.List(ctx, nil)
```
