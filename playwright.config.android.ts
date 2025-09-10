import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Android PWA testing
 * Uses a different port to avoid conflicts with main CI pipeline
 */
export default defineConfig({
	testDir: './tests',
	fullyParallel: false, // Run tests sequentially for mobile
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 3 : 1,
	workers: 1, // Single worker for mobile tests
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:4174', // Different port
		trace: 'on-first-retry'
	},

	projects: [
		// Only Mobile Chrome for Android testing
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] }
		}
	],

	webServer: {
		command: 'npm run build && npx vite preview --port 4174',
		port: 4174,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	}
});
