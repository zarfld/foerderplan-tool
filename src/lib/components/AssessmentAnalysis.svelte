<!-- @ts-nocheck -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { loadAllAssessments, compareAssessments, getProgressTracking } from '$lib/utils/database';
	
	export let db: any;
	
	const dispatch = createEventDispatcher();
	
	let allAssessments: any[] = [];
	let selectedAssessments: string[] = [];
	let comparisonResult: any = null;
	let progressResult: any = null;
	let selectedStudent = '';
	let students: string[] = [];
	let isLoading = false;
	let viewMode: 'compare' | 'progress' = 'compare';
	
	// Type helpers
	$: subjectEntries = comparisonResult ? Object.entries(comparisonResult.subjectComparison) : [];
	$: measureEntries = comparisonResult?.foerdermassnahmenComparison ? Object.entries(comparisonResult.foerdermassnahmenComparison) : [];
	$: progressEntries = progressResult ? Object.entries(progressResult.subjectProgress) : [];
	
	// Helper function to safely access properties
	function getProp(obj: any, prop: string): any {
		return obj && obj[prop] ? obj[prop] : null;
	}
	
	function hasProp(obj: any, prop: string): boolean {
		return obj && obj[prop] && Array.isArray(obj[prop]) ? obj[prop].length > 0 : false;
	}
	
	async function loadAssessments() {
		if (!db) return;
		
		isLoading = true;
		try {
			allAssessments = await loadAllAssessments(db);
			students = [...new Set(allAssessments.map(a => a.studentName))];
		} catch (error) {
			console.error('Error loading assessments:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function runComparison() {
		if (selectedAssessments.length < 2) {
			alert('Bitte wählen Sie mindestens zwei Assessments für den Vergleich aus.');
			return;
		}
		
		isLoading = true;
		try {
			const assessmentsToCompare = allAssessments.filter(a => selectedAssessments.includes(a.id));
			comparisonResult = await compareAssessments(assessmentsToCompare);
		} catch (error) {
			console.error('Error comparing assessments:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function runProgressTracking() {
		if (!selectedStudent) {
			alert('Bitte wählen Sie einen Schüler für das Progress Tracking aus.');
			return;
		}
		
		isLoading = true;
		try {
			progressResult = await getProgressTracking(db, selectedStudent);
		} catch (error) {
			console.error('Error in progress tracking:', error);
		} finally {
			isLoading = false;
		}
	}
	
	function toggleAssessmentSelection(assessmentId: string) {
		if (selectedAssessments.includes(assessmentId)) {
			selectedAssessments = selectedAssessments.filter(id => id !== assessmentId);
		} else {
			selectedAssessments = [...selectedAssessments, assessmentId];
		}
	}
	
	function selectAllForStudent(studentName: string) {
		const studentAssessments = allAssessments
			.filter(a => a.studentName === studentName)
			.map(a => a.id);
		selectedAssessments = [...new Set([...selectedAssessments, ...studentAssessments])];
	}
	
	function clearSelection() {
		selectedAssessments = [];
		comparisonResult = null;
		progressResult = null;
	}
	
	// Load assessments when db becomes available
	$: if (db) {
		loadAssessments();
	}
</script>

<div class="assessment-analysis">
	<div class="analysis-header">
		<h2>📊 Assessment Analyse</h2>
		<div class="view-tabs">
			<button 
				class="tab-button" 
				class:active={viewMode === 'compare'}
				on:click={() => {viewMode = 'compare'; comparisonResult = null; progressResult = null;}}
			>
				Vergleichsanalyse
			</button>
			<button 
				class="tab-button" 
				class:active={viewMode === 'progress'}
				on:click={() => {viewMode = 'progress'; comparisonResult = null; progressResult = null;}}
			>
				Fortschrittsanalyse
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="loading">Lade Daten...</div>
	{/if}

	{#if viewMode === 'compare'}
		<div class="comparison-section">
			<div class="controls">
				<h3>Assessment Vergleich</h3>
				<p>Wählen Sie mindestens zwei Assessments aus verschiedenen Schülern oder Zeitpunkten für den Vergleich:</p>
				
				<div class="selection-controls">
					<button class="btn btn-secondary" on:click={clearSelection}>
						Auswahl löschen
					</button>
					<button 
						class="btn btn-primary" 
						on:click={runComparison}
						disabled={selectedAssessments.length < 2}
					>
						Vergleich durchführen ({selectedAssessments.length} ausgewählt)
					</button>
				</div>
			</div>

			<div class="assessment-list">
				{#each students as student}
					<div class="student-group">
						<div class="student-header">
							<h4>{student}</h4>
							<button 
								class="btn btn-sm btn-outline" 
								on:click={() => selectAllForStudent(student)}
							>
								Alle auswählen
							</button>
						</div>
						{#each allAssessments.filter(a => a.studentName === student) as assessment}
							<button 
								class="assessment-item" 
								class:selected={selectedAssessments.includes(assessment.id)}
								on:click={() => toggleAssessmentSelection(assessment.id)}
								type="button"
							>
								<div class="assessment-info">
									<span class="assessment-date">
										{new Date(assessment.timestamp).toLocaleDateString('de-DE')}
									</span>
									<span class="assessment-time">
										{new Date(assessment.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								<div class="selection-indicator">
									{selectedAssessments.includes(assessment.id) ? '✓' : ''}
								</div>
							</button>
						{/each}
					</div>
				{/each}
			</div>

			{#if comparisonResult}
				<div class="comparison-results">
					<h3>Vergleichsergebnisse</h3>
					
					{#if comparisonResult.error}
						<div class="error">
							<p>{comparisonResult.error}</p>
						</div>
					{:else}
						<div class="results-summary">
							<p><strong>Verglichene Schüler:</strong> {comparisonResult.students.join(', ')}</p>
							<p><strong>Anzahl Assessments:</strong> {comparisonResult.assessmentCount}</p>
						</div>

						{#each subjectEntries as [subject, subjectData]}
							<div class="subject-comparison">
								<h4>{subject === 'spracheSprechen' ? 'Sprache und Sprechen' : 
								    subject === 'lesen' ? 'Lesen' : 
								    subject === 'schreiben' ? 'Schreiben' : 
								    'Mathematik'}</h4>
								
								{#if hasProp(subjectData, 'commonProblems')}
									<div class="problem-section">
										<h5>🚨 Gemeinsame Problemzonen</h5>
										{#each getProp(subjectData, 'commonProblems') as problem}
											<div class="problem-item">
												<p><strong>{problem.task}</strong></p>
												<p>Probleme bei {problem.statistics.neinCount + problem.statistics.teilweiseCount} von {comparisonResult.assessmentCount} Schülern</p>
												{#if problem.notes.length > 0}
													<ul class="notes-list">
														{#each problem.notes as note}
															<li>{note}</li>
														{/each}
													</ul>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								{#if hasProp(subjectData, 'strongAreas')}
									<div class="strength-section">
										<h5>💪 Starke Bereiche</h5>
										{#each getProp(subjectData, 'strongAreas') as strength}
											<div class="strength-item">
												<p><strong>{strength.task}</strong></p>
												<p>Erfolgreich bei {strength.statistics.jaCount} von {comparisonResult.assessmentCount} Schülern</p>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}

						{#if comparisonResult.foerdermassnahmenComparison}
							<div class="measures-comparison">
								<h4>Fördermaßnahmen Analyse</h4>
								{#each measureEntries as [area, areaData]}
									<div class="measure-area">
										<h5>{area === 'horenUnterscheiden' ? 'Hören und Unterscheiden' : 
										    area === 'sprechenVerstehen' ? 'Sprechen und Verstehen' : 
										    area === 'optischeWahrnehmung' ? 'Optische Wahrnehmung' : 
										    'Mathematik Förderung'}</h5>
										
										{#if hasProp(areaData, 'commonlyApplied')}
											<div class="common-measures">
												<h6>Häufig angewendete Maßnahmen:</h6>
												{#each getProp(areaData, 'commonlyApplied') as measure}
												<p>• {measure.measure} ({measure.percentage}%)</p>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="progress-section">
			<div class="controls">
				<h3>Fortschrittsanalyse</h3>
				<p>Wählen Sie einen Schüler für die Fortschrittsanalyse:</p>
				
				<div class="student-selector">
					<select bind:value={selectedStudent}>
						<option value="">-- Schüler auswählen --</option>
						{#each students as student}
							<option value={student}>{student}</option>
						{/each}
					</select>
					<button 
						class="btn btn-primary" 
						on:click={runProgressTracking}
						disabled={!selectedStudent}
					>
						Fortschritt analysieren
					</button>
				</div>
			</div>

			{#if progressResult}
				<div class="progress-results">
					<h3>Fortschrittsanalyse für {progressResult.student}</h3>
					
					{#if progressResult.message}
						<div class="info">
							<p>{progressResult.message}</p>
							<p>Aktuelle Anzahl Assessments: {progressResult.assessmentCount}</p>
						</div>
					{:else}
						<div class="progress-summary">
							<div class="summary-card trend-{progressResult.overallTrend}">
								<h4>Gesamttrend: {progressResult.overallTrend === 'improving' ? '📈 Verbesserung' : 
								                  progressResult.overallTrend === 'declining' ? '📉 Verschlechterung' : 
								                  '📊 Stabil'}</h4>
								<p>Anzahl Assessments: {progressResult.assessmentCount}</p>
								<p>Zeitraum: {new Date(progressResult.timespan.first).toLocaleDateString('de-DE')} - 
								   {new Date(progressResult.timespan.latest).toLocaleDateString('de-DE')}</p>
							</div>
						</div>

						{#each progressEntries as [subject, subjectData]}
							<div class="subject-progress">
								<h4>{subject === 'spracheSprechen' ? 'Sprache und Sprechen' : 
								    subject === 'lesen' ? 'Lesen' : 
								    subject === 'schreiben' ? 'Schreiben' : 
								    'Mathematik'}</h4>
								
								<div class="progress-stats">
									<div class="stat-item improvement">
										<span class="stat-number">{getProp(subjectData, 'improvementCount') || 0}</span>
										<span class="stat-label">Verbesserungen</span>
									</div>
									<div class="stat-item deterioration">
										<span class="stat-number">{getProp(subjectData, 'deteriorationCount') || 0}</span>
										<span class="stat-label">Verschlechterungen</span>
									</div>
								</div>

								{#if hasProp(subjectData, 'improvements')}
									<div class="improvements">
										<h5>✅ Verbesserungen:</h5>
										{#each getProp(subjectData, 'improvements') as improvement}
											<p>• {improvement.task}: {improvement.from} → {improvement.to}</p>
										{/each}
									</div>
								{/if}

								{#if hasProp(subjectData, 'deteriorations')}
									<div class="deteriorations">
										<h5>⚠️ Verschlechterungen:</h5>
										{#each getProp(subjectData, 'deteriorations') as deterioration}
											<p>• {deterioration.task}: {deterioration.from} → {deterioration.to}</p>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.assessment-analysis {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-top: 2rem;
	}

	.analysis-header {
		margin-bottom: 2rem;
	}

	.analysis-header h2 {
		margin: 0 0 1rem 0;
		color: #1f2937;
	}

	.view-tabs {
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-weight: 500;
		color: #6b7280;
		transition: all 0.2s;
	}

	.tab-button.active {
		color: #2563eb;
		border-bottom-color: #2563eb;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.controls {
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 0.5rem;
	}

	.controls h3 {
		margin: 0 0 0.5rem 0;
		color: #1f2937;
	}

	.selection-controls, .student-selector {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		align-items: center;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
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

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-outline {
		background: white;
		border: 1px solid #d1d5db;
		color: #374151;
	}

	.btn-outline:hover {
		background: #f9fafb;
	}

	select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		min-width: 200px;
	}

	.assessment-list {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}

	.student-group {
		border-bottom: 1px solid #e5e7eb;
	}

	.student-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.student-header h4 {
		margin: 0;
		color: #1f2937;
	}

	.assessment-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
		width: 100%;
		text-align: left;
		background: white;
		border: none;
		border-bottom: 1px solid #e5e7eb;
	}

	.assessment-item:hover {
		background: #f3f4f6;
	}

	.assessment-item.selected {
		background: #eff6ff;
		border-left: 3px solid #2563eb;
	}

	.assessment-info {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.assessment-date {
		font-weight: 500;
		color: #374151;
	}

	.assessment-time {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.selection-indicator {
		font-weight: bold;
		color: #2563eb;
		font-size: 1.2rem;
	}

	.comparison-results, .progress-results {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 0.5rem;
	}

	.results-summary {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: white;
		border-radius: 0.375rem;
	}

	.subject-comparison, .subject-progress {
		margin-bottom: 2rem;
		padding: 1rem;
		background: white;
		border-radius: 0.375rem;
		border-left: 4px solid #2563eb;
	}

	.problem-section, .strength-section, .measures-comparison {
		margin-top: 1rem;
	}

	.problem-item, .strength-item {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #fef2f2;
		border-radius: 0.375rem;
	}

	.strength-item {
		background: #f0fdf4;
	}

	.notes-list {
		margin: 0.5rem 0 0 1rem;
		color: #6b7280;
	}

	.progress-summary {
		margin-bottom: 1.5rem;
	}

	.summary-card {
		padding: 1.5rem;
		border-radius: 0.5rem;
		text-align: center;
	}

	.trend-improving {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
	}

	.trend-declining {
		background: #fef2f2;
		border: 1px solid #fecaca;
	}

	.trend-stable {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
	}

	.progress-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin: 1rem 0;
	}

	.stat-item {
		text-align: center;
		padding: 1rem;
		border-radius: 0.375rem;
	}

	.stat-item.improvement {
		background: #f0fdf4;
		color: #166534;
	}

	.stat-item.deterioration {
		background: #fef2f2;
		color: #dc2626;
	}

	.stat-number {
		display: block;
		font-size: 2rem;
		font-weight: bold;
	}

	.stat-label {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.improvements, .deteriorations {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 0.375rem;
	}

	.improvements {
		background: #f0fdf4;
	}

	.deteriorations {
		background: #fef2f2;
	}

	.error, .info {
		padding: 1rem;
		border-radius: 0.375rem;
		margin: 1rem 0;
	}

	.error {
		background: #fef2f2;
		color: #dc2626;
	}

	.info {
		background: #eff6ff;
		color: #1d4ed8;
	}

	@media (max-width: 768px) {
		.selection-controls, .student-selector {
			flex-direction: column;
			align-items: stretch;
		}

		.assessment-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.progress-stats {
			grid-template-columns: 1fr;
		}

		.view-tabs {
			flex-direction: column;
		}
	}
</style>
