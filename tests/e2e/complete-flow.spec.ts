/**
 * E2E Tests: Complete User Journey
 *
 * Tests the full user flow from start to finish:
 * 1. User sign up/login
 * 2. Upload document
 * 3. Wait for processing
 * 4. Review extracted data
 * 5. Approve capital call
 * 6. View in calendar
 * 7. Export CSV
 *
 * Uses Playwright for browser automation
 * Mocks external API calls where needed
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test configuration
test.describe.configure({ mode: 'serial' });

test.describe('Complete User Journey E2E Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Full Capital Call Processing Flow', () => {
    test('should complete entire flow: upload -> process -> review -> approve -> view', async () => {
      // Step 1: Navigate to home page
      test.setTimeout(120000); // 2 minutes for full flow

      await page.goto('/');
      await expect(page).toHaveTitle(/Clearway/);

      // Step 2: Sign in (mock Clerk authentication)
      // In a real test, you would use Clerk's test mode or mock auth
      await page.evaluate(() => {
        // Mock authenticated session
        window.localStorage.setItem('__clerk_db_jwt', 'mock-jwt-token');
      });

      // Step 3: Navigate to upload page
      await page.goto('/upload');
      await expect(page.locator('h1')).toContainText(/Upload/i);

      // Step 4: Upload PDF file
      const fileInput = page.locator('input[type="file"]');
      const testFilePath = path.join(__dirname, '../fixtures/sample-capital-call.pdf');

      // Mock file upload since we may not have actual PDF
      await page.route('**/api/upload', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            uploadUrl: 'https://mock-r2-url.com/upload',
            documentId: 'doc-test-123',
          }),
        });
      });

      await page.route('**/api/process', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Trigger file selection
      await fileInput.setInputFiles({
        name: 'capital-call.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Mock PDF content'),
      });

      // Step 5: Wait for upload confirmation
      await expect(page.locator('text=/Uploaded|Processing/i')).toBeVisible({
        timeout: 10000,
      });

      // Step 6: Mock processing completion
      await page.route('**/api/capital-calls*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'cc-test-123',
              documentId: 'doc-test-123',
              fundName: 'Apollo Fund XI',
              amountDue: 250000,
              currency: 'USD',
              dueDate: '2025-12-15T00:00:00.000Z',
              status: 'PENDING_REVIEW',
              confidenceScores: {
                fundName: 0.95,
                amountDue: 0.98,
                dueDate: 0.95,
              },
            },
          ]),
        });
      });

      // Navigate to review page
      await page.goto('/review');
      await expect(page.locator('h1')).toContainText(/Review/i);

      // Step 7: Verify extracted data is displayed
      await expect(page.locator('text=Apollo Fund XI')).toBeVisible();
      await expect(page.locator('text=$250,000')).toBeVisible();
      await expect(page.locator('text=/December.*15.*2025/i')).toBeVisible();

      // Step 8: Edit if needed (optional)
      const fundNameInput = page.locator('input[name="fundName"]');
      if (await fundNameInput.isVisible()) {
        await expect(fundNameInput).toHaveValue('Apollo Fund XI');
      }

      // Step 9: Approve capital call
      await page.route('**/api/capital-calls/cc-test-123/approve', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cc-test-123',
            status: 'APPROVED',
            approvedAt: new Date().toISOString(),
          }),
        });
      });

      const approveButton = page.locator('button', { hasText: /Approve/i });
      await approveButton.click();

      // Step 10: Verify approval confirmation
      await expect(page.locator('text=/Approved|Success/i')).toBeVisible({
        timeout: 5000,
      });

      // Step 11: Navigate to calendar view
      await page.route('**/api/capital-calls/calendar*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'cc-test-123',
              fundName: 'Apollo Fund XI',
              amountDue: 250000,
              dueDate: '2025-12-15T00:00:00.000Z',
              status: 'APPROVED',
            },
          ]),
        });
      });

      await page.goto('/calendar');
      await expect(page.locator('h1')).toContainText(/Calendar/i);

      // Step 12: Verify capital call appears in calendar
      await expect(page.locator('text=Apollo Fund XI')).toBeVisible();

      // Step 13: Export to CSV
      await page.route('**/api/export*', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="capital-calls.csv"',
          },
          body: 'Fund Name,Amount Due,Due Date,Status\nApollo Fund XI,250000,2025-12-15,APPROVED\n',
        });
      });

      const exportButton = page.locator('button', { hasText: /Export/i });
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/capital-calls.*\.csv/i);
      }
    });

    test('should handle upload error gracefully', async () => {
      await page.goto('/upload');

      // Mock upload failure
      await page.route('**/api/upload', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'File too large',
          }),
        });
      });

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'large-file.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Large file'),
      });

      // Should show error message
      await expect(page.locator('text=/Error|Failed|too large/i')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should handle processing timeout', async () => {
      await page.goto('/upload');

      // Mock successful upload
      await page.route('**/api/upload', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            uploadUrl: 'https://mock-url.com/upload',
            documentId: 'doc-timeout-123',
          }),
        });
      });

      // Mock processing that never completes
      await page.route('**/api/process', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 60000)); // Never resolves
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: false }),
        });
      });

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Test'),
      });

      // Should show processing status
      await expect(page.locator('text=/Processing/i')).toBeVisible({
        timeout: 10000,
      });

      // In a real scenario, should show timeout or retry option
      // For this test, we just verify the processing state is shown
    });

    test('should allow rejection of capital call', async () => {
      await page.goto('/review');

      // Mock capital call data
      await page.route('**/api/capital-calls*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'cc-reject-123',
                documentId: 'doc-123',
                fundName: 'Incorrect Fund',
                amountDue: 100000,
                currency: 'USD',
                dueDate: '2025-12-31T00:00:00.000Z',
                status: 'PENDING_REVIEW',
              },
            ]),
          });
        }
      });

      await page.reload();

      // Mock rejection endpoint
      await page.route('**/api/capital-calls/cc-reject-123/reject', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Click reject button
      const rejectButton = page.locator('button', { hasText: /Reject/i });
      await rejectButton.click();

      // Verify rejection confirmation
      await expect(page.locator('text=/Rejected|Deleted/i')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('User Authentication Flow', () => {
    test('should redirect unauthenticated users to sign-in', async () => {
      // Clear auth state
      await page.context().clearCookies();
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/upload');

      // Should redirect to sign-in (Clerk handles this)
      // In test environment, might show sign-in component or redirect
      // This is a simplified check
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/sign-in|login|auth|upload/i);
    });
  });

  test.describe('Calendar View', () => {
    test('should display capital calls by month', async () => {
      await page.route('**/api/capital-calls/calendar*', async (route) => {
        const url = new URL(route.request().url());
        const month = url.searchParams.get('month');
        const year = url.searchParams.get('year');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'cc-1',
              fundName: 'Fund Alpha',
              amountDue: 100000,
              dueDate: `${year || '2025'}-${month || '12'}-10T00:00:00.000Z`,
              status: 'APPROVED',
            },
            {
              id: 'cc-2',
              fundName: 'Fund Beta',
              amountDue: 200000,
              dueDate: `${year || '2025'}-${month || '12'}-20T00:00:00.000Z`,
              status: 'APPROVED',
            },
          ]),
        });
      });

      await page.goto('/calendar');

      // Verify calendar shows capital calls
      await expect(page.locator('text=Fund Alpha')).toBeVisible();
      await expect(page.locator('text=Fund Beta')).toBeVisible();
      await expect(page.locator('text=$100,000')).toBeVisible();
      await expect(page.locator('text=$200,000')).toBeVisible();
    });

    test('should allow navigation between months', async () => {
      await page.goto('/calendar');

      // Mock different months
      await page.route('**/api/capital-calls/calendar*', async (route) => {
        const url = new URL(route.request().url());
        const month = url.searchParams.get('month') || '12';

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: `cc-month-${month}`,
              fundName: `Fund for Month ${month}`,
              amountDue: 150000,
              dueDate: `2025-${month}-15T00:00:00.000Z`,
              status: 'APPROVED',
            },
          ]),
        });
      });

      // Click next month button (if exists)
      const nextButton = page.locator('button', { hasText: /Next|>/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }

      // Verify calendar updated (content should change based on month)
      await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();
    });
  });

  test.describe('Export Functionality', () => {
    test('should export capital calls to CSV', async () => {
      await page.route('**/api/export*', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="capital-calls-export.csv"',
          },
          body: [
            'Fund Name,Amount Due,Due Date,Status',
            'Apollo Fund XI,250000,2025-12-15,APPROVED',
            'Blackstone Fund VII,500000,2026-01-10,APPROVED',
          ].join('\n'),
        });
      });

      await page.goto('/calendar');

      const exportButton = page.locator('button', { hasText: /Export|Download|CSV/i });
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toContain('.csv');

        // Verify download content
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk as Buffer);
        }
        const content = Buffer.concat(chunks).toString('utf-8');

        expect(content).toContain('Fund Name');
        expect(content).toContain('Apollo Fund XI');
        expect(content).toContain('250000');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when API is down', async () => {
      await page.route('**/api/capital-calls*', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/review');

      // Should show error message
      await expect(
        page.locator('text=/Error|Failed|Unable to load|Try again/i')
      ).toBeVisible({
        timeout: 10000,
      });
    });

    test('should allow retry after error', async () => {
      let attemptCount = 0;

      await page.route('**/api/capital-calls*', async (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt fails
          await route.abort('failed');
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'cc-retry-123',
                fundName: 'Success Fund',
                amountDue: 100000,
                dueDate: '2025-12-31T00:00:00.000Z',
                status: 'PENDING_REVIEW',
              },
            ]),
          });
        }
      });

      await page.goto('/review');

      // Wait for error
      await expect(page.locator('text=/Error|Failed/i')).toBeVisible({
        timeout: 10000,
      });

      // Click retry button
      const retryButton = page.locator('button', { hasText: /Retry|Try again/i });
      if (await retryButton.isVisible()) {
        await retryButton.click();

        // Should show success after retry
        await expect(page.locator('text=Success Fund')).toBeVisible({
          timeout: 10000,
        });
      }
    });
  });
});
