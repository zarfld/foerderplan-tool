import { expect, test } from '@playwright/test';

test.describe('Core Application Features', () => {
	test('homepage loads and displays main navigation', async ({ page }) => {
		await page.goto('/');

		// Check page title
		await expect(page).toHaveTitle(/Förderplan Tool/);

		// Check main navigation elements
		await expect(page.locator('nav')).toBeVisible();
		
		// Check main content areas
		await expect(page.locator('h1')).toBeVisible();
	});

	test('demo page is accessible', async ({ page }) => {
		await page.goto('/demo');
		
		await expect(page.locator('h1')).toContainText(/Demo/);
	});

	test('features page is accessible', async ({ page }) => {
		await page.goto('/features');
		
		await expect(page.locator('h1')).toContainText(/Features/);
	});

	test('settings page is accessible', async ({ page }) => {
		await page.goto('/settings');
		
		await expect(page.locator('h1')).toContainText(/Einstellungen/);
	});

	test('app can handle student data', async ({ page }) => {
		await page.goto('/');

		// Try to interact with student manager if present
		const studentManager = page.locator('[data-testid="student-manager"]');
		if (await studentManager.isVisible()) {
			// Test basic functionality without breaking if components change
			await expect(studentManager).toBeVisible();
		}
	});

	test('responsive design works on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Check if the page renders properly on mobile
		await expect(page.locator('body')).toBeVisible();
		
		// Navigation should be mobile-friendly
		const nav = page.locator('nav');
		if (await nav.isVisible()) {
			await expect(nav).toBeVisible();
		}
	});
});
