<!-- @ts-nocheck -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { saveAssessment } from '$lib/utils/database';
	import AssessmentAnalysis from '$lib/components/AssessmentAnalysis.svelte';

	let db: any = null;
	let isCreatingData = false;
	let isDataCreated = false;

	onMount(() => {
		// Mock database object for localStorage
		db = {
			put: async (doc: any) => {
				localStorage.setItem(`assessment-${doc._id}`, JSON.stringify(doc));
				return { ok: true, id: doc._id, rev: '1-' + Date.now() };
			},
			get: async (id: string) => {
				const data = localStorage.getItem(`assessment-${id}`);
				if (!data) throw new Error('Not found');
				return JSON.parse(data);
			},
			allDocs: async (options: any) => {
				const keys = Object.keys(localStorage).filter((key) => key.startsWith('assessment-'));
				const rows = keys.map((key) => {
					const data = JSON.parse(localStorage.getItem(key) || '{}');
					return { id: data._id, doc: data };
				});
				return { rows };
			}
		};
	});

	function generateTestData() {
		const students = ['Max Mustermann', 'Anna Schmidt', 'Tom Weber'];
		const assessments: any[] = [];

		// Generate assessments over the last 6 months
		const now = new Date();
		const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

		students.forEach((studentName) => {
			// Create 5 assessments per student over 6 months
			for (let i = 0; i < 5; i++) {
				const daysFromStart = Math.floor((i / 4) * 180); // Spread over 180 days
				const timestamp = new Date(sixMonthsAgo.getTime() + daysFromStart * 24 * 60 * 60 * 1000);

				// Simulate progression - scores generally improve over time
				const baseProgress = (i / 4) * 0.3; // 30% improvement over time
				const randomVariation = (Math.random() - 0.5) * 0.2; // ±10% random variation
				const progressFactor = Math.max(0, Math.min(1, 0.5 + baseProgress + randomVariation));

				const assessment = {
					_id: `${studentName.replace(' ', '_').toLowerCase()}_${timestamp.toISOString()}`,
					studentName,
					timestamp: timestamp.toISOString(),
					assessmentData: {
						spracheSprechen: {
							assessments: generateSubjectData('Sprache', progressFactor)
						},
						lesen: {
							assessments: generateSubjectData('Lesen', progressFactor)
						},
						schreiben: {
							assessments: generateSubjectData('Schreiben', progressFactor)
						},
						mathematik: {
							assessments: generateSubjectData('Mathematik', progressFactor)
						}
					}
				};

				assessments.push(assessment);
			}
		});

		return assessments;
	}

	function generateSubjectData(subject: string, progressFactor: number) {
		const tasks = [
			'Grundlegende Fähigkeiten',
			'Mittlere Fähigkeiten',
			'Fortgeschrittene Fähigkeiten',
			'Expertenfähigkeiten'
		];

		return tasks.map((task, index) => {
			// Higher tasks are more difficult - lower base probability
			const baseProbability = Math.max(0.1, 0.8 - index * 0.15);
			const currentProbability = Math.min(0.95, baseProbability + progressFactor * 0.4);

			const rand = Math.random();
			let status = '';

			if (rand < currentProbability * 0.7) {
				status = 'ja';
			} else if (rand < currentProbability) {
				status = 'teilweise';
			} else {
				status = 'nein';
			}

			return {
				task: `${subject} - ${task}`,
				status
			};
		});
	}

	async function createTestData() {
		if (!db) return;

		isCreatingData = true;

		try {
			const assessments = generateTestData();

			for (const assessment of assessments) {
				await saveAssessment(db, assessment.studentName, assessment.assessmentData);
			}

			isDataCreated = true;
			console.log('Test data created successfully!');
		} catch (error) {
			console.error('Error creating test data:', error);
		} finally {
			isCreatingData = false;
		}
	}

	function clearAllData() {
		const keys = Object.keys(localStorage).filter((key) => key.startsWith('assessment-'));
		keys.forEach((key) => localStorage.removeItem(key));
		isDataCreated = false;
		console.log('All test data cleared');
	}
</script>

<div class="timeline-test">
	<h1>Timeline-Visualisierung Test</h1>

	<div class="test-controls">
		<p>
			Diese Seite erstellt Testdaten über einen Zeitraum von 6 Monaten für mehrere Schüler, um die
			Timeline-Visualisierung zu testen.
		</p>

		<div class="controls">
			<button
				class="btn btn-primary"
				on:click={createTestData}
				disabled={isCreatingData || isDataCreated}
			>
				{isCreatingData ? 'Erstelle Testdaten...' : 'Testdaten erstellen'}
			</button>

			<button class="btn btn-secondary" on:click={clearAllData} disabled={!isDataCreated}>
				Testdaten löschen
			</button>
		</div>

		{#if isDataCreated}
			<div class="success-message">
				✅ Testdaten erfolgreich erstellt! Jetzt können Sie die Timeline-Analyse testen.
			</div>
		{/if}
	</div>

	{#if db}
		<AssessmentAnalysis {db} />
	{/if}
</div>

<style>
	.timeline-test {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.timeline-test h1 {
		color: #1f2937;
		margin-bottom: 2rem;
		text-align: center;
	}

	.test-controls {
		background: #f8fafc;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		border: 1px solid #e2e8f0;
	}

	.test-controls p {
		color: #6b7280;
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.success-message {
		background: #ecfdf5;
		border: 1px solid #10b981;
		color: #047857;
		padding: 1rem;
		border-radius: 6px;
		margin-top: 1rem;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.timeline-test {
			padding: 1rem;
		}

		.controls {
			flex-direction: column;
		}
	}
</style>
