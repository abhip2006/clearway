import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Capital Call Flow
 *
 * Tests the full user journey:
 * 1. Sign up / Sign in
 * 2. Upload PDF document
 * 3. Wait for AI processing
 * 4. Review extracted data
 * 5. Approve capital call
 * 6. View in calendar
 * 7. Export to CSV
 *
 * This test ensures all critical functionality works together end-to-end.
 */

test.describe('Complete Capital Call Flow', () => {
  test('user can upload, review, approve, and export capital call', async ({ page }) => {
    // Note: Uncomment and adapt when authentication is implemented
    /*
    // 1. Sign up / Sign in
    await page.goto('/sign-up');
    await page.fill('input[name="email"]', `test-${Date.now()}@clearway-e2e.com`);
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
    */

    // 2. Navigate to upload page
    await page.goto('/upload');
    await expect(page).toHaveURL('/upload');

    // 3. Upload document
    // Note: Add sample PDF to tests/e2e/fixtures/ directory
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample-capital-call.pdf');

    // Wait for upload confirmation
    await expect(page.locator('text=Uploading')).toBeVisible({ timeout: 5000 });

    // 4. Wait for AI processing
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Ready for Review')).toBeVisible({ timeout: 60000 });

    // 5. Navigate to review page
    await page.click('text=Review');
    await expect(page).toHaveURL(/\/documents\/.+\/review/);

    // Verify extraction appears
    await expect(page.locator('[name="fundName"]')).toHaveValue(/\w+/, { timeout: 5000 });
    await expect(page.locator('[name="amountDue"]')).toHaveValue(/\d+/);

    // Check confidence scores are displayed
    await expect(page.locator('text=/\\d+% confident/i')).toBeVisible();

    // 6. Approve capital call
    await page.click('button:has-text("Approve")');

    // Verify success message
    await expect(page.locator('text=/approved successfully/i')).toBeVisible({ timeout: 5000 });

    // 7. Check calendar view
    await page.goto('/dashboard/calendar');
    await expect(page).toHaveURL('/dashboard/calendar');

    // Verify capital call appears in calendar
    await expect(page.locator('text=/fund/i').first()).toBeVisible({ timeout: 5000 });

    // 8. Export CSV
    await page.click('button:has-text("Export")');

    // Select CSV format
    const csvOption = page.locator('input[value="csv"]');
    if (await csvOption.isVisible()) {
      await csvOption.click();
    }

    // Trigger download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download")'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/capital-calls.*\.csv/);

    // Optional: Cleanup (delete test account)
    // Note: Uncomment when user management is implemented
    /*
    await page.click('text=Settings');
    await page.click('text=Delete Account');
    await page.click('button:has-text("Confirm")');
    */
  });

  test('shows correct document status throughout flow', async ({ page }) => {
    await page.goto('/dashboard');

    // Upload document
    await page.goto('/upload');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample-capital-call.pdf');

    // Check status: Uploading -> Processing -> Review
    await expect(page.locator('text=Uploading')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Ready for Review')).toBeVisible({ timeout: 60000 });

    // Navigate to documents list
    await page.goto('/dashboard/documents');

    // Verify document appears with correct status
    await expect(page.locator('[data-status="REVIEW"]').first()).toBeVisible();

    // Open document
    await page.click('[data-status="REVIEW"]').first();

    // Approve
    await page.click('button:has-text("Approve")');

    // Go back to documents list
    await page.goto('/dashboard/documents');

    // Verify status changed to APPROVED
    await expect(page.locator('[data-status="APPROVED"]').first()).toBeVisible();
  });
});
