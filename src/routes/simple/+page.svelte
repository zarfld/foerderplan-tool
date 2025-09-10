<script lang="ts">
	import { onMount } from 'svelte';

	let step = 1;
	let error = '';

	onMount(async () => {
		try {
			step = 2; // Basic mount successful

			// Step 3: Test database import
			const { initDB } = await import('$lib/utils/database');
			step = 3;

			// Step 4: Test database initialization
			const db = await initDB();
			step = 4;

			// Step 5: Test form component import
			const FoerderplanForm = await import('$lib/components/FoerderplanForm.svelte');
			step = 5;

			step = 6; // All tests passed!
		} catch (err: any) {
			error = `Step ${step} failed: ${err?.message || err}`;
		}
	});
</script>

<svelte:head>
	<title>Simple Test - Förderplan Tool</title>
</svelte:head>

<main>
	<h1>📋 Förderplan Tool - Simple Version</h1>

	<div class="status">
		<h3>Initialization Status:</h3>
		<div class="steps">
			<div class="step" class:current={step >= 1} class:success={step > 1}>
				1. Component mounting
			</div>
			<div class="step" class:current={step >= 2} class:success={step > 2}>2. Basic setup</div>
			<div class="step" class:current={step >= 3} class:success={step > 3}>3. Database import</div>
			<div class="step" class:current={step >= 4} class:success={step > 4}>
				4. Database initialization
			</div>
			<div class="step" class:current={step >= 5} class:success={step > 5}>
				5. Form component import
			</div>
			<div class="step" class:current={step >= 6} class:success={step >= 6}>
				6. All systems ready!
			</div>
		</div>
	</div>

	{#if error}
		<div class="error">
			<strong>Error:</strong>
			{error}
		</div>
	{/if}

	{#if step >= 6}
		<div class="success">
			✅ All components loaded successfully! The 500 error is likely a browser cache issue.
			<br /><br />
			Try: <strong>Ctrl+F5</strong> to hard refresh the main page.
		</div>
		<a href="/" class="btn">Go to Main Page</a>
	{/if}

	<div class="links">
		<a href="/test">Test Page</a> |
		<a href="/debug">Debug Page</a> |
		<a href="/demo">Demo Page</a>
	</div>
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
		text-align: center;
	}

	.status {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin: 2rem 0;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.step {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		background: #f3f4f6;
		border-left: 4px solid #d1d5db;
	}

	.step.current {
		background: #fef3c7;
		border-left-color: #f59e0b;
	}

	.step.success {
		background: #d1fae5;
		border-left-color: #10b981;
	}

	.error {
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		margin: 1rem 0;
		color: #dc2626;
	}

	.success {
		padding: 1rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 0.5rem;
		margin: 1rem 0;
		color: #166534;
	}

	.btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #2563eb;
		color: white;
		text-decoration: none;
		border-radius: 0.5rem;
		font-weight: 600;
		margin: 1rem 0;
	}

	.btn:hover {
		background: #1d4ed8;
	}

	.links {
		margin-top: 2rem;
		text-align: center;
	}

	.links a {
		color: #2563eb;
		text-decoration: none;
		margin: 0 0.5rem;
	}

	.links a:hover {
		text-decoration: underline;
	}
</style>
