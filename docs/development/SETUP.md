# Developer Setup Guide

This guide will help you set up the Clearway development environment on your local machine.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Running Locally](#running-locally)
5. [Running Tests](#running-tests)
6. [Debugging Tips](#debugging-tips)
7. [Common Issues](#common-issues)

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher (comes with Node.js)
- **PostgreSQL**: v15.x or higher
- **Git**: Latest version

### Optional (Recommended)

- **Docker**: For running PostgreSQL locally
- **VS Code**: With recommended extensions
- **Postman** or **Insomnia**: For API testing

### Verify Installation

```bash
node --version  # Should be v20.x or higher
npm --version   # Should be v10.x or higher
psql --version  # Should be PostgreSQL 15.x or higher
git --version
```

---

## Environment Variables

### Step 1: Copy Example File

```bash
cp .env.example .env
```

### Step 2: Configure Required Variables

Edit `.env` and configure the following:

#### Database

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/clearway_dev?schema=public"
```

#### Clerk Authentication

Sign up at https://clerk.com and create an application:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# URLs (keep as-is for local development)
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

#### Cloudflare R2 Storage

Sign up at https://dash.cloudflare.com:

```bash
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="clearway-documents-dev"
R2_PUBLIC_URL="https://cdn.clearway.dev" # Optional
```

#### Azure Document Intelligence

Sign up at https://portal.azure.com:

```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
AZURE_DOCUMENT_INTELLIGENCE_KEY="your-key"
```

#### OpenAI

Get API key from https://platform.openai.com:

```bash
OPENAI_API_KEY="sk-..."
```

#### Anthropic Claude (Optional)

Get API key from https://console.anthropic.com:

```bash
ANTHROPIC_API_KEY="sk-ant-..."
```

#### Resend Email

Sign up at https://resend.com:

```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Clearway Dev <dev@clearway.dev>"
```

#### Inngest

Sign up at https://inngest.com:

```bash
INNGEST_SIGNING_KEY="signkey-dev-..."
INNGEST_EVENT_KEY="test_..."
```

#### Langfuse (Optional - for LLM observability)

Sign up at https://cloud.langfuse.com:

```bash
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_HOST="https://cloud.langfuse.com"
```

#### Application Settings

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Step 3: Verify Configuration

All required environment variables are set:

```bash
node -e "require('dotenv').config(); console.log('✓ Environment variables loaded')"
```

---

## Database Setup

### Option 1: Local PostgreSQL

#### Install PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

**Windows**:
Download installer from https://www.postgresql.org/download/windows/

#### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE clearway_dev;

# Create user (optional)
CREATE USER clearway_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE clearway_dev TO clearway_user;

# Exit
\q
```

### Option 2: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run --name clearway-postgres \
  -e POSTGRES_DB=clearway_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

### Option 3: Neon (Cloud PostgreSQL)

1. Sign up at https://neon.tech
2. Create a new project: "clearway-dev"
3. Copy the connection string
4. Update `DATABASE_URL` in `.env`

### Initialize Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# OR run migrations (production-like)
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### Verify Database

```bash
# Open Prisma Studio (database GUI)
npm run db:studio
```

Navigate to http://localhost:5555 to view your database.

---

## Running Locally

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

This starts:
- **Next.js dev server**: http://localhost:3000
- **Hot Module Replacement**: Automatic code reloading
- **Error overlay**: In-browser error messages

### Start Inngest Dev Server (Separate Terminal)

Inngest handles background jobs (document processing, email sending):

```bash
npm run inngest:dev
```

This starts:
- **Inngest dev server**: http://localhost:8288
- **Dashboard**: View and trigger jobs
- **Logs**: Real-time job execution logs

### Verify Everything Works

1. **Open app**: http://localhost:3000
2. **Sign up**: Create a test account
3. **Upload document**: Test the full flow
4. **Check Inngest**: Verify job executed at http://localhost:8288

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

### Integration Tests

```bash
npm run test:integration
```

### AI Accuracy Tests

Test AI extraction accuracy:

```bash
npm run test:accuracy
```

### Run All Tests

```bash
npm run test:all
```

This runs:
- Unit tests
- E2E tests
- AI accuracy tests

---

## Debugging Tips

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "console": "integratedTerminal"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 9229,
      "console": "integratedTerminal",
      "serverReadyAction": {
        "action": "debugWithChrome",
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s"
      }
    }
  ]
}
```

### Recommended VS Code Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "ms-playwright.playwright",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### Debug Server-Side Code

Add `debugger` statement:

```typescript
export async function POST(req: Request) {
  debugger; // Execution will pause here
  const data = await req.json();
  // ...
}
```

Run with debugger attached:
```bash
NODE_OPTIONS='--inspect' npm run dev
```

### Debug API Routes

Use curl or Postman:

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer sk_test_..." \
  -F "file=@test.pdf" \
  -v
```

### View Database Queries

Enable Prisma query logging in `lib/db.ts`:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Monitor Background Jobs

Open Inngest dashboard: http://localhost:8288

- View job history
- Trigger jobs manually
- View job logs and errors

---

## Common Issues

### Issue: Port 3000 Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Issue: Database Connection Failed

**Error**: `Can't reach database server`

**Solution**:
1. Verify PostgreSQL is running:
   ```bash
   # macOS/Linux
   pg_isready

   # Or check Docker
   docker ps
   ```

2. Check `DATABASE_URL` in `.env`
3. Verify database exists:
   ```bash
   psql -l | grep clearway_dev
   ```

### Issue: Prisma Client Not Generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm run db:generate
```

### Issue: Clerk Authentication Not Working

**Error**: `Clerk: Unable to verify authentication`

**Solution**:
1. Verify `CLERK_SECRET_KEY` is set
2. Check Clerk dashboard for correct keys
3. Clear browser cookies and try again

### Issue: File Upload Fails

**Error**: `Failed to upload to R2`

**Solution**:
1. Verify R2 credentials in `.env`
2. Check R2 bucket exists
3. Verify CORS settings in Cloudflare dashboard

### Issue: AI Extraction Fails

**Error**: `Azure Document Intelligence error`

**Solution**:
1. Verify Azure credentials
2. Check Azure subscription is active
3. Ensure PDF is valid and not corrupted
4. Check Langfuse logs for details

### Issue: Inngest Jobs Not Running

**Error**: Jobs appear in queue but don't execute

**Solution**:
1. Verify Inngest dev server is running:
   ```bash
   npm run inngest:dev
   ```

2. Check Inngest dashboard: http://localhost:8288
3. Verify `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` are set

---

## Next Steps

### Development Workflow

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**: Edit code

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Commit**:
   ```bash
   git add .
   git commit -m "feat: Add your feature"
   ```

5. **Push**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create PR**: On GitHub

### Helpful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Inngest Documentation](https://www.inngest.com/docs)

### Getting Help

- **Discord**: Join our developer community
- **Email**: dev@clearway.com
- **Office Hours**: Fridays 2-3pm EST

---

**Ready to build?** Start the dev server and happy coding!

```bash
npm run dev
```
