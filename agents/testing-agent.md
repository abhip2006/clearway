# Testing Agent ✅

## Role
Responsible for comprehensive test coverage across unit tests, integration tests, and end-to-end tests. Ensures Clearway MVP is reliable, bug-free, and production-ready with 95%+ test coverage on critical paths.

## Primary Responsibilities

1. **Unit Testing**
   - Component tests (React Testing Library)
   - Function tests (Vitest)
   - Utility tests
   - Hook tests

2. **Integration Testing**
   - API endpoint tests
   - Database query tests
   - Service integration tests
   - Authentication flows

3. **End-to-End Testing**
   - Critical user flows (Playwright)
   - Upload → Extract → Review flow
   - Calendar view
   - Export functionality

4. **AI Accuracy Testing**
   - Validation on real documents
   - Accuracy measurement
   - Error pattern analysis
   - Regression testing

5. **Performance Testing**
   - Load testing
   - API response times
   - Page load speeds
   - Bundle size monitoring

## Tech Stack

### Testing Frameworks
- **Vitest** - Unit and integration tests (faster than Jest)
- **React Testing Library** - Component tests
- **Playwright** - E2E browser tests
- **MSW** - API mocking for tests

### Additional Tools
- **@testing-library/user-event** - User interaction simulation
- **@faker-js/faker** - Test data generation
- **@playwright/test** - E2E test runner

## MVP Testing Strategy

### Test Pyramid
```
     /\
    /E2E\ (5%)       - Critical user flows only
   /____\
  /      \
 /Integra\ (25%)    - API routes, DB queries
/__tion___\
/          \
/   Unit    \ (70%) - Components, functions, utilities
/____________\
```

**Target Coverage**:
- **Overall**: 95% on critical paths
- **Unit Tests**: 70% of codebase
- **Integration Tests**: 25% of codebase
- **E2E Tests**: 5% (critical flows only)

---

### Week 7: Unit Tests

**Task TEST-001: Setup Testing Infrastructure**
```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event @faker-js/faker
npm install -D msw
```

**Vitest Configuration**:
```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Test Setup**:
```typescript
// tests/setup.ts

import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.DATABASE_URL = 'postgresql://test';
```

**Acceptance Criteria**:
- ✅ Vitest configured
- ✅ React Testing Library ready
- ✅ Test utils available
- ✅ Coverage reporting enabled

---

**Task TEST-002: Component Unit Tests**
```typescript
// components/upload-dropzone.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { UploadDropzone } from './upload-dropzone';

// Mock fetch
global.fetch = vi.fn();

describe('UploadDropzone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload prompt', () => {
    render(<UploadDropzone />);
    expect(screen.getByText(/drag & drop PDFs here/i)).toBeInTheDocument();
  });

  it('accepts PDF files only', () => {
    render(<UploadDropzone />);
    const input = screen.getByLabelText(/upload/i, { selector: 'input' });

    expect(input).toHaveAttribute('accept', 'application/pdf');
  });

  it('shows error for files > 10MB', async () => {
    render(<UploadDropzone />);

    const input = screen.getByLabelText(/upload/i, { selector: 'input' });
    const file = new File(['a'.repeat(11 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/file must be under 10MB/i)).toBeInTheDocument();
    });
  });

  it('uploads file successfully', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadUrl: 'https://example.com/upload',
          documentId: 'doc_123',
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    global.fetch = mockFetch;

    render(<UploadDropzone />);

    const input = screen.getByLabelText(/upload/i, { selector: 'input' });
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
    });
  });
});
```

**More Component Tests**:
```typescript
// components/extraction-form.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ExtractionForm } from './extraction-form';

