<script lang="ts">
	import { onMount } from 'svelte';
	import { saveDocument, exportToPDF } from '$lib/utils/dataExport';
	import { initDB, saveData, loadData } from '$lib/utils/database';
	import FoerderplanForm from '$lib/components/FoerderplanForm.svelte';

	let data: any = {};
	let db: any;

	onMount(async () => {
		db = await initDB();
		// Try to load existing data
		const existingData = await loadData(db, 'current-foerderplan');
		if (existingData) {
			data = existingData;
		}

		// Add keyboard shortcuts
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey || event.metaKey) {
				switch (event.key) {
					case 's':
						event.preventDefault();
						handleSaveJSON();
						break;
					case 'p':
						event.preventDefault();
						handleExportPDF();
						break;
					case 'n':
						event.preventDefault();
						handleNewDocument();
						break;
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	function handleDataChange(event: CustomEvent) {
		data = event.detail.data;
		// Auto-save to local database
		if (db) {
			saveData(db, 'current-foerderplan', data);
		}
	}

	async function handleSaveJSON() {
		await saveDocument(data, 'foerderplan.json');
	}

	async function handleExportPDF() {
		await exportToPDF(data, 'foerderplan.pdf');
	}

	function handleNewDocument() {
		data = {};
		if (db) {
			saveData(db, 'current-foerderplan', data);
		}
	}
</script>

<svelte:head>
	<title>Förderplan Tool</title>
	<meta name="description" content="Digital tool for teachers to record and compare student progress" />
</svelte:head>

<main class="container">
	<header>
		<h1>📋 Förderplan Tool</h1>
		<p>Digital tool for recording and comparing student progress</p>
		
		<div class="toolbar">
			<button on:click={handleNewDocument} class="btn btn-secondary">
				🆕 New Document
			</button>
			<button on:click={handleSaveJSON} class="btn btn-primary">
				💾 Save JSON
			</button>
			<button on:click={handleExportPDF} class="btn btn-primary">
				📄 Export PDF
			</button>
		</div>
	</header>

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

	.form-container {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-top: 2rem;
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
