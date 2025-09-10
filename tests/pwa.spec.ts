import { expect, test } from '@playwright/test';

test.describe('PWA Functionality', () => {
	test('has basic PWA manifest', async ({ page }) => {
		await page.goto('/');

		// Check if the manifest link is present
		const manifestLink = page.locator('link[rel="manifest"]');
		await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
	});

	test('service worker is registered', async ({ page }) => {
		await page.goto('/');

		// Wait for service worker registration
		const swRegistered = await page.evaluate(async () => {
			if ('serviceWorker' in navigator) {
				try {
					const registration = await navigator.serviceWorker.ready;
					return !!registration;
				} catch (error) {
					return false;
				}
			}
			return false;
		});

		expect(swRegistered).toBe(true);
	});

	test('app works offline (basic)', async ({ page, context }) => {
		// First, visit the page to cache resources
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Simulate offline mode
		await context.setOffline(true);

		// Reload the page and check if it still works
		await page.reload();

		// Check if main content is still visible
		await expect(page.locator('h1')).toBeVisible();
	});

	test('manifest.json is accessible and valid', async ({ page }) => {
		const response = await page.goto('/manifest.json');
		expect(response?.status()).toBe(200);

		const manifest = await response?.json();
		expect(manifest).toHaveProperty('name');
		expect(manifest).toHaveProperty('short_name');
		expect(manifest).toHaveProperty('start_url');
		expect(manifest).toHaveProperty('display');
		expect(manifest).toHaveProperty('icons');
		expect(manifest.icons.length).toBeGreaterThan(0);
	});

	test('icons are accessible', async ({ page }) => {
		// Test if the PWA icons are accessible
		const icon192Response = await page.goto('/icon-192.png');
		expect(icon192Response?.status()).toBe(200);

		const icon512Response = await page.goto('/icon-512.png');
		expect(icon512Response?.status()).toBe(200);
	});
});