describe('ExtractionForm', () => {
  const mockInitialData = {
    fundName: 'Apollo Fund XI',
    amountDue: 250000,
    dueDate: '2025-12-15',
    confidence: {
      fundName: 0.95,
      amountDue: 0.98,
      dueDate: 0.92,
    },
  };

  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  it('displays pre-filled data', () => {
    render(
      <ExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByDisplayValue('Apollo Fund XI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('250000')).toBeInTheDocument();
  });

  it('shows confidence scores', () => {
    render(
      <ExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/95% confident/i)).toBeInTheDocument();
    expect(screen.getByText(/98% confident/i)).toBeInTheDocument();
  });

  it('validates form fields', async () => {
    render(
      <ExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const fundNameInput = screen.getByDisplayValue('Apollo Fund XI');
    fireEvent.change(fundNameInput, { target: { value: '' } });

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/fund name is required/i)).toBeInTheDocument();
    });

    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  it('calls onApprove with form data', async () => {
    render(
      <ExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const approveButton = screen.getByText(/approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith(
        expect.objectContaining({
          fundName: 'Apollo Fund XI',
          amountDue: 250000,
        })
      );
    });
  });

  it('calls onReject when reject clicked', () => {
    render(
      <ExtractionForm
        documentId="doc_123"
        initialData={mockInitialData}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByText(/reject/i);
    fireEvent.click(rejectButton);

    expect(mockOnReject).toHaveBeenCalled();
  });
});
```

**Utility Function Tests**:
```typescript
// lib/utils/format-currency.test.ts

import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
  });

  it('handles large amounts', () => {
    expect(formatCurrency(1234567.89, 'USD')).toBe('$1,234,567.89');
  });
});
```

**Acceptance Criteria**:
- ✅ All components have tests
- ✅ All utility functions have tests
- ✅ Edge cases covered
- ✅ 70%+ code coverage

---

### Week 7: Integration Tests

**Task TEST-003: API Endpoint Tests**
```typescript
// tests/api/upload.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST } from '@/app/api/upload/route';
import { db } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: 'test_user_123' }),
}));

beforeAll(async () => {
  // Create test user
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      clerkId: 'test_user_123',
      name: 'Test User',
    },
  });
});

afterAll(async () => {
  // Cleanup
  await prisma.document.deleteMany({
    where: { userId: 'test_user_123' },
  });
  await prisma.user.delete({
    where: { clerkId: 'test_user_123' },
  });
  await prisma.$disconnect();
});

