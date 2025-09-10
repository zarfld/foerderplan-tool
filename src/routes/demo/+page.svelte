<script lang="ts">
	import { onMount } from 'svelte';
	import { exportToPDF, saveDocument } from '$lib/utils/dataExport';
	import FoerderplanForm from '$lib/components/FoerderplanForm.svelte';
	import foerderplanExample from '$lib/schema/foerderplan.example.json';

	let data: any = foerderplanExample;

	function handleDataChange(event: CustomEvent) {
		data = event.detail.data;
	}

	async function handleSaveJSON() {
		await saveDocument(data, 'foerderplan-demo.json');
	}

	async function handleExportPDF() {
		await exportToPDF(data, 'foerderplan-demo.pdf');
	}

	function resetToExample() {
		data = { ...foerderplanExample };
	}
</script>

<svelte:head>
	<title>Demo - Förderplan Tool</title>
	<meta name="description" content="Demo page showing example data in the Förderplan Tool" />
</svelte:head>

<main class="container">
	<header>
		<h1>📋 Förderplan Tool - Demo</h1>
		<p>Example form with sample data loaded</p>
		
		<div class="toolbar">
			<a href="/" class="btn btn-secondary">
				← Back to Main
			</a>
			<button on:click={resetToExample} class="btn btn-secondary">
				🔄 Reset to Example
			</button>
			<button on:click={handleSaveJSON} class="btn btn-primary">
				💾 Save JSON
			</button>
			<button on:click={handleExportPDF} class="btn btn-primary">
				📄 Export PDF
			</button>
		</div>
	</header>

	<div class="info-box">
		<h3>📝 Demo Information</h3>
		<p>This demo page loads example data from <code>foerderplan.example.json</code> to showcase the form structure and functionality. You can modify the data and export it as JSON or PDF.</p>
	</div>

	<div class="form-container">
		<FoerderplanForm {data} on:change={handleDataChange} />
	</div>
</main>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		color: #2563eb;
		margin-bottom: 0.5rem;
	}

	.toolbar {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 1.5rem 0;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-block;
	}

	.btn-primary {
		background-color: #2563eb;
		color: white;
	}

	.btn-primary:hover {
		background-color: #1d4ed8;
	}

	.btn-secondary {
		background-color: #64748b;
		color: white;
	}

	.btn-secondary:hover {
		background-color: #475569;
	}

	.info-box {
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.info-box h3 {
		margin: 0 0 1rem 0;
		color: #1d4ed8;
	}

	.info-box code {
		background: #dbeafe;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.form-container {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 2rem;
	}

	:global(.control-label) {
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	:global(.control input, .control textarea, .control select) {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
	}

	:global(.control input:focus, .control textarea:focus, .control select:focus) {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}
		
		.toolbar {
			flex-direction: column;
			align-items: center;
		}
		
		.btn {
			width: 100%;
			max-width: 300px;
		}
	}
</style>
