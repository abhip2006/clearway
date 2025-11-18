# Clearway MVP Testing Guide

Comprehensive testing infrastructure for the Clearway MVP, ensuring 95%+ test coverage on critical paths with unit tests, integration tests, E2E tests, AI accuracy validation, and performance testing.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Testing Strategy](#testing-strategy)
3. [Test Types](#test-types)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Coverage Reports](#coverage-reports)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)

---

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
# Run unit and integration tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run AI accuracy tests
npm run test:accuracy

# Run performance tests
npm run test:performance

# Run everything
npm run test:all
```

---

## Testing Strategy

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

### Coverage Targets

- **Overall**: 95% on critical paths
- **Unit Tests**: 70% of codebase
- **Integration Tests**: 25% of codebase
- **E2E Tests**: 5% (critical flows only)
- **AI Accuracy**: 95%+ overall, 97%+ on critical fields

---

## Test Types

### 1. Unit Tests (Vitest)

**Location**: `tests/unit/`

**Purpose**: Test individual components, functions, and utilities in isolation.

**Examples**:
- Component rendering and interactions
- Form validation logic
- Utility functions (formatCurrency, date helpers)
- Custom hooks

**Run**:
```bash
npm test
npm run test:watch  # Watch mode
npm run test:ui     # UI mode
```

### 2. Integration Tests (Vitest)

**Location**: `tests/integration/`

**Purpose**: Test API routes, database queries, and service integrations.

**Examples**:
- API endpoint behavior
- Database query correctness
- Authentication flows
- Third-party service integrations

**Run**:
```bash
npm test tests/integration
```

### 3. End-to-End Tests (Playwright)

**Location**: `tests/e2e/`

**Purpose**: Test complete user journeys across the application.

**Examples**:
- Upload → Extract → Review → Approve flow
- Calendar view navigation
- CSV export
- Error handling and edge cases

**Run**:
```bash
npm run test:e2e
npm run test:e2e:ui      # UI mode
npm run test:e2e:debug   # Debug mode
npm run test:e2e:headed  # See browser
```

### 4. AI Accuracy Tests

**Location**: `tests/accuracy/`, `scripts/test-ai-accuracy.ts`

**Purpose**: Validate AI extraction accuracy against ground truth data.

**Success Criteria**:
- Overall accuracy >= 95%
- Critical fields (fundName, amountDue, dueDate) >= 97%

**Run**:
```bash
npm run test:accuracy
```

**Setup**:
1. Add test PDFs to `tests/accuracy/fixtures/`
2. Add ground truth data to `tests/accuracy/ground-truth.json`
3. Run validation script

### 5. Performance Tests

**Location**: `tests/performance/`

**Purpose**: Ensure performance meets requirements.

**Metrics**:
- API response times (< 500ms p95)
- Database queries (< 100ms)
- AI extraction (< 30s)
- Page loads (< 3s)
- Lighthouse score (> 90)

**Run**:
```bash
npm run test:performance

# Lighthouse CI
npm install -g @lhci/cli
lhci autorun
```

---

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test upload-dropzone.test.tsx

# Run tests matching pattern
npm test upload

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode (interactive)
npm run test:ui
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test capital-call-flow.spec.ts

# Run in specific browser
npx playwright test --project=chromium

# UI mode (interactive debugging)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# See browser while running
npm run test:e2e:headed

# Generate HTML report
npx playwright show-report
```

### AI Accuracy Tests

```bash
# Run accuracy validation
npm run test:accuracy

# View results
cat tests/accuracy/results.json
```

### Performance Tests

```bash
# Run performance tests
npm run test:performance

# Run Lighthouse
lhci autorun

# View Lighthouse report
open .lighthouseci/
```

---

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/components/my-component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api/upload.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/upload/route';

describe('POST /api/upload', () => {
  it('creates document and returns presigned URL', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploadUrl).toBeDefined();
    expect(data.documentId).toBeDefined();
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can upload and review document', async ({ page }) => {
  await page.goto('/upload');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./tests/e2e/fixtures/sample.pdf');

  await expect(page.locator('text=Processing')).toBeVisible();
  await expect(page.locator('text=Ready for Review')).toBeVisible({
    timeout: 60000,
  });

  await page.click('text=Review');
  await expect(page).toHaveURL(/\/documents\/.+\/review/);
});
```

---

## Coverage Reports

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Generate detailed coverage analysis
npm run test:coverage:report

# Open HTML report
open coverage/index.html
```

### Coverage Thresholds

Target coverage is **95%+ on critical paths**:

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 70,      // Target: 95%
    functions: 70,  // Target: 95%
    branches: 70,   // Target: 90%
    statements: 70, // Target: 95%
  },
}
```

### Critical Paths Requiring 95%+ Coverage

- **Upload flow**: Document upload, presigned URLs, file validation
- **AI extraction**: OCR pipeline, GPT-4/Claude extraction, confidence scoring
- **Review and approval**: Capital call approval/rejection, data validation
- **Calendar display**: Date filtering, view rendering
- **Export functionality**: CSV export, data formatting
- **Authentication**: User auth, organization membership
- **Tenant isolation**: Data access boundaries, organization filtering

### Current Test Coverage

- **Total Tests**: 40+ tests (including new integration and unit tests)
- **Integration Tests**: 10 comprehensive flows
- **Unit Tests**: 15+ utility and component tests
- **E2E Tests**: 5 complete user journeys
- **Phase 2 Tests**: 6 advanced feature test suites

### New Test Suites Added

#### Integration Tests
- `upload-flow.test.ts`: Complete document upload pipeline
- `extraction-flow.test.ts`: AI extraction with fallbacks
- `approval-flow.test.ts`: Capital call approval/rejection
- `complete-flow.spec.ts`: E2E user journey

#### Phase 2 Integration Tests
- `payment-matching.test.ts`: Payment-to-capital-call matching
- `swift-parser.test.ts`: SWIFT MT103 message parsing
- `audit-logger.test.ts`: Compliance audit logging
- `gdpr-export.test.ts`: Data export and deletion
- `org-invite.test.ts`: Organization invite flow
- `tenant-isolation.test.ts`: Multi-tenant data isolation

#### Unit Tests
- `utils.test.ts`: Utility function testing
- `cache.test.ts`: Caching strategy testing
- `validation.test.ts`: Zod schema validation

### Test Fixtures

Predefined test data available in `tests/fixtures/`:
- `capital-calls.ts`: Sample capital call data
- `documents.ts`: Sample document data
- `swift-messages.ts`: Sample SWIFT messages
- `index.ts`: API responses, users, organizations

### Test Utilities

Helper functions in `tests/utils/`:
- `db-helpers.ts`: Database test data creation
- `api-helpers.ts`: API testing utilities
- `test-helpers.ts`: General test utilities

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  ai-accuracy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:accuracy
```

