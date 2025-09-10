<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { loadAllAssessments } from '$lib/utils/database';
	
	export let db: any;
	export let currentStudent: string = '';
	
	const dispatch = createEventDispatcher();
	
	let assessmentHistory: any[] = [];
	let loading = false;
	let showHistory = false;
	
	// Load assessment history for current student
	async function loadStudentHistory() {
		if (!db || !currentStudent) return;
		
		loading = true;
		try {
			assessmentHistory = await loadAllAssessments(db, currentStudent);
			showHistory = true;
		} catch (error) {
			console.error('Error loading assessment history:', error);
		} finally {
			loading = false;
		}
	}
	
	// Load a specific assessment
	function loadAssessment(assessment: any) {
		dispatch('loadAssessment', {
			student: assessment.studentName,
			data: assessment.assessmentData,
			timestamp: assessment.timestamp
		});
		showHistory = false;
	}
	
	// Format date for display
	function formatDate(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleString('de-DE', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
	// Calculate days ago
	function daysAgo(timestamp: string): number {
		const now = new Date();
		const then = new Date(timestamp);
		const diffTime = Math.abs(now.getTime() - then.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}
</script>

<div class="assessment-history">
	{#if currentStudent}
		<div class="history-controls">
			<button 
				class="btn btn-secondary"
				on:click={loadStudentHistory}
				disabled={loading}
			>
				{#if loading}
					⏳ Lade Historie...
				{:else}
					📊 Assessment-Historie für {currentStudent}
				{/if}
			</button>
			
			{#if showHistory}
				<button 
					class="btn btn-sm btn-outline"
					on:click={() => showHistory = false}
				>
					❌ Schließen
				</button>
			{/if}
		</div>
		
		{#if showHistory}
			<div class="history-panel">
				<h3>📈 Assessment-Historie für {currentStudent}</h3>
				
				{#if assessmentHistory.length === 0}
					<p class="no-history">Noch keine Assessment-Historie für diesen Schüler vorhanden.</p>
				{:else}
					<div class="history-list">
						{#each assessmentHistory as assessment, index}
							<div class="history-item" class:latest={index === 0}>
								<div class="history-header">
									<div class="timestamp">
										<strong>{formatDate(assessment.timestamp)}</strong>
										<span class="days-ago">
											{#if daysAgo(assessment.timestamp) === 0}
												Heute
											{:else if daysAgo(assessment.timestamp) === 1}
												Gestern
											{:else}
												vor {daysAgo(assessment.timestamp)} Tagen
											{/if}
										</span>
									</div>
									{#if index === 0}
										<span class="latest-badge">📌 Aktuell</span>
									{/if}
								</div>
								
								<div class="assessment-preview">
									<p>
										<strong>Zeitraum:</strong> 
										{assessment.assessmentData?.assessmentPeriod?.timeframe || 'Nicht angegeben'}
									</p>
									<p>
										<strong>Klasse:</strong> 
										{assessment.assessmentData?.student?.class || 'Nicht angegeben'}
									</p>
								</div>
								
								<div class="history-actions">
									<button 
										class="btn btn-sm btn-primary"
										on:click={() => loadAssessment(assessment)}
									>
										🔄 Laden
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<p class="no-student">Bitte wählen Sie zuerst einen Schüler aus, um die Assessment-Historie anzuzeigen.</p>
	{/if}
</div>

<style>
	.assessment-history {
		margin-top: 1rem;
		border-top: 1px solid #e5e7eb;
		padding-top: 1rem;
	}

	.history-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.history-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-top: 1rem;
	}

	.history-panel h3 {
		margin: 0 0 1rem 0;
		color: #1e293b;
	}

	.no-history, .no-student {
		color: #64748b;
		font-style: italic;
		text-align: center;
		padding: 2rem;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.history-item {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
		padding: 1rem;
		transition: all 0.2s;
	}

	.history-item:hover {
		border-color: #3b82f6;
		box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
	}

	.history-item.latest {
		border-color: #10b981;
		background: #f0fdf4;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.timestamp {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.days-ago {
		font-size: 0.875rem;
		color: #64748b;
	}

	.latest-badge {
		background: #10b981;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.assessment-preview {
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: #374151;
	}

	.assessment-preview p {
		margin: 0.25rem 0;
	}

	.history-actions {
		display: flex;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background: #4b5563;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-outline {
		background: transparent;
		color: #6b7280;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover {
		background: #f3f4f6;
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.history-controls {
			flex-direction: column;
			align-items: stretch;
		}
		
		.history-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.history-panel {
			padding: 1rem;
		}
	}
</style>
