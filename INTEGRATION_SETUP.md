# Integration Setup Guide

Quick start guide for setting up all third-party service integrations.

## Prerequisites

- Node.js 18+ installed
- Git repository initialized
- Access to create accounts on third-party services

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `@clerk/nextjs` - Clerk authentication
- `@aws-sdk/client-s3` - Cloudflare R2 storage
- `inngest` - Background jobs
- `resend` - Email service
- `langfuse` - LLM observability
- `@react-email/components` - Email templates

## Step 2: Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Fill in the required values (see below for how to obtain each)

## Step 3: Service Account Setup

### Clerk (Authentication)

1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Go to **API Keys** and copy:
   - Publishable Key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret Key → `CLERK_SECRET_KEY`
4. Go to **Webhooks** and add endpoint:
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy Signing Secret → `CLERK_WEBHOOK_SECRET`

### Cloudflare R2 (Storage)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. Click **Create bucket**
   - Name: `clearway-documents`
3. Click **Manage R2 API Tokens** → **Create API Token**
   - Permissions: Object Read & Write
   - Copy Access Key ID → `R2_ACCESS_KEY_ID`
   - Copy Secret Access Key → `R2_SECRET_ACCESS_KEY`
4. Get your account ID from the R2 dashboard URL
   - Format endpoint: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`
   - Set as `R2_ENDPOINT`
5. Set `R2_BUCKET_NAME="clearway-documents"`
6. Configure CORS (see INTEGRATIONS.md)

### Inngest (Background Jobs)

1. Go to [inngest.com](https://inngest.com) and sign up
2. Create a new app
3. Go to **Keys** and copy:
   - Event Key → `INNGEST_EVENT_KEY`
   - Signing Key → `INNGEST_SIGNING_KEY`

**For Development:**
```bash
npm run inngest:dev
```
This starts the local Inngest dev server at `http://localhost:8288`

### Resend (Email)

1. Go to [resend.com](https://resend.com) and sign up
2. Add and verify your domain:
   - Go to **Domains** → **Add Domain**
   - Add the provided DNS records to your domain
   - Wait for verification (usually 1-5 minutes)
3. Go to **API Keys** → **Create API Key**
   - Copy key → `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL="Clearway <alerts@your-domain.com>"`

**For Development:**
- You can use Resend's test mode
- Preview templates with: `npm run email:dev`

### Langfuse (LLM Observability)

1. Go to [cloud.langfuse.com](https://cloud.langfuse.com) and sign up
2. Create a new project
3. Go to **Settings** and copy:
   - Public Key → `LANGFUSE_PUBLIC_KEY`
   - Secret Key → `LANGFUSE_SECRET_KEY`
4. Set `LANGFUSE_HOST="https://cloud.langfuse.com"`

## Step 4: Database Setup

The integrations require a database connection. See the Database Agent documentation for setup.

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## Step 5: Verify Setup

Run integration tests to verify all services are configured correctly:

```bash
npm run test:integration
```

Expected output:
- ✓ R2 storage upload/download tests pass
- ✓ Resend email sending tests pass
- ✓ Inngest event sending tests pass

## Step 6: Development Workflow

### Start All Services

Terminal 1 - Next.js:
```bash
npm run dev
```

Terminal 2 - Inngest (optional):
```bash
npm run inngest:dev
```

Terminal 3 - Email Preview (optional):
```bash
npm run email:dev
```

### Testing Services

**Test Clerk:**
- Visit `http://localhost:3000/sign-in`
- Create a test user
- Check Clerk dashboard for user creation

**Test R2:**
- Upload a file through your app
- Check Cloudflare R2 dashboard

**Test Inngest:**
- Trigger a job through your app
- View in Inngest dev server at `http://localhost:8288`

**Test Resend:**
- Trigger an email through your app
- Check Resend dashboard logs

**Test Langfuse:**
- Run an AI extraction
- View traces at `https://cloud.langfuse.com`

## Common Issues

### Clerk Webhooks Not Working
- Ensure webhook URL is publicly accessible (use ngrok for local dev)
- Verify webhook secret matches `.env.local`

### R2 CORS Errors
- Check CORS policy in R2 bucket settings
- Ensure your domain is in `AllowedOrigins`

### Inngest Functions Not Appearing
- Restart dev server
- Check functions are exported from `app/api/inngest/functions/`

### Emails Not Sending
- Verify domain is verified in Resend
- Check API key is correct
- For local dev, emails may be in test mode

### Langfuse Traces Not Appearing
- Wait 1-2 minutes for traces to sync
- Check API keys are correct
- Ensure `langfuse.shutdownAsync()` is called

## Next Steps

1. Review [INTEGRATIONS.md](./INTEGRATIONS.md) for detailed API usage
2. See individual agent specs in `/agents/` for implementation details
3. Run `npm run dev` to start development
4. Check `.agents/status/integration-status.json` for integration status

## Production Deployment

Before deploying to production:

1. Set all environment variables in your hosting platform (Vercel, etc.)
2. Update Clerk webhook URL to production domain
3. Update R2 CORS to include production domain
4. Verify Resend domain
5. Configure Inngest production environment
6. Run integration tests in production

See [INTEGRATIONS.md](./INTEGRATIONS.md) for full production checklist.

---

**Need Help?**
- Clerk: https://clerk.com/docs
- Cloudflare R2: https://developers.cloudflare.com/r2
- Inngest: https://www.inngest.com/docs
- Resend: https://resend.com/docs
- Langfuse: https://langfuse.com/docs
