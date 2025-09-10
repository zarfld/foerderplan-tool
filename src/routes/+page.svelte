<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { saveDocument, exportToPDF } from '$lib/utils/dataExport';
	import { initDB, saveData, loadData, saveAssessment } from '$lib/utils/database';
	import FoerderplanForm from '$lib/components/FoerderplanForm.svelte';
	import StudentManager from '$lib/components/StudentManager.svelte';
	import AssessmentAnalysis from '$lib/components/AssessmentAnalysis.svelte';
	import AssessmentHistory from '$lib/components/AssessmentHistory.svelte';

	let data: any = {};
	let db: any;
	let currentStudent = '';
	let showAnalysis = false;
	let saveStatus = '';
	let hasUnsavedChanges = false;
	let lastSavedData: any = {};

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
		hasUnsavedChanges = true;
		
		// Auto-save to student-specific slot with versioning
		if (db && currentStudent) {
			// Save as student-specific assessment with timestamp
			const timestamp = new Date().toISOString();
			saveAssessment(db, currentStudent, data);
			console.log(`Auto-saved assessment for ${currentStudent} at ${timestamp}`);
			
			// Also save to general current slot for continuity
			saveData(db, 'current-foerderplan', data);
			lastSavedData = { ...data };
			hasUnsavedChanges = false;
		} else if (db) {
			// Fallback for when no student is selected
			saveData(db, 'current-foerderplan', data);
			lastSavedData = { ...data };
			hasUnsavedChanges = false;
		}
	}

	function handleStudentChanged(event: CustomEvent) {
		const { student, data: studentData } = event.detail;
		console.log('Main page handleStudentChanged:', student, studentData);
		currentStudent = student;
		// Force complete data replacement to trigger reactivity
		data = {};  // Clear first
		setTimeout(() => {
			data = { ...studentData }; // Then set new data
			lastSavedData = { ...data };
			hasUnsavedChanges = false;
			console.log('Main page received student change:', student, data);
			
			// Also save to general current slot for continuity
			if (db) {
				saveData(db, 'current-foerderplan', data);
			}
		}, 10);
	}

	function handleAssessmentLoaded(event: CustomEvent) {
		const { student, data: assessmentData, timestamp } = event.detail;
		currentStudent = student;
		data = { ...assessmentData };
		lastSavedData = { ...data };
		hasUnsavedChanges = false;
		console.log(`Loaded assessment from ${timestamp} for ${student}`);
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
			{hasUnsavedChanges}
			on:studentChanged={handleStudentChanged}
			on:assessmentSaved={handleAssessmentSaved}
		/>

		<!-- Assessment History -->
		<AssessmentHistory 
			{db} 
			{currentStudent}
			on:loadAssessment={handleAssessmentLoaded}
		/>

		<!-- Assessment Form -->
		<div class="form-container">
			{#if currentStudent}
				<div class="current-student-indicator">
					<h3>Assessment für: <strong>{currentStudent}</strong></h3>
				</div>
			{/if}
			{#key currentStudent + JSON.stringify(data?.student?.name)}
				<FoerderplanForm {data} on:change={handleDataChange} />
			{/key}
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

	/* Chrome-specific table improvements */
	:global(table) {
		border-collapse: separate !important;
		border-spacing: 0;
		width: 100%;
		margin-bottom: 1rem;
	}

	:global(table th, table td) {
		border: 1px solid #d1d5db;
		padding: 0.75rem;
		text-align: left;
		vertical-align: top;
	}

	:global(table th) {
		background-color: #f9fafb;
		font-weight: 600;
		border-bottom: 2px solid #d1d5db;
	}

	:global(table tr:nth-child(even)) {
		background-color: #f9fafb;
	}

	:global(table tr:hover) {
		background-color: #e5e7eb;
	}

	/* Better dropdown styling */
	:global(select) {
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}

	:global(select:disabled) {
		background-color: #f3f4f6;
		color: #6b7280;
		cursor: not-allowed;
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
