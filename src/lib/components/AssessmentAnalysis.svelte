<!-- @ts-nocheck -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { loadAllAssessments, compareAssessments, getProgressTracking } from '$lib/utils/database';
	import ProgressChart from './ProgressChart.svelte';
	
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
	
	// Progress tracking specific variables
	let studentAssessments: any[] = [];
	let selectedAssessmentIds: string[] = [];
	let progressMode: 'auto' | 'manual' | 'timeline' = 'auto';
	let startDate = '';
	let endDate = '';
	let filteredAssessments: any[] = [];
	
	// Type helpers
	$: subjectEntries = comparisonResult?.subjectComparison ? Object.entries(comparisonResult.subjectComparison) : [];
	$: measureEntries = comparisonResult?.foerdermassnahmenComparison ? Object.entries(comparisonResult.foerdermassnahmenComparison) : [];
	$: progressEntries = progressResult?.subjectProgress ? Object.entries(progressResult.subjectProgress) : [];
	
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
			if (progressMode === 'auto') {
				// Use existing auto mode (first vs latest)
				progressResult = await getProgressTracking(db, selectedStudent);
			} else if (progressMode === 'manual') {
				// Manual mode: compare two selected assessments
				if (selectedAssessmentIds.length !== 2) {
					alert('Bitte wählen Sie genau zwei Assessments für den Vergleich aus.');
					return;
				}
				
				const assessmentsToCompare = studentAssessments.filter(a => selectedAssessmentIds.includes(a.id));
				if (assessmentsToCompare.length !== 2) {
					alert('Fehler beim Laden der ausgewählten Assessments.');
					return;
				}
				
				// Sort by timestamp (older first)
				assessmentsToCompare.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
				
				progressResult = await compareSpecificAssessments(assessmentsToCompare[0], assessmentsToCompare[1]);
			} else if (progressMode === 'timeline') {
				// Timeline mode: analyze progress over time period
				if (filteredAssessments.length < 2) {
					alert('Es sind mindestens zwei Assessments im gewählten Zeitraum erforderlich.');
					return;
				}
				
				progressResult = await analyzeProgressTimeline(filteredAssessments);
			}
		} catch (error) {
			console.error('Error in progress tracking:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function analyzeProgressTimeline(assessments: any[]): Promise<any> {
		// Sort assessments by timestamp
		const sortedAssessments = [...assessments].sort((a, b) => 
			new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);

		const progress: any = {
			student: selectedStudent,
			mode: 'timeline',
			assessmentCount: sortedAssessments.length,
			timespan: {
				first: sortedAssessments[0].timestamp,
				latest: sortedAssessments[sortedAssessments.length - 1].timestamp
			},
			timeline: [],
			subjectTimelines: {},
			overallTrend: 'stable',
			progressData: []
		};

		const subjects = ['spracheSprechen', 'lesen', 'schreiben', 'mathematik'];		const subjectNames: Record<string, string> = {
			'spracheSprechen': 'Sprache und Sprechen',
			'lesen': 'Lesen',
			'schreiben': 'Schreiben',
			'mathematik': 'Mathematik'
		};

		// Initialize subject timelines
		subjects.forEach(subject => {
			progress.subjectTimelines[subject] = {
				name: subjectNames[subject],
				dataPoints: [],
				trend: 'stable',
				improvements: 0,
				deteriorations: 0
			};
		});

		// Calculate progress for each assessment
		sortedAssessments.forEach((assessment, index) => {
			const timelinePoint: any = {
				timestamp: assessment.timestamp,
				date: new Date(assessment.timestamp).toLocaleDateString('de-DE'),
				assessmentId: assessment.id,
				subjectScores: {}
			};

			subjects.forEach(subject => {
				const subjectData = assessment.assessmentData[subject]?.assessments || [];
				let score = 0;
				let totalTasks = subjectData.length;
				
				if (totalTasks > 0) {
					subjectData.forEach((task: any) => {
						const status = task.status;
						if (status === 'ja') score += 3;
						else if (status === 'teilweise') score += 2;
						else if (status === 'nein') score += 1;
						// empty status = 0 points
					});
					
					// Normalize to percentage (0-100)
					const percentage = Math.round((score / (totalTasks * 3)) * 100);
					timelinePoint.subjectScores[subject] = percentage;
					
					progress.subjectTimelines[subject].dataPoints.push({
						timestamp: assessment.timestamp,
						date: timelinePoint.date,
						score: percentage,
						assessmentId: assessment.id
					});
				}
			});

			progress.timeline.push(timelinePoint);
		});

		// Calculate trends for each subject
		subjects.forEach(subject => {
			const dataPoints = progress.subjectTimelines[subject].dataPoints;
			if (dataPoints.length >= 2) {
				const firstScore = dataPoints[0].score;
				const lastScore = dataPoints[dataPoints.length - 1].score;
				const change = lastScore - firstScore;
				
				if (change > 10) {
					progress.subjectTimelines[subject].trend = 'improving';
				} else if (change < -10) {
					progress.subjectTimelines[subject].trend = 'declining';
				}
				
				progress.subjectTimelines[subject].changeAmount = change;
				progress.subjectTimelines[subject].changePercentage = Math.round(change);
			}
		});

		// Calculate overall trend
		const allChanges = subjects.map(subject => 
			progress.subjectTimelines[subject].changeAmount || 0
		);
		const avgChange = allChanges.reduce((sum, change) => sum + change, 0) / allChanges.length;
		
		if (avgChange > 5) {
			progress.overallTrend = 'improving';
		} else if (avgChange < -5) {
			progress.overallTrend = 'declining';
		}

		console.log('Timeline analysis completed for student:', selectedStudent);
		return progress;
	}
	
	function filterAssessmentsByDateRange() {
		if (!startDate || !endDate || studentAssessments.length === 0) {
			filteredAssessments = [];
			return;
		}
		
		const start = new Date(startDate);
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999); // Include full end date
		
		filteredAssessments = studentAssessments.filter(assessment => {
			const assessmentDate = new Date(assessment.timestamp);
			return assessmentDate >= start && assessmentDate <= end;
		}).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
	}
	
	// Watch for date range changes
	$: if (startDate || endDate) {
		filterAssessmentsByDateRange();
	}
	
	async function loadStudentAssessments(studentName: string) {
		if (!db || !studentName) return;
		
		try {
			studentAssessments = await loadAllAssessments(db, studentName);
		} catch (error) {
			console.error('Error loading student assessments:', error);
			studentAssessments = [];
		}
	}
	
	async function compareSpecificAssessments(oldAssessment: any, newAssessment: any): Promise<any> {
		const progress: any = {
			student: selectedStudent,
			assessmentCount: 2,
			mode: 'manual',
			timespan: {
				first: oldAssessment.timestamp,
				latest: newAssessment.timestamp
			},
			subjectProgress: {},
			overallTrend: 'stable',
			assessmentDetails: {
				old: {
					id: oldAssessment.id,
					timestamp: oldAssessment.timestamp,
					date: new Date(oldAssessment.timestamp).toLocaleDateString('de-DE')
				},
				new: {
					id: newAssessment.id,
					timestamp: newAssessment.timestamp,
					date: new Date(newAssessment.timestamp).toLocaleDateString('de-DE')
				}
			}
		};

		const subjects = ['spracheSprechen', 'lesen', 'schreiben', 'mathematik'];
		let improvementCount = 0;
		let deteriorationCount = 0;

		subjects.forEach(subject => {
			const oldSubjectData = oldAssessment.assessmentData[subject]?.assessments || [];
			const newSubjectData = newAssessment.assessmentData[subject]?.assessments || [];
			
			const improvements: any[] = [];
			const deteriorations: any[] = [];
			
			oldSubjectData.forEach((task: any, index: number) => {
				if (newSubjectData[index]) {
					const oldStatus = task.status;
					const newStatus = newSubjectData[index].status;
					
					// Define status values for comparison
					const statusValue: { [key: string]: number } = { 'nein': 1, 'teilweise': 2, 'ja': 3, '': 0 };
					const oldValue = statusValue[oldStatus as string] || 0;
					const newValue = statusValue[newStatus as string] || 0;
					
					if (newValue > oldValue) {
						improvements.push({
							task: task.task,
							from: oldStatus || 'nicht bewertet',
							to: newStatus
						});
						improvementCount++;
					} else if (newValue < oldValue) {
						deteriorations.push({
							task: task.task,
							from: oldStatus,
							to: newStatus || 'nicht bewertet'
						});
						deteriorationCount++;
					}
				}
			});
			
			progress.subjectProgress[subject] = {
				improvements,
				deteriorations,
				improvementCount: improvements.length,
				deteriorationCount: deteriorations.length
			};
		});

		// Determine overall trend
		if (improvementCount > deteriorationCount * 1.5) {
			progress.overallTrend = 'improving';
		} else if (deteriorationCount > improvementCount * 1.5) {
			progress.overallTrend = 'declining';
		}

		return progress;
	}
	
	function toggleProgressAssessmentSelection(assessmentId: string) {
		if (selectedAssessmentIds.includes(assessmentId)) {
			selectedAssessmentIds = selectedAssessmentIds.filter(id => id !== assessmentId);
		} else if (selectedAssessmentIds.length < 2) {
			selectedAssessmentIds = [...selectedAssessmentIds, assessmentId];
		}
	}
	
	function clearProgressSelection() {
		selectedAssessmentIds = [];
		progressResult = null;
	}
	
	// Watch for student changes to load their assessments
	$: if (selectedStudent && (progressMode === 'manual' || progressMode === 'timeline')) {
		loadStudentAssessments(selectedStudent);
		clearProgressSelection();
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
	
	function selectLatestPerStudent() {
		// Group assessments by student and select the latest one for each
		const latestPerStudent = new Map<string, any>();
		
		allAssessments.forEach(assessment => {
			const studentName = assessment.studentName;
			const existing = latestPerStudent.get(studentName);
			
			if (!existing || new Date(assessment.timestamp) > new Date(existing.timestamp)) {
				latestPerStudent.set(studentName, assessment);
			}
		});
		
		// Select only the latest assessment IDs
		selectedAssessments = Array.from(latestPerStudent.values()).map(a => a.id);
	}
	
	async function runLatestComparison() {
		// Automatically select latest assessment per student and run comparison
		selectLatestPerStudent();
		
		if (selectedAssessments.length < 2) {
			alert('Es sind mindestens zwei verschiedene Schüler erforderlich für den Vergleich.');
			return;
		}
		
		await runComparison();
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
						class="btn btn-accent" 
						on:click={selectLatestPerStudent}
					>
						Neuestes pro Schüler
					</button>
					<button 
						class="btn btn-accent" 
						on:click={runLatestComparison}
					>
						🚀 Smart Vergleich (Neueste Assessments)
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
							<p><strong>Anzahl Schüler:</strong> {comparisonResult.uniqueStudentCount || comparisonResult.students.length}</p>
							<p><strong>Anzahl Assessments:</strong> {comparisonResult.assessmentCount}</p>
							{#if comparisonResult.uniqueStudentCount && comparisonResult.uniqueStudentCount !== comparisonResult.assessmentCount}
								<p class="info-note">🔄 Es wurde automatisch das neueste Assessment pro Schüler ausgewählt</p>
							{/if}
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
												<p>Probleme bei {problem.statistics.neinCount + problem.statistics.teilweiseCount} von {comparisonResult.uniqueStudentCount || comparisonResult.assessmentCount} Schülern</p>
												{#if problem.students}
													<p class="affected-students">Betroffene Schüler: {problem.students.join(', ')}</p>
												{/if}
												{#if problem.notes && problem.notes.length > 0}
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
												<p>Erfolgreich bei {strength.statistics.jaCount} von {comparisonResult.uniqueStudentCount || comparisonResult.assessmentCount} Schülern</p>
												{#if strength.students}
													<p class="strong-students">Erfolgreiche Schüler: {strength.students.join(', ')}</p>
												{/if}
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
				<p>Wählen Sie einen Schüler und die Art der Fortschrittsanalyse:</p>
				
				<div class="student-selector">
					<select bind:value={selectedStudent}>
						<option value="">-- Schüler auswählen --</option>
						{#each students as student}
							<option value={student}>{student}</option>
						{/each}
					</select>
				</div>
				
				{#if selectedStudent}
					<div class="progress-mode-selector">
						<h4>Vergleichsmodus:</h4>
						<div class="mode-options">
							<label class="mode-option">
								<input type="radio" bind:group={progressMode} value="auto" />
								<span>🤖 Automatisch (Erstes vs. Neuestes Assessment)</span>
							</label>
							<label class="mode-option">
								<input type="radio" bind:group={progressMode} value="manual" />
								<span>🎯 Manuell (Zwei spezifische Assessments auswählen)</span>
							</label>
							<label class="mode-option">
								<input type="radio" bind:group={progressMode} value="timeline" />
								<span>📈 Timeline (Fortschritt über Zeitraum mit Visualisierung)</span>
							</label>
						</div>
					</div>
					
					{#if progressMode === 'manual' && studentAssessments.length > 0}
						<div class="assessment-selection">
							<h4>Assessments für Vergleich auswählen (genau 2):</h4>
							<p class="selection-info">Wählen Sie ein älteres und ein neueres Assessment zum Vergleich aus:</p>
							
							<div class="assessment-list-progress">
								{#each studentAssessments as assessment}
									<button 
										class="assessment-item-progress" 
										class:selected={selectedAssessmentIds.includes(assessment.id)}
										class:disabled={!selectedAssessmentIds.includes(assessment.id) && selectedAssessmentIds.length >= 2}
										on:click={() => toggleProgressAssessmentSelection(assessment.id)}
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
											{selectedAssessmentIds.includes(assessment.id) ? 
											  (selectedAssessmentIds.indexOf(assessment.id) === 0 ? '1️⃣' : '2️⃣') : ''}
										</div>
									</button>
								{/each}
							</div>
							
							<div class="selection-controls">
								<button class="btn btn-secondary" on:click={clearProgressSelection}>
									Auswahl löschen
								</button>
								<span class="selection-count">({selectedAssessmentIds.length}/2 ausgewählt)</span>
							</div>
						</div>
					{/if}
					
					{#if progressMode === 'timeline' && studentAssessments.length > 0}
						<div class="timeline-controls">
							<h4>Zeitraum für Timeline-Analyse:</h4>
							<p class="timeline-info">Wählen Sie einen Zeitraum für die Fortschrittsanalyse mit Visualisierung:</p>
							
							<div class="date-range-selector">
								<div class="date-input-group">
									<label for="start-date">Von:</label>
									<input 
										id="start-date"
										type="date" 
										bind:value={startDate}
										max={endDate || new Date().toISOString().split('T')[0]}
									/>
								</div>
								<div class="date-input-group">
									<label for="end-date">Bis:</label>
									<input 
										id="end-date"
										type="date" 
										bind:value={endDate}
										min={startDate}
										max={new Date().toISOString().split('T')[0]}
									/>
								</div>
							</div>
							
							{#if filteredAssessments.length > 0}
								<div class="filtered-assessments-info">
									<p>✅ {filteredAssessments.length} Assessments im gewählten Zeitraum gefunden</p>
									<div class="assessment-dates">
										{#each filteredAssessments as assessment}
											<span class="assessment-date-tag">
												{new Date(assessment.timestamp).toLocaleDateString('de-DE')}
											</span>
										{/each}
									</div>
								</div>
							{:else if startDate && endDate}
								<div class="no-assessments-info">
									<p>⚠️ Keine Assessments im gewählten Zeitraum gefunden</p>
								</div>
							{/if}
						</div>
					{/if}
					
					<div class="action-controls">
						<button 
							class="btn btn-primary" 
							on:click={runProgressTracking}
							disabled={!selectedStudent || 
									 (progressMode === 'manual' && selectedAssessmentIds.length !== 2) ||
									 (progressMode === 'timeline' && filteredAssessments.length < 2)}
						>
							{progressMode === 'auto' ? 'Automatische Analyse' : 
							 progressMode === 'manual' ? 'Ausgewählte Assessments vergleichen' :
							 'Timeline-Analyse starten'}
						</button>
					</div>
				{/if}
			</div>

			{#if progressResult}
				<div class="progress-results">
					<h3>Fortschrittsanalyse für {progressResult.student}</h3>
					
					{#if progressResult.mode === 'manual' && progressResult.assessmentDetails}
						<div class="comparison-details">
							<h4>Verglichene Assessments:</h4>
							<div class="comparison-timeline">
								<div class="timeline-item old">
									<span class="timeline-label">Früheres Assessment:</span>
									<span class="timeline-date">{progressResult.assessmentDetails.old.date}</span>
								</div>
								<div class="timeline-arrow">➜</div>
								<div class="timeline-item new">
									<span class="timeline-label">Späteres Assessment:</span>
									<span class="timeline-date">{progressResult.assessmentDetails.new.date}</span>
								</div>
							</div>
						</div>
					{/if}
					
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

						{#if progressResult.mode === 'timeline'}
							<!-- Timeline Chart Visualization -->
							<ProgressChart 
								progressData={progressResult} 
								title="Fortschritt über Zeit - {progressResult.student}"
							/>
							
							<!-- Timeline-specific subject details -->
							{#if progressResult.subjectTimelines}
								{#each Object.entries(progressResult.subjectTimelines) as [subject, timelineData]}
									{#if timelineData}
										<div class="subject-progress">
											<h4>{timelineData.name || subject}</h4>
											
											<div class="timeline-details">
												<div class="timeline-stat">
													<span class="timeline-trend">
														{timelineData.trend === 'improving' ? '📈' : 
														 timelineData.trend === 'declining' ? '📉' : '📊'}
													</span>
													<span class="timeline-change">
														{timelineData.changeAmount !== undefined ? 
														 (timelineData.changeAmount > 0 ? '+' : '') + timelineData.changePercentage + '%' : 
														 'Keine Änderung'}
													</span>
												</div>
												<div class="timeline-points">
													<strong>Datenpunkte:</strong> {timelineData.dataPoints?.length || 0}
												</div>
											</div>
										</div>
									{/if}
								{/each}
							{/if}
						{:else}
							<!-- Regular progress analysis -->
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

	.error, .info, .info-note {
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
	
	.info-note {
		background: #f0fdf4;
		color: #15803d;
		font-size: 0.875rem;
		padding: 0.5rem;
		margin: 0.5rem 0;
	}
	
	.affected-students, .strong-students {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
		font-style: italic;
	}
	
	.btn-accent {
		background: #8b5cf6;
		color: white;
		border: 1px solid #8b5cf6;
	}
	
	.btn-accent:hover {
		background: #7c3aed;
		border-color: #7c3aed;
	}
	
	.progress-mode-selector {
		margin: 1rem 0;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 0.375rem;
	}
	
	.progress-mode-selector h4 {
		margin: 0 0 0.75rem 0;
		color: #374151;
	}
	
	.mode-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.mode-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.25rem;
		transition: background-color 0.2s;
	}
	
	.mode-option:hover {
		background: #e2e8f0;
	}
	
	.assessment-selection {
		margin: 1rem 0;
		padding: 1rem;
		background: #f1f5f9;
		border-radius: 0.375rem;
	}
	
	.assessment-selection h4 {
		margin: 0 0 0.5rem 0;
		color: #1e293b;
	}
	
	.selection-info {
		color: #64748b;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}
	
	.assessment-list-progress {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
	}
	
	.assessment-item-progress {
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
	
	.assessment-item-progress:hover:not(.disabled) {
		background: #f3f4f6;
	}
	
	.assessment-item-progress.selected {
		background: #dbeafe;
		border-left: 3px solid #3b82f6;
	}
	
	.assessment-item-progress.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.selection-count {
		color: #6b7280;
		font-size: 0.875rem;
		margin-left: 1rem;
	}
	
	.action-controls {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}
	
	.comparison-details {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: white;
		border-radius: 0.375rem;
		border-left: 4px solid #3b82f6;
	}
	
	.comparison-details h4 {
		margin: 0 0 1rem 0;
		color: #1e293b;
	}
	
	.comparison-timeline {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	
	.timeline-item {
		display: flex;
		flex-direction: column;
		padding: 0.75rem;
		border-radius: 0.375rem;
	}
	
	.timeline-item.old {
		background: #fef3c7;
		border: 1px solid #f59e0b;
	}
	
	.timeline-item.new {
		background: #dcfce7;
		border: 1px solid #16a34a;
	}
	
	.timeline-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		opacity: 0.8;
	}
	
	.timeline-date {
		font-weight: 500;
		margin-top: 0.25rem;
	}
	
	.timeline-arrow {
		font-size: 1.5rem;
		color: #6b7280;
	}
	
	.timeline-controls {
		margin: 1.5rem 0;
		padding: 1.5rem;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}
	
	.timeline-controls h4 {
		margin-bottom: 0.5rem;
		color: #374151;
		font-weight: 600;
	}
	
	.timeline-info {
		color: #6b7280;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}
	
	.date-range-selector {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}
	
	.date-input-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 150px;
	}
	
	.date-input-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}
	
	.date-input-group input[type="date"] {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}
	
	.date-input-group input[type="date"]:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}
	
	.filtered-assessments-info {
		background: #ecfdf5;
		border: 1px solid #10b981;
		border-radius: 6px;
		padding: 1rem;
		margin-top: 1rem;
	}
	
	.filtered-assessments-info p {
		margin: 0 0 0.5rem 0;
		color: #047857;
		font-weight: 500;
	}
	
	.assessment-dates {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	
	.assessment-date-tag {
		background: #10b981;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.no-assessments-info {
		background: #fef3cd;
		border: 1px solid #f59e0b;
		border-radius: 6px;
		padding: 1rem;
		margin-top: 1rem;
	}
	
	.no-assessments-info p {
		margin: 0;
		color: #92400e;
		font-weight: 500;
	}

	.timeline-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
	}
	
	.timeline-stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.timeline-trend {
		font-size: 1.2rem;
	}
	
	.timeline-change {
		font-weight: 600;
		font-size: 1.1rem;
	}
	
	.timeline-points {
		color: #6b7280;
		font-size: 0.9rem;
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
