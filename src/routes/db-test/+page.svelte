<script lang="ts">
	import { onMount } from 'svelte';
	import { initDB } from '$lib/utils/database';
	
	let status = 'Initializing...';
	let error: string | null = null;
	
	onMount(async () => {
		try {
			status = 'Testing database connection...';
			const db = await initDB();
			status = 'Database initialized successfully!';
			
			// Test a simple operation
			const testDoc = {
				_id: 'test-doc',
				type: 'test',
				timestamp: new Date().toISOString()
			};
			
			await db.put(testDoc);
			status = 'Database test completed successfully!';
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			status = 'Database test failed';
		}
	});
</script>

<svelte:head>
	<title>Database Test - Förderplan Tool</title>
</svelte:head>

<main class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-6">Database Connection Test</h1>
	
	<div class="bg-white p-6 rounded-lg shadow-lg">
		<h2 class="text-xl font-semibold mb-4">PouchDB Status</h2>
		
		<div class="mb-4">
			<p class="text-lg">Status: <span class="font-mono">{status}</span></p>
		</div>
		
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<h3 class="text-red-800 font-semibold">Error:</h3>
				<p class="text-red-700 font-mono">{error}</p>
			</div>
		{:else}
			<div class="bg-green-50 border border-green-200 rounded-lg p-4">
				<p class="text-green-800">✅ Database is working correctly</p>
			</div>
		{/if}
		
		<div class="mt-6">
			<a href="/" class="text-blue-600 hover:text-blue-800 underline">← Back to main app</a>
		</div>
	</div>
</main>

<style>
	.container {
		max-width: 1200px;
	}
</style>
