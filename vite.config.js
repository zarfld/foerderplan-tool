import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	define: {
		global: 'globalThis'
	},
	optimizeDeps: {
		include: ['pouchdb']
	},
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
			scope: '/',
			base: '/',
			selfDestroying: process.env.NODE_ENV === 'production',
			registerType: 'autoUpdate',
			manifest: {
				short_name: 'Förderplan',
				name: 'Förderplan Tool - Digitale Fortschrittserfassung',
				description: 'Digitales Tool für Lehrer zur Erfassung und Analyse von Schülerfortschritten',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'any',
				theme_color: '#2563eb',
				background_color: '#ffffff',
				categories: ['education', 'productivity', 'utilities'],
				lang: 'de',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				],
				screenshots: [
					{
						src: '/screenshot-desktop.png',
						sizes: '1280x720',
						type: 'image/png',
						form_factor: 'wide'
					},
					{
						src: '/screenshot-mobile.png',
						sizes: '360x640',
						type: 'image/png',
						form_factor: 'narrow'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,json}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365
							}
						}
					}
				],
				skipWaiting: true,
				clientsClaim: true
			},
			devOptions: {
				enabled: true,
				suppressWarnings: process.env.SUPPRESS_WARNING === 'true',
				type: 'module',
				navigateFallback: '/'
			}
		})
	]
});
