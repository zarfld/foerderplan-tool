<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { exportToPDF, saveDocument } from '$lib/utils/dataExport';
	import { initDB, saveData, loadData } from '$lib/utils/database';
	import FoerderplanForm from '$lib/components/FoerderplanForm.svelte';
	import StudentManager from '$lib/components/StudentManager.svelte';
	import foerderplanExample from '$lib/schema/foerderplan.example.json';

	let data: any = foerderplanExample;
	let db: any;
	let currentStudent = '';
	let saveStatus = '';

	onMount(async () => {
		if (!browser) return;
		
		try {
			db = await initDB();
			// Try to load existing data
			const existingData = await loadData(db, 'demo-foerderplan');
			if (existingData) {
				data = existingData;
			}
		} catch (error) {
			console.error('Error initializing demo:', error);
		}
	});

	function handleDataChange(event: CustomEvent) {
		data = event.detail.data;
		// Auto-save to local database
		if (db) {
			saveData(db, 'demo-foerderplan', data);
		}
	}

	function handleStudentChanged(event: CustomEvent) {
		const { student, data: studentData } = event.detail;
		currentStudent = student;
		data = studentData;
		
		// Also save to generic demo slot
		if (db) {
			saveData(db, 'demo-foerderplan', data);
		}
	}

	function handleAssessmentSaved(event: CustomEvent) {
		const { student } = event.detail;
		saveStatus = `Assessment für ${student} gespeichert ✓`;
		setTimeout(() => saveStatus = '', 3000);
	}

	async function handleSaveJSON() {
		if (currentStudent && Object.keys(data).length > 0) {
			await saveDocument(data, `foerderplan-demo-${currentStudent}-${new Date().toISOString().split('T')[0]}.json`);
			saveStatus = `JSON für ${currentStudent} exportiert ✓`;
		} else {
			await saveDocument(data, 'foerderplan-demo.json');
			saveStatus = 'JSON exportiert ✓';
		}
		setTimeout(() => saveStatus = '', 3000);
	}

	async function handleExportPDF() {
		if (currentStudent && Object.keys(data).length > 0) {
			await exportToPDF(data, `foerderplan-demo-${currentStudent}-${new Date().toISOString().split('T')[0]}.pdf`);
			saveStatus = `PDF für ${currentStudent} exportiert ✓`;
		} else {
			await exportToPDF(data, 'foerderplan-demo.pdf');
			saveStatus = 'PDF exportiert ✓';
		}
		setTimeout(() => saveStatus = '', 3000);
	}

	function resetToExample() {
		data = { ...foerderplanExample };
		if (db) {
			saveData(db, 'demo-foerderplan', data);
		}
		saveStatus = 'Zurück zu Beispieldaten ✓';
		setTimeout(() => saveStatus = '', 3000);
	}
</script>

<svelte:head>
	<title>Demo - Förderplan Tool</title>
	<meta name="description" content="Demo page showing example data in the Förderplan Tool" />
</svelte:head>

<main class="container">
	<header>
		<h1>📋 Förderplan Tool - Demo</h1>
		<p>Example form with sample data and student management</p>
		
		{#if saveStatus}
			<div class="save-status" class:success={saveStatus.includes('✓')} class:error={saveStatus.includes('✗')}>
				{saveStatus}
			</div>
		{/if}
		
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

	<!-- Student Management -->
	{#if db}
		<StudentManager 
			{db} 
			bind:currentStudent 
			bind:currentData={data}
			on:studentChanged={handleStudentChanged}
			on:assessmentSaved={handleAssessmentSaved}
		/>
	{/if}

	<div class="info-box">
		<h3>📝 Demo Information</h3>
		<p>This demo page showcases both the form structure and the student management functionality. You can add students, switch between them, and see how assessments are automatically saved and loaded.</p>
	</div>

	<div class="form-container">
		{#if currentStudent}
			<div class="current-student-indicator">
				<h3>Demo Assessment für: <strong>{currentStudent}</strong></h3>
			</div>
		{:else}
			<div class="demo-info">
				<h3>📝 Demo-Modus</h3>
				<p>Wählen Sie einen Schüler aus oder erstellen Sie einen neuen, um die Schülerverwaltung zu testen.</p>
			</div>
		{/if}
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

	.demo-info {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.demo-info h3 {
		margin: 0 0 0.5rem 0;
		color: #166534;
	}

	.demo-info p {
		margin: 0;
		color: #166534;
		opacity: 0.8;
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

	.info-box p {
		margin: 0;
		color: #374151;
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
