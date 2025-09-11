import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	define: {
		global: 'globalThis'
	},
	optimizeDeps: {
		include: ['pouchdb', 'pouchdb-adapter-http', 'pouchdb-adapter-idb']
	},
	plugins: [sveltekit()]
});
