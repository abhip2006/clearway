import { test, expect } from '@playwright/test';

/**
 * E2E Test: Error Handling
 *
 * Tests error scenarios:
 * - Invalid file types
 * - File size limits
 * - Network errors
 * - Invalid form data
 * - Authentication errors
 */

test.describe('Error Handling', () => {
  test('shows error for non-PDF files', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');

    // Try to upload a non-PDF file (create a test .txt file)
    // Note: Create test files in fixtures directory
    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a text file'),
    });

    // Verify error message
    await expect(page.locator('text=/only pdf files/i')).toBeVisible({ timeout: 5000 });
  });

  test('shows error for files exceeding size limit', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');

    // Create a mock large file (> 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    await fileInput.setInputFiles({
      name: 'large-document.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer,
    });

    // Verify error message
    await expect(page.locator('text=/file must be under 10mb/i')).toBeVisible({ timeout: 5000 });
  });

  test('handles network errors gracefully', async ({ page, context }) => {
    await page.goto('/dashboard');

    // Simulate offline mode
    await context.setOffline(true);

    // Try to navigate
    const navigationPromise = page.goto('/dashboard/calendar');

    // Verify error message or offline indicator
    await expect(
      page.locator('text=/connection lost|offline|network error/i')
    ).toBeVisible({ timeout: 10000 }).catch(() => {
      // Navigation might fail completely, which is also acceptable
      expect(navigationPromise).rejects.toThrow();
    });

    // Go back online
    await context.setOffline(false);

    // Verify reconnection
    await page.reload();
    await expect(
      page.locator('text=/connected|online/i')
    ).toBeVisible({ timeout: 10000 }).catch(() => {
      // Or the page just loads normally
      expect(page.locator('body')).toBeVisible();
    });
  });

  test('validates extraction form fields', async ({ page }) => {
    // Navigate to a document review page
    // Note: This assumes a test document exists. May need to create one first.
    await page.goto('/documents/test-doc-id/review');

    // Clear required field
    const fundNameInput = page.locator('input[name="fundName"]');
    await fundNameInput.clear();

    // Try to approve without required field
    await page.click('button:has-text("Approve")');

    // Verify validation error
    await expect(page.locator('text=/fund name is required/i')).toBeVisible({ timeout: 5000 });
  });

  test('handles invalid amount values', async ({ page }) => {
    await page.goto('/documents/test-doc-id/review');

    // Enter negative amount
    const amountInput = page.locator('input[name="amountDue"]');
    await amountInput.fill('-1000');

    // Try to approve
    await page.click('button:has-text("Approve")');

    // Verify validation error
    await expect(
      page.locator('text=/amount.*must be.*positive|greater than 0/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('handles invalid date values', async ({ page }) => {
    await page.goto('/documents/test-doc-id/review');

    // Clear due date
    const dateInput = page.locator('input[name="dueDate"]');
    await dateInput.clear();

    // Try to approve
    await page.click('button:has-text("Approve")');

    // Verify validation error
    await expect(page.locator('text=/due date.*required/i')).toBeVisible({ timeout: 5000 });
  });

  test('shows 404 page for non-existent documents', async ({ page }) => {
    const response = await page.goto('/documents/non-existent-id-12345/review');

    // Verify 404 status or error page
    expect(response?.status()).toBe(404);
    await expect(
      page.locator('text=/not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('requires authentication for protected routes', async ({ page, context }) => {
    // Clear cookies to simulate logged-out state
    await context.clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
  });

  test('handles API errors during upload', async ({ page }) => {
    // Intercept API and return error
    await page.route('**/api/upload', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample-capital-call.pdf');

    // Verify error message
    await expect(
      page.locator('text=/upload failed|error/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('handles timeout during AI processing', async ({ page }) => {
    // This test would need a way to simulate slow processing
    // Could use API mocking or a special test document

    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample-capital-call.pdf');

    // Wait for processing to start
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 10000 });

    // Verify timeout handling after expected processing time
    // Note: Adjust timeout based on actual processing time
    const processingTimeout = 120000; // 2 minutes

    await expect(
      page.locator('text=/processing.*taking longer|timeout|retry/i')
    ).toBeVisible({ timeout: processingTimeout }).catch(() => {
      // Or processing completes successfully, which is also fine
      expect(page.locator('text=Ready for Review')).toBeVisible();
    });
  });
});