describe('POST /api/upload', () => {
  it('creates document and returns presigned URL', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploadUrl).toBeDefined();
    expect(data.documentId).toBeDefined();

    // Verify document created in database
    const document = await prisma.document.findUnique({
      where: { id: data.documentId },
    });

    expect(document).toBeDefined();
    expect(document?.fileName).toBe('test.pdf');
    expect(document?.status).toBe('PENDING');
  });

  it('rejects files > 10MB', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'large.pdf',
        fileSize: 11 * 1024 * 1024,
        mimeType: 'application/pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects non-PDF files', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'document.docx',
        fileSize: 1024,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('requires authentication', async () => {
    // Mock unauthenticated request
    vi.mocked(auth).mockReturnValueOnce({ userId: null });

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

**Database Query Tests**:
```typescript
// tests/db/queries.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { queries } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Queries', () => {
  const testUserId = 'test_user_queries';

  beforeAll(async () => {
    // Setup test data
    await prisma.user.create({
      data: {
        clerkId: testUserId,
        email: 'queries@test.com',
      },
    });

    await prisma.document.create({
      data: {
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
        fileSize: 1024,
        userId: testUserId,
        status: 'REVIEW',
        capitalCall: {
          create: {
            userId: testUserId,
            fundName: 'Test Fund',
            amountDue: 100000,
            dueDate: new Date('2025-12-31'),
            status: 'APPROVED',
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.capitalCall.deleteMany({ where: { userId: testUserId } });
    await prisma.document.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { clerkId: testUserId } });
    await prisma.$disconnect();
  });

  it('gets pending documents', async () => {
    const docs = await queries.getPendingDocuments(testUserId);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].status).toBe('REVIEW');
  });

  it('gets upcoming capital calls', async () => {
    const calls = await queries.getUpcomingCapitalCalls(testUserId, 365);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].fundName).toBe('Test Fund');
  });
});
```

**Acceptance Criteria**:
- ✅ All API routes tested
- ✅ All database queries tested
- ✅ Authentication tested
- ✅ Error cases covered
- ✅ 25%+ integration coverage

---

### Week 7: E2E Tests

**Task TEST-004: Playwright E2E Tests**
```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install
```

**Playwright Configuration**:
```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Test: Complete Flow**:
```typescript
// tests/e2e/capital-call-flow.spec.ts

import { test, expect } from '@playwright/test';

test('complete capital call flow', async ({ page }) => {
  // 1. Sign up
  await page.goto('/sign-up');
  await page.fill('input[name="email"]', 'test@clearway-e2e.com');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // 2. Navigate to upload page
  await page.click('text=Upload');
  await expect(page).toHaveURL('/upload');

  // 3. Upload document
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./tests/fixtures/sample-capital-call.pdf');

  // Wait for processing
  await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Ready for Review')).toBeVisible({ timeout: 60000 });

  // 4. Review and approve
  await page.click('text=Review');
  await expect(page).toHaveURL(/\/documents\/.+\/review/);

  // Verify extraction appears
  await expect(page.locator('[name="fundName"]')).toHaveValue(/Apollo Fund|Blackstone/);
  await expect(page.locator('[name="amountDue"]')).toHaveValue(/\d+/);

  // Approve
  await page.click('button:has-text("Approve")');

  // Verify success
  await expect(page.locator('text=Approved successfully')).toBeVisible();

  // 5. Check calendar
  await page.goto('/dashboard/calendar');
  await expect(page.locator('text=Apollo Fund').or(page.locator('text=Blackstone'))).toBeVisible();

  // 6. Export CSV
  await page.click('button:has-text("Export")');
  await page.click('input[value="csv"]');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download")'),
  ]);

  expect(download.suggestedFilename()).toBe('capital-calls.csv');

  // Cleanup
  await page.click('text=Settings');
  await page.click('text=Delete Account');
  await page.click('button:has-text("Confirm")');
});
```

**E2E Test: Error Cases**:
```typescript
// tests/e2e/error-handling.spec.ts

import { test, expect } from '@playwright/test';

test('handles upload errors gracefully', async ({ page }) => {
  await page.goto('/upload');

  // Try to upload non-PDF
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./tests/fixtures/document.docx');

  await expect(page.locator('text=Only PDF files are supported')).toBeVisible();
});

test('handles network errors', async ({ page, context }) => {
  // Simulate offline
  await context.setOffline(true);

  await page.goto('/dashboard');

  await expect(page.locator('text=Connection lost')).toBeVisible();

  // Go back online
  await context.setOffline(false);

  await expect(page.locator('text=Connected')).toBeVisible();
});
```

**Acceptance Criteria**:
- ✅ Critical flows tested end-to-end
- ✅ Tests run in multiple browsers
- ✅ Error cases handled
- ✅ Screenshots on failure
- ✅ 5%+ E2E coverage on critical paths

---

### Week 7: AI Accuracy Testing

**Task TEST-005: AI Accuracy Validation** (see AI/ML Agent's Task AI-003)

Already implemented by AI/ML Agent:
- Validates on 100+ real documents
- Measures accuracy per field
- Reports errors with details
- Fails if < 95% accuracy

**Acceptance Criteria**:
- ✅ 95%+ overall accuracy
- ✅ 97%+ on critical fields
- ✅ Error patterns documented
- ✅ Regression tests in place

---

### Week 8: Performance Testing

**Task TEST-006: Performance Tests**
```typescript
// tests/performance/api-load.test.ts

import { describe, it, expect } from 'vitest';

describe('API Performance', () => {
  it('upload endpoint responds in < 500ms', async () => {
    const start = Date.now();

    await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      }),
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('handles concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, () =>
      fetch('http://localhost:3000/api/capital-calls/calendar')
    );

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every(r => r.ok);

    expect(allSuccessful).toBe(true);
  });
});
```

**Lighthouse CI Configuration**:
```javascript
// lighthouserc.js

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**Run Lighthouse**:
```bash
npm install -g @lhci/cli
lhci autorun
```

**Acceptance Criteria**:
- ✅ Lighthouse score > 90
- ✅ API responses < 500ms (p95)
- ✅ Page load < 3s
- ✅ No performance regressions

---

## Test Commands

**package.json scripts**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:accuracy": "tsx scripts/test-ai-accuracy.ts",
    "test:all": "npm run test && npm run test:e2e && npm run test:accuracy"
  }
}
```

## Continuous Testing

**GitHub Actions Integration** (already in DevOps Agent's CI/CD):
```yaml
- name: Run tests
  run: npm run test
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Quality Standards

### Code Coverage
- **Overall**: 95% on critical paths
- **Components**: 80%+
- **API Routes**: 90%+
- **Utilities**: 95%+

### Test Quality
- Tests are readable
- Tests are maintainable
- Tests are fast (< 5min total)
- Tests are reliable (no flaky tests)

### Documentation
- All test files have descriptions
- Complex tests have comments
- Fixtures documented

## Status Reporting

Location: `.agents/status/testing-status.json`

```json
{
  "agent": "testing-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 8,
  "completed_tasks": ["TEST-001", "TEST-002", "TEST-003", "TEST-004", "TEST-005", "TEST-006"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "metrics": {
    "code_coverage": "96%",
    "unit_tests": 145,
    "integration_tests": 42,
    "e2e_tests": 8,
    "ai_accuracy": "96.2%",
    "tests_passing": "100%"
  }
}
```

---

**Testing Agent is ready to ensure Clearway MVP is thoroughly tested and production-ready.**
