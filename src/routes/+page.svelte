<script lang="ts">
	import { onMount, beforeUpdate } from 'svelte';
	import { browser } from '$app/environment';
	import { saveDocument, exportToPDF } from '$lib/utils/dataExport';
	import { initDB, saveData, loadData, saveAssessment } from '$lib/utils/database';
	import FoerderplanForm from '$lib/components/FoerderplanForm.svelte';
	import StudentManager from '$lib/components/StudentManager.svelte';
	import AssessmentAnalysis from '$lib/components/AssessmentAnalysis.svelte';

	let data: any = {};
	let db: any;
	let currentStudent = '';
	let showAnalysis = false;
	let saveStatus = '';

	onMount(async () => {
		if (!browser) return;
		
		try {
			db = await initDB();
			// Try to load existing data
			const existingData = await loadData(db, 'current-foerderplan');
			if (existingData) {
				data = existingData;
			}
		} catch (error) {
			console.error('Error initializing app:', error);
		}
	});
	
	// Separate onMount for keyboard shortcuts to avoid async issues
	onMount(() => {
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
		
		// Return cleanup function
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

	function handleStudentChanged(event: CustomEvent) {
		const { student, data: studentData } = event.detail;
		currentStudent = student;
		data = studentData;
		
		// Also save to generic current slot
		if (db) {
			saveData(db, 'current-foerderplan', data);
		}
	}

	function handleAssessmentSaved(event: CustomEvent) {
		const { student } = event.detail;
		saveStatus = `Assessment für ${student} gespeichert ✓`;
		setTimeout(() => saveStatus = '', 3000);
	}

	async function handleSaveJSON() {
		if (currentStudent && Object.keys(data).length > 0) {
			// Save to database first
			try {
				await saveAssessment(db, currentStudent, data);
				await saveDocument(data, `foerderplan-${currentStudent}-${new Date().toISOString().split('T')[0]}.json`);
				saveStatus = `JSON für ${currentStudent} exportiert ✓`;
			} catch (error) {
				saveStatus = 'Fehler beim Speichern ✗';
			}
		} else {
			await saveDocument(data, 'foerderplan.json');
			saveStatus = 'JSON exportiert ✓';
		}
		setTimeout(() => saveStatus = '', 3000);
	}

	async function handleExportPDF() {
		if (currentStudent && Object.keys(data).length > 0) {
			// Save to database first
			try {
				await saveAssessment(db, currentStudent, data);
				await exportToPDF(data, `foerderplan-${currentStudent}-${new Date().toISOString().split('T')[0]}.pdf`);
				saveStatus = `PDF für ${currentStudent} exportiert ✓`;
			} catch (error) {
				saveStatus = 'Fehler beim PDF Export ✗';
			}
		} else {
			await exportToPDF(data, 'foerderplan.pdf');
			saveStatus = 'PDF exportiert ✓';
		}
		setTimeout(() => saveStatus = '', 3000);
	}

	function handleNewDocument() {
		data = {};
		if (db) {
			saveData(db, 'current-foerderplan', data);
		}
		saveStatus = 'Neues Dokument erstellt ✓';
		setTimeout(() => saveStatus = '', 3000);
	}

	function toggleAnalysis() {
		showAnalysis = !showAnalysis;
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
		
		{#if saveStatus}
			<div class="save-status" class:success={saveStatus.includes('✓')} class:error={saveStatus.includes('✗')}>
				{saveStatus}
			</div>
		{/if}
		
		<div class="toolbar">
			<button on:click={handleNewDocument} class="btn btn-secondary" title="Ctrl+N">
				🆕 New Document
			</button>
			<button on:click={handleSaveJSON} class="btn btn-primary" title="Ctrl+S">
				💾 Save JSON
			</button>
			<button on:click={handleExportPDF} class="btn btn-primary" title="Ctrl+P">
				📄 Export PDF
			</button>
			<button on:click={toggleAnalysis} class="btn btn-info">
				{showAnalysis ? '📝 Zurück zum Formular' : '📊 Analyse & Vergleich'}
			</button>
			<a href="/demo" class="btn btn-info">
				🎭 View Demo
			</a>
		</div>
	</header>

	{#if !showAnalysis}
		<!-- Student Management -->
		<StudentManager 
			{db} 
			bind:currentStudent 
			bind:currentData={data}
			on:studentChanged={handleStudentChanged}
			on:assessmentSaved={handleAssessmentSaved}
		/>

		<!-- Assessment Form -->
		<div class="form-container">
			{#if currentStudent}
				<div class="current-student-indicator">
					<h3>Assessment für: <strong>{currentStudent}</strong></h3>
				</div>
			{/if}
			<FoerderplanForm {data} on:change={handleDataChange} />
		</div>
	{:else}
		<!-- Assessment Analysis -->
		<AssessmentAnalysis {db} />
	{/if}
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

	.btn-info {
		background-color: #0891b2;
		color: white;
	}

	.btn-info:hover {
		background-color: #0e7490;
	}

	.save-status {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		margin: 0.5rem 0;
		text-align: center;
		font-weight: 500;
		transition: all 0.3s;
	}

	.save-status.success {
		background-color: #d1fae5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}

	.save-status.error {
		background-color: #fee2e2;
		color: #991b1b;
		border: 1px solid #fca5a5;
	}

	.current-student-indicator {
		background: #eff6ff;
		border: 1px solid #93c5fd;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.current-student-indicator h3 {
		margin: 0;
		color: #1d4ed8;
	}

	.form-container {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-top: 1rem;
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
