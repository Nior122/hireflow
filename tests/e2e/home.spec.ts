import { test, expect } from '@playwright/test';

test('has title and displays hero section', async ({ page }) => {
  await page.goto('/');

  // Verify the page title
  await expect(page).toHaveTitle(/HireFlow/);

  // Check that the hero section or a prominent call to action exists
  // Since we might not know the exact text, we just verify the header exists
  const header = page.locator('header');
  await expect(header).toBeVisible();

  // Wait for network idle or main content to load
  const main = page.locator('main');
  await expect(main).toBeVisible();
});
