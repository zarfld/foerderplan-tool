<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { saveStudentList, loadStudentList, saveAssessment, loadLatestAssessment } from '$lib/utils/database';
	
	export let db: any;
	export let currentStudent: string = '';
	export let currentData: any = {};
	
	const dispatch = createEventDispatcher();
	
	let students: string[] = [];
	let newStudentName = '';
	let isAddingStudent = false;
	let showStudentList = false;
	
	// Load student list on component mount
	async function loadStudents() {
		if (db) {
			try {
				students = await loadStudentList(db);
			} catch (error) {
				console.error('Error loading students:', error);
			}
		}
	}
	
	// Add new student to the list
	async function addStudent() {
		if (newStudentName.trim() && !students.includes(newStudentName.trim())) {
			students = [...students, newStudentName.trim()];
			try {
				await saveStudentList(db, students);
				newStudentName = '';
				isAddingStudent = false;
			} catch (error) {
				console.error('Error saving student list:', error);
			}
		}
	}
	
	// Remove student from the list
	async function removeStudent(studentName: string) {
		if (confirm(`Möchten Sie ${studentName} wirklich aus der Liste entfernen?`)) {
			students = students.filter(s => s !== studentName);
			try {
				await saveStudentList(db, students);
				if (currentStudent === studentName) {
					currentStudent = '';
					dispatch('studentChanged', { student: '', data: {} });
				}
			} catch (error) {
				console.error('Error saving student list:', error);
			}
		}
	}
	
	// Select a student and load their latest assessment
	async function selectStudent(studentName: string) {
		// Save current student's data before switching
		if (currentStudent && Object.keys(currentData).length > 0) {
			try {
				await saveAssessment(db, currentStudent, currentData);
				console.log('Saved data for previous student:', currentStudent);
			} catch (error) {
				console.error('Error saving previous student data:', error);
			}
		}
		
		// Load new student's latest assessment
		try {
			const latestData = await loadLatestAssessment(db, studentName);
			currentStudent = studentName;
			dispatch('studentChanged', { 
				student: studentName, 
				data: latestData || {} 
			});
		} catch (error) {
			console.error('Error loading student data:', error);
			currentStudent = studentName;
			dispatch('studentChanged', { 
				student: studentName, 
				data: {} 
			});
		}
	}
	
	// Save current assessment manually
	async function saveCurrentAssessment() {
		if (currentStudent && Object.keys(currentData).length > 0) {
			try {
				await saveAssessment(db, currentStudent, currentData);
				dispatch('assessmentSaved', { student: currentStudent });
			} catch (error) {
				console.error('Error saving assessment:', error);
			}
		}
	}
	
	// Initialize when db becomes available
	$: if (db) {
		loadStudents();
	}
</script>

<div class="student-manager">
	<div class="student-selector">
		<label for="student-select">Aktueller Schüler:</label>
		<div class="select-container">
			<select 
				id="student-select" 
				bind:value={currentStudent} 
				on:change={() => selectStudent(currentStudent)}
			>
				<option value="">-- Schüler auswählen --</option>
				{#each students as student}
					<option value={student}>{student}</option>
				{/each}
			</select>
			
			<button 
				class="btn btn-sm btn-secondary" 
				on:click={() => showStudentList = !showStudentList}
				title="Schülerliste verwalten"
			>
				👥
			</button>
			
			{#if currentStudent}
				<button 
					class="btn btn-sm btn-primary" 
					on:click={saveCurrentAssessment}
					title="Assessment speichern"
				>
					💾
				</button>
			{/if}
		</div>
	</div>
	
	{#if showStudentList}
		<div class="student-list-panel">
			<h3>Schülerliste verwalten</h3>
			
			<div class="add-student">
				{#if isAddingStudent}
					<div class="add-form">
						<input
							type="text"
							bind:value={newStudentName}
							placeholder="Name des neuen Schülers"
							on:keydown={(e) => e.key === 'Enter' && addStudent()}
						/>
						<button class="btn btn-sm btn-primary" on:click={addStudent}>
							✓ Hinzufügen
						</button>
						<button class="btn btn-sm btn-secondary" on:click={() => {isAddingStudent = false; newStudentName = '';}}>
							✗ Abbrechen
						</button>
					</div>
				{:else}
					<button class="btn btn-primary" on:click={() => isAddingStudent = true}>
						➕ Neuer Schüler
					</button>
				{/if}
			</div>
			
			<div class="student-list">
				{#each students as student}
					<div class="student-item" class:active={student === currentStudent}>
						<span class="student-name">{student}</span>
						<div class="student-actions">
							<button 
								class="btn btn-sm btn-primary" 
								on:click={() => selectStudent(student)}
								disabled={student === currentStudent}
							>
								Auswählen
							</button>
							<button 
								class="btn btn-sm btn-danger" 
								on:click={() => removeStudent(student)}
							>
								🗑️
							</button>
						</div>
					</div>
				{/each}
				
				{#if students.length === 0}
					<p class="no-students">Keine Schüler in der Liste. Fügen Sie einen neuen Schüler hinzu.</p>
				{/if}
			</div>
			
			<button 
				class="btn btn-secondary close-panel" 
				on:click={() => showStudentList = false}
			>
				Schließen
			</button>
		</div>
	{/if}
</div>

<style>
	.student-manager {
		background: white;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		position: relative;
	}

	.student-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.student-selector label {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
	}

	.select-container {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	select {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background: white;
	}

	select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.8rem;
	}

	.btn-primary {
		background-color: #2563eb;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #1d4ed8;
	}

	.btn-primary:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: #64748b;
		color: white;
	}

	.btn-secondary:hover {
		background-color: #475569;
	}

	.btn-danger {
		background-color: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background-color: #b91c1c;
	}

	.student-list-panel {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		z-index: 100;
		padding: 1rem;
		margin-top: 0.5rem;
	}

	.student-list-panel h3 {
		margin: 0 0 1rem 0;
		color: #1f2937;
		font-size: 1rem;
	}

	.add-student {
		margin-bottom: 1rem;
	}

	.add-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.add-form input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.add-form input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
	}

	.student-list {
		max-height: 200px;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
	}

	.student-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.student-item:last-child {
		border-bottom: none;
	}

	.student-item.active {
		background-color: #eff6ff;
		border-color: #2563eb;
	}

	.student-name {
		font-weight: 500;
		color: #374151;
	}

	.student-actions {
		display: flex;
		gap: 0.5rem;
	}

	.no-students {
		padding: 1rem;
		text-align: center;
		color: #6b7280;
		font-style: italic;
		margin: 0;
	}

	.close-panel {
		width: 100%;
		margin-top: 1rem;
	}

	@media (max-width: 768px) {
		.select-container {
			flex-direction: column;
		}

		.student-list-panel {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 90vw;
			max-width: 400px;
			max-height: 80vh;
			overflow-y: auto;
		}

		.add-form {
			flex-direction: column;
		}

		.student-item {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.student-actions {
			justify-content: center;
		}
	}
</style>