---

## Best Practices

### General

1. **Test behavior, not implementation**
   - Focus on what users see and do
   - Don't test internal state or implementation details

2. **Keep tests simple and readable**
   - One assertion per test when possible
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)

3. **Use test helpers and utilities**
   - DRY principle applies to tests too
   - Create reusable test helpers in `tests/utils/`

4. **Mock external dependencies**
   - Use MSW for API mocking
   - Mock third-party services
   - Don't make real API calls in tests

### Unit Tests

- Test edge cases and error conditions
- Test happy path and sad path
- Use data-driven tests for multiple scenarios
- Keep tests fast (< 1 second each)

### Integration Tests

- Use test database or in-memory database
- Clean up after each test
- Test authentication and authorization
- Test error handling

### E2E Tests

- Only test critical user flows
- Keep tests independent (no shared state)
- Use test data that resets between runs
- Add explicit waits for async operations
- Take screenshots on failure

### AI Accuracy Tests

- Maintain ground truth data
- Test on diverse document types
- Track accuracy over time
- Document error patterns
- Iterate on prompts based on results

### Performance Tests

- Run on consistent hardware
- Test under realistic load
- Monitor trends over time
- Set realistic thresholds
- Optimize before deploying

---

## Troubleshooting

### Tests Failing Locally

```bash
# Clear cache and reinstall
rm -rf node_modules .next coverage
npm install

# Update snapshots
npm test -- -u

# Check Node.js version
node --version  # Should be 20+
```

### E2E Tests Timing Out

```bash
# Increase timeout in test
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});

# Run with more workers
npx playwright test --workers=1
```

### Coverage Not Meeting Threshold

```bash
# See uncovered lines
npm run test:coverage
open coverage/index.html

# Focus on critical paths first
# Add tests for uncovered branches
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)

---

## Support

For testing questions or issues:

1. Check this README
2. Review existing tests for examples
3. Check agent specification: `agents/testing-agent.md`
4. Consult team documentation

---

**Happy Testing! 🧪**
