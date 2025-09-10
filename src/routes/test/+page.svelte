<script lang="ts">
	export let data: any;
	export let params: any = undefined; // Accept params prop to prevent warning

	// Mark as used to prevent warnings
	console.log('Test page params:', params);
</script>

<svelte:head>
	<title>Test - Förderplan Tool</title>
</svelte:head>

<main>
	<h1>🧪 Test Page</h1>
	<p>{data.message}</p>
	<p>If you can see this page, the basic SvelteKit setup is working.</p>
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

	a {
		color: #2563eb;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
