<script lang="ts">
	import { onMount } from 'svelte';
	
	let status = 'Loading...';
	let error = '';
	
	onMount(async () => {
		try {
			status = 'Testing PouchDB import...';
			
			// Test PouchDB import
			const PouchDB = await import('pouchdb');
			status = 'PouchDB imported successfully';
			
			// Test adapter import
			const adapter = await import('pouchdb-adapter-idb');
			status = 'Adapter imported successfully';
			
			// Test PouchDB initialization
			PouchDB.default.plugin(adapter.default);
			const db = new PouchDB.default('test-db', { adapter: 'idb' });
			
			status = 'PouchDB initialized successfully!';
			
		} catch (err: any) {
			error = `Error: ${err?.message || err}`;
			status = 'Failed to initialize';
		}
	});
</script>

<svelte:head>
	<title>Debug - Förderplan Tool</title>
</svelte:head>

<main>
	<h1>🔍 Debug Page</h1>
	<div class="status">
		<strong>Status:</strong> {status}
	</div>
	
	{#if error}
		<div class="error">
			<strong>Error:</strong> {error}
		</div>
	{/if}
	
	<p>This page tests the core dependencies that might be causing 500 errors.</p>
	<a href="/">← Back to Main</a>
</main>

<style>
	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}
	
	h1 {
		color: #2563eb;
	}
	
	.status {
		padding: 1rem;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
	
	.error {
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		margin: 1rem 0;
		color: #dc2626;
	}
	
	a {
		color: #2563eb;
		text-decoration: none;
	}
	
	a:hover {
		text-decoration: underline;
	}
</style>
