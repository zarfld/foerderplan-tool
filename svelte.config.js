import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Configure base path for subdirectory deployment
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/foerderplan-tool' : ''
		},
		// Static adapter for PWA deployment
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore errors for dynamic routes
				if (path.startsWith('/api/')) {
					return;
				}
				throw new Error(message);
			}
		}
	}
};

export default config;
