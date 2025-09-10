<!-- @ts-nocheck -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	
	export let progressData: any = null;
	export let title = 'Fortschritt über Zeit';
	
	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	
	onMount(() => {
		if (progressData && chartCanvas) {
			createChart();
		}
	});
	
	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
		}
	});
	
	$: if (progressData && chartCanvas) {
		updateChart();
	}
	
	function createChart() {
		if (chartInstance) {
			chartInstance.destroy();
		}
		
		if (!progressData || !progressData.subjectTimelines) return;
		
		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;
		
		const datasets = createDatasets();
		const labels = createLabels();
		
		chartInstance = new Chart(ctx, {
			type: 'line',
			data: {
				labels,
				datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: title,
						font: {
							size: 16,
							weight: 'bold'
						}
					},
					legend: {
						display: true,
						position: 'top'
					},
					tooltip: {
						mode: 'index',
						intersect: false,
						callbacks: {
							label: function(context: any) {
								return `${context.dataset.label}: ${context.parsed.y}%`;
							}
						}
					}
				},
				scales: {
					x: {
						display: true,
						title: {
							display: true,
							text: 'Datum'
						}
					},
					y: {
						display: true,
						title: {
							display: true,
							text: 'Fortschritt (%)'
						},
						min: 0,
						max: 100,
						ticks: {
							callback: function(value: any) {
								return value + '%';
							}
						}
					}
				},
				interaction: {
					mode: 'nearest',
					axis: 'x',
					intersect: false
				},
				elements: {
					point: {
						radius: 6,
						hoverRadius: 8
					},
					line: {
						tension: 0.3
					}
				}
			}
		});
	}
	
	function updateChart() {
		if (!chartInstance) {
			createChart();
			return;
		}
		
		const datasets = createDatasets();
		const labels = createLabels();
		
		chartInstance.data.labels = labels;
		chartInstance.data.datasets = datasets;
		chartInstance.update();
	}
	
	function createLabels(): string[] {
		if (!progressData || !progressData.timeline) return [];
		
		return progressData.timeline.map((point: any) => point.date);
	}
	
	function createDatasets() {
		if (!progressData || !progressData.subjectTimelines) return [];
		
		const colors: Record<string, string> = {
			spracheSprechen: '#FF6384',
			lesen: '#36A2EB', 
			schreiben: '#FFCE56',
			mathematik: '#4BC0C0'
		};
		
		const subjectNames: Record<string, string> = {
			spracheSprechen: 'Sprache und Sprechen',
			lesen: 'Lesen',
			schreiben: 'Schreiben', 
			mathematik: 'Mathematik'
		};
		
		const datasets: any[] = [];
		
		Object.keys(progressData.subjectTimelines).forEach(subject => {
			const timeline = progressData.subjectTimelines[subject];
			if (!timeline.dataPoints || timeline.dataPoints.length === 0) return;
			
			const color = colors[subject] || '#999999';
			
			datasets.push({
				label: subjectNames[subject] || subject,
				data: timeline.dataPoints.map((point: any) => point.score),
				borderColor: color,
				backgroundColor: color + '20',
				fill: false,
				tension: 0.3,
				pointRadius: 6,
				pointHoverRadius: 8,
				pointBackgroundColor: color,
				pointBorderColor: '#ffffff',
				pointBorderWidth: 2
			});
		});
		
		return datasets;
	}
	
	function getTrendIcon(trend: string): string {
		switch (trend) {
			case 'improving': return '📈';
			case 'declining': return '📉';
			default: return '➡️';
		}
	}
	
	function getTrendColor(trend: string): string {
		switch (trend) {
			case 'improving': return '#10B981';
			case 'declining': return '#EF4444';
			default: return '#6B7280';
		}
	}
</script>

<div class="progress-chart-container">
	{#if progressData}
		<div class="chart-wrapper">
			<canvas bind:this={chartCanvas} width="800" height="400"></canvas>
		</div>
		
		<!-- Trend Summary -->
		<div class="trend-summary">
			<h4>Trend-Zusammenfassung</h4>
			<div class="trend-grid">			{#each Object.entries(progressData.subjectTimelines) as [subject, timelineData]}
				{#if timelineData}
					<div class="trend-item">
						<div class="trend-header">
							<span class="trend-icon">{getTrendIcon(timelineData.trend)}</span>
							<span class="subject-name">{timelineData.name || subject}</span>
						</div>
						<div class="trend-details" style="color: {getTrendColor(timelineData.trend)}">
							{#if timelineData.changeAmount !== undefined}
								{timelineData.changeAmount > 0 ? '+' : ''}{timelineData.changePercentage}%
							{:else}
								Keine Daten
							{/if}
						</div>
					</div>
				{/if}
			{/each}
			</div>
		</div>
		
		<!-- Timeline Stats -->
		<div class="timeline-stats">
			<div class="stat-item">
				<strong>Zeitraum:</strong> 
				{new Date(progressData.timespan.first).toLocaleDateString('de-DE')} - 
				{new Date(progressData.timespan.latest).toLocaleDateString('de-DE')}
			</div>
			<div class="stat-item">
				<strong>Anzahl Assessments:</strong> {progressData.assessmentCount}
			</div>
			<div class="stat-item">
				<strong>Gesamttrend:</strong> 
				<span style="color: {getTrendColor(progressData.overallTrend)}">
					{getTrendIcon(progressData.overallTrend)}
					{#if progressData.overallTrend === 'improving'}
						Verbesserung
					{:else if progressData.overallTrend === 'declining'}
						Verschlechterung
					{:else}
						Stabil
					{/if}
				</span>
			</div>
		</div>
	{:else}
		<div class="no-data">
			<p>Keine Daten für die Visualisierung verfügbar.</p>
		</div>
	{/if}
</div>

<style>
	.progress-chart-container {
		padding: 1rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 1rem;
	}
	
	.chart-wrapper {
		position: relative;
		height: 400px;
		margin-bottom: 1.5rem;
	}
	
	.trend-summary {
		margin-bottom: 1.5rem;
	}
	
	.trend-summary h4 {
		margin-bottom: 1rem;
		color: #374151;
		font-weight: 600;
	}
	
	.trend-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.trend-item {
		padding: 0.75rem;
		background: #F9FAFB;
		border-radius: 6px;
		border: 1px solid #E5E7EB;
	}
	
	.trend-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}
	
	.trend-icon {
		font-size: 1.2rem;
	}
	
	.subject-name {
		font-weight: 500;
		color: #374151;
	}
	
	.trend-details {
		font-weight: 600;
		font-size: 1.1rem;
	}
	
	.timeline-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 1rem;
		background: #F3F4F6;
		border-radius: 6px;
		font-size: 0.9rem;
	}
	
	.stat-item {
		color: #374151;
	}
	
	.stat-item strong {
		color: #111827;
	}
	
	.no-data {
		text-align: center;
		padding: 2rem;
		color: #6B7280;
	}
	
	@media (max-width: 768px) {
		.chart-wrapper {
			height: 300px;
		}
		
		.trend-grid {
			grid-template-columns: 1fr;
		}
		
		.timeline-stats {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
