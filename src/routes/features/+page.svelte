<script lang="ts">
	import { onMount } from 'svelte';
	import { initDB, saveStudentList, saveAssessment } from '$lib/utils/database';
	import StudentManager from '$lib/components/StudentManager.svelte';
	import AssessmentAnalysis from '$lib/components/AssessmentAnalysis.svelte';
	import FoerderplanForm from '$lib/components/FoerderplanForm.svelte';

	// Accept props from page load function
	export let data: any;
	export const params: any = undefined; // Accept params prop to prevent warning
	
	// Mark as used to prevent warnings
	void (data && params);

	let db: any;
	let currentStudent = '';
	let currentData: any = {};
	let demoStep = 0;
	let isInitializing = false;

	const demoStudents = [
		'Anna Müller',
		'Ben Schmidt',
		'Clara Wagner',
		'David Fischer'
	];

	const demoAssessments = [
		{
			student: 'Anna Müller',
			data: {
				student: { name: 'Anna Müller', class: '2A', teacher: 'Frau Schmidt' },
				assessmentPeriod: { timeframe: 'Schuljahr 2024/2025, 1. Halbjahr' },
				spracheSprechen: {
					assessments: [
						{ task: 'Verwendet das Kind einen altersgemäßen Wortschatz?', status: 'ja', notes: 'Sehr guter Wortschatz' },
						{ task: 'Kann es zusammenhängend erzählen und berichten?', status: 'teilweise', notes: 'Braucht manchmal Unterstützung' },
						{ task: 'Beschreibt es in ganzen, zusammenhängenden Sätzen?', status: 'ja', notes: '' },
						{ task: 'Versteht es Anweisungen und Aufträge an die eigene Person?', status: 'ja', notes: '' },
						{ task: 'Versteht es Anweisungen und Aufträge an die Gruppe?', status: 'ja', notes: '' },
						{ task: 'Zeigt es auffällige Störungen im Wortschatz?', status: 'nein', notes: '' },
						{ task: 'Zeigt es auffällige Störungen in der Grammatik?', status: 'nein', notes: '' },
						{ task: 'Richtige Lautbildung beim Nachsprechen von Silben, Wörtern, Sätzen?', status: 'ja', notes: '' },
						{ task: 'Redefluss fließend?', status: 'teilweise', notes: 'Manchmal stockend' }
					]
				},
				lesen: {
					assessments: [
						{ task: 'Kann das Kind die bisher eingeführten Buchstaben lautieren?', status: 'ja', notes: 'Alle Buchstaben bekannt' },
						{ task: 'Kommen immer wieder Verwechslungen vor?', status: 'nein', notes: '' },
						{ task: 'Erkennt das Kind häufig gelesene Wörter wieder?', status: 'ja', notes: 'Sehr gut' },
						{ task: 'Das Kind kann Pseudowörter nicht lesen.', status: 'nein', notes: 'Kann auch Fantasiewörter' },
						{ task: 'Das Kind buchstabiert fast alle Wörter. Der Sinn des Gelesenen wird zumeist nicht erfasst.', status: 'nein', notes: '' },
						{ task: 'Das Kind liest stockend, weil es noch zu viele Wörter erlesen muss. Der Sinn des Erlesenen wird einigermaßen erfasst.', status: 'nein', notes: '' },
						{ task: 'Hat das Kind Interesse am Leseunterricht', status: 'ja', notes: 'Sehr motiviert' },
						{ task: 'Das Kind kann wohl flüssig lesen, nicht jedoch den Textsinn erfassen.', status: 'nein', notes: '' },
						{ task: 'Das Kind kann ausreichend flüssig lesen, um den Textsinn zu erfassen.', status: 'ja', notes: 'Altersgerecht' }
					]
				},
				schreiben: {
					assessments: [
						{ task: 'Kann es die Buchstaben formgerecht abschreiben?', status: 'ja', notes: '' },
						{ task: 'Kann das Kind genannte Buchstaben schreiben?', status: 'ja', notes: '' },
						{ task: 'Das Kind schreibt lautgetreu?', status: 'ja', notes: '' },
						{ task: 'Kann es die Druckschrift in Schreibschrift umsetzen?', status: 'teilweise', notes: 'Noch in Übung' },
						{ task: 'Gelingt das Abschreiben von Wörtern ohne Fehler?', status: 'ja', notes: '' },
						{ task: 'Gelingt das Abschreiben von Texten ohne Fehler?', status: 'teilweise', notes: 'Bei längeren Texten schwierig' },
						{ task: 'Kann es die wichtigsten Wörter des Grundwortschatzes auswendig schreiben?', status: 'teilweise', notes: 'Ca. 60%' },
						{ task: 'Kann es häufig geübte Wörter richtig schreiben?', status: 'ja', notes: '' },
						{ task: 'Kann es angesagte Sätze richtig schreiben?', status: 'teilweise', notes: 'Einfache Sätze' },
						{ task: 'Findet es Fehler in eigenen Texten?', status: 'nein', notes: 'Braucht Hilfe' },
						{ task: 'Das Kind spricht beim Schreiben mit.', status: 'ja', notes: 'Hilfreich' },
						{ task: 'Formuliert es Texte so, dass ein sinnvoller Ablauf der Geschichte entsteht?', status: 'teilweise', notes: 'Bei bekannten Themen' },
						{ task: 'Hat das Kind Freude am Schreiben', status: 'ja', notes: 'Sehr motiviert' }
					]
				},
				mathematik: {
					assessments: [
						{ task: 'Das Kind kann Mengen erfassen bis …', status: 'ja', notes: 'Bis 20' },
						{ task: 'Beim Brettspiel (Mensch ärgere Dich nicht etc.) rückt es die gewürfelte Anzahl vor (und rückt die Spielfigur nicht eins für eins weiter)', status: 'ja', notes: '' },
						{ task: 'Es hat eine Ziffernkenntnis bis …', status: 'ja', notes: 'Bis 100' },
						{ task: 'Vor und Rückwärtszählen gelingt bis …', status: 'ja', notes: 'Bis 50' },
						{ task: 'Zuzählen gelingt mit Veranschaulichung im Zahlenraum ............', status: 'ja', notes: 'Bis 20' },
						{ task: 'Zuzählen gelingt ohne Veranschaulichung im Zahlenraum ...........', status: 'teilweise', notes: 'Bis 10' },
						{ task: 'Rechnet das Kind noch immer zählend?', status: 'teilweise', notes: 'Bei größeren Zahlen' },
						{ task: 'Gelingen Rechnungen mit Platzhaltern?', status: 'teilweise', notes: 'Einfache Aufgaben' },
						{ task: 'Treten Unsicherheiten im Kopfrechnen auf?', status: 'teilweise', notes: 'Über 10' },
						{ task: 'Kann es schriftlich addieren?', status: 'nein', notes: 'Noch nicht eingeführt' },
						{ task: 'Kann es schriftlich subtrahieren?', status: 'nein', notes: 'Noch nicht eingeführt' },
						{ task: 'Kann es schriftlich multiplizieren?', status: 'nein', notes: 'Noch nicht eingeführt' },
						{ task: 'Kann es schriftlich dividieren?', status: 'nein', notes: 'Noch nicht eingeführt' },
						{ task: 'Kann es Sachaufgaben berechnen?', status: 'teilweise', notes: 'Einfache Aufgaben' },
						{ task: 'Sonstige Auffälligkeiten in Mathematik:', status: '', notes: 'Sehr interessiert an Zahlen' }
					]
				}
			}
		},
		{
			student: 'Ben Schmidt',
			data: {
				student: { name: 'Ben Schmidt', class: '2A', teacher: 'Frau Schmidt' },
				assessmentPeriod: { timeframe: 'Schuljahr 2024/2025, 1. Halbjahr' },
				spracheSprechen: {
					assessments: [
						{ task: 'Verwendet das Kind einen altersgemäßen Wortschatz?', status: 'teilweise', notes: 'Wortschatz noch begrenzt' },
						{ task: 'Kann es zusammenhängend erzählen und berichten?', status: 'nein', notes: 'Braucht viel Hilfe' },
						{ task: 'Beschreibt es in ganzen, zusammenhängenden Sätzen?', status: 'nein', notes: 'Meist Zwei-Wort-Sätze' },
						{ task: 'Versteht es Anweisungen und Aufträge an die eigene Person?', status: 'teilweise', notes: 'Einfache Anweisungen' },
						{ task: 'Versteht es Anweisungen und Aufträge an die Gruppe?', status: 'nein', notes: 'Schwierigkeiten' },
						{ task: 'Zeigt es auffällige Störungen im Wortschatz?', status: 'ja', notes: 'Deutlich eingeschränkt' },
						{ task: 'Zeigt es auffällige Störungen in der Grammatik?', status: 'ja', notes: 'Satzstellungsprobleme' },
						{ task: 'Richtige Lautbildung beim Nachsprechen von Silben, Wörtern, Sätzen?', status: 'teilweise', notes: 'Manche Laute schwierig' },
						{ task: 'Redefluss fließend?', status: 'nein', notes: 'Sehr stockend' }
					]
				},
				lesen: {
					assessments: [
						{ task: 'Kann das Kind die bisher eingeführten Buchstaben lautieren?', status: 'teilweise', notes: 'Etwa die Hälfte' },
						{ task: 'Kommen immer wieder Verwechslungen vor?', status: 'ja', notes: 'Häufige Verwechslungen' },
						{ task: 'Erkennt das Kind häufig gelesene Wörter wieder?', status: 'nein', notes: 'Muss alle erlesen' },
						{ task: 'Das Kind kann Pseudowörter nicht lesen.', status: 'ja', notes: 'Große Schwierigkeiten' },
						{ task: 'Das Kind buchstabiert fast alle Wörter. Der Sinn des Gelesenen wird zumeist nicht erfasst.', status: 'ja', notes: 'Kein Textverständnis' },
						{ task: 'Das Kind liest stockend, weil es noch zu viele Wörter erlesen muss. Der Sinn des Erlesenen wird einigermaßen erfasst.', status: 'nein', notes: '' },
						{ task: 'Hat das Kind Interesse am Leseunterricht', status: 'teilweise', notes: 'Wechselnd' },
						{ task: 'Das Kind kann wohl flüssig lesen, nicht jedoch den Textsinn erfassen.', status: 'nein', notes: '' },
						{ task: 'Das Kind kann ausreichend flüssig lesen, um den Textsinn zu erfassen.', status: 'nein', notes: 'Große Defizite' }
					]
				},
				mathematik: {
					assessments: [
						{ task: 'Das Kind kann Mengen erfassen bis …', status: 'teilweise', notes: 'Bis 5' },
						{ task: 'Beim Brettspiel (Mensch ärgere Dich nicht etc.) rückt es die gewürfelte Anzahl vor (und rückt die Spielfigur nicht eins für eins weiter)', status: 'nein', notes: 'Zählt einzeln' },
						{ task: 'Es hat eine Ziffernkenntnis bis …', status: 'teilweise', notes: 'Bis 10' },
						{ task: 'Vor und Rückwärtszählen gelingt bis …', status: 'teilweise', notes: 'Bis 10 vorwärts' },
						{ task: 'Zuzählen gelingt mit Veranschaulichung im Zahlenraum ............', status: 'teilweise', notes: 'Bis 5' },
						{ task: 'Zuzählen gelingt ohne Veranschaulichung im Zahlenraum ...........', status: 'nein', notes: 'Braucht Material' },
						{ task: 'Rechnet das Kind noch immer zählend?', status: 'ja', notes: 'Immer' },
						{ task: 'Gelingen Rechnungen mit Platzhaltern?', status: 'nein', notes: 'Zu schwierig' },
						{ task: 'Treten Unsicherheiten im Kopfrechnen auf?', status: 'ja', notes: 'Große Unsicherheiten' },
						{ task: 'Kann es schriftlich addieren?', status: 'nein', notes: '' },
						{ task: 'Kann es schriftlich subtrahieren?', status: 'nein', notes: '' },
						{ task: 'Kann es schriftlich multiplizieren?', status: 'nein', notes: '' },
						{ task: 'Kann es schriftlich dividieren?', status: 'nein', notes: '' },
						{ task: 'Kann es Sachaufgaben berechnen?', status: 'nein', notes: 'Versteht die Aufgaben nicht' },
						{ task: 'Sonstige Auffälligkeiten in Mathematik:', status: '', notes: 'Braucht viel Förderung' }
					]
				}
			}
		}
	];

	onMount(async () => {
		db = await initDB();
	});

	async function initializeDemoData() {
		if (!db) return;
		
		isInitializing = true;
		try {
			// Save demo students
			await saveStudentList(db, demoStudents);
			
			// Save demo assessments with different timestamps
			for (let i = 0; i < demoAssessments.length; i++) {
				const assessment = demoAssessments[i];
				// Create assessments with different dates
				const baseDate = new Date();
				baseDate.setDate(baseDate.getDate() - (30 - i * 10)); // Spread over last month
				
				// Override timestamp for demo
				await saveAssessment(db, assessment.student, assessment.data);
				
				// Wait a bit to ensure different timestamps
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			
			console.log('Demo data initialized successfully');
			demoStep = 1;
		} catch (error) {
			console.error('Error initializing demo data:', error);
		} finally {
			isInitializing = false;
		}
	}

	function handleStudentChanged(event: CustomEvent) {
		const { student, data } = event.detail;
		currentStudent = student;
		currentData = data;
	}

	function nextStep() {
		demoStep = Math.min(demoStep + 1, 3);
	}

	function prevStep() {
		demoStep = Math.max(demoStep - 1, 0);
	}
</script>

<svelte:head>
	<title>Förderplan Tool - Erweiterte Features</title>
	<meta name="description" content="Demonstration der erweiterten Features des Förderplan Tools" />
</svelte:head>

<main class="container">
	<header>
		<h1>🚀 Förderplan Tool - Erweiterte Features</h1>
		<p>Demonstration der neuen Funktionalitäten: Schülerverwaltung, Assessment-Speicherung und Vergleichsanalyse</p>
		
		<nav class="breadcrumb">
			<a href="/">← Zurück zum Hauptmenü</a>
		</nav>
	</header>

	<div class="demo-navigation">
		<div class="steps">
			<button 
				class="step" 
				class:active={demoStep === 0}
				class:completed={demoStep > 0}
				on:click={() => demoStep = 0}
			>
				1. Demo-Daten initialisieren
			</button>
			<button 
				class="step" 
				class:active={demoStep === 1}
				class:completed={demoStep > 1}
				on:click={() => demoStep = 1}
				disabled={demoStep < 1}
			>
				2. Schülerverwaltung
			</button>
			<button 
				class="step" 
				class:active={demoStep === 2}
				class:completed={demoStep > 2}
				on:click={() => demoStep = 2}
				disabled={demoStep < 1}
			>
				3. Assessment bearbeiten
			</button>
			<button 
				class="step" 
				class:active={demoStep === 3}
				on:click={() => demoStep = 3}
				disabled={demoStep < 1}
			>
				4. Analyse & Vergleich
			</button>
		</div>
		
		<div class="step-controls">
			<button class="btn btn-secondary" on:click={prevStep} disabled={demoStep === 0}>
				← Zurück
			</button>
			<button class="btn btn-primary" on:click={nextStep} disabled={demoStep === 3}>
				Weiter →
			</button>
		</div>
	</div>

	<div class="demo-content">
		{#if demoStep === 0}
			<div class="step-content">
				<h2>🗄️ Demo-Daten initialisieren</h2>
				<p>Zuerst erstellen wir Beispieldaten für mehrere Schüler mit verschiedenen Assessment-Ergebnissen.</p>
				
				<div class="demo-info">
					<h3>Was wird erstellt:</h3>
					<ul>
						<li><strong>4 Demo-Schüler:</strong> Anna Müller, Ben Schmidt, Clara Wagner, David Fischer</li>
						<li><strong>Sample Assessments:</strong> Verschiedene Bewertungen für realistische Vergleiche</li>
						<li><strong>Zeitgestaffelte Daten:</strong> Assessments aus verschiedenen Zeiträumen für Fortschrittsanalyse</li>
					</ul>
				</div>

				<div class="action-section">
					<button 
						class="btn btn-primary btn-large"
						on:click={initializeDemoData}
						disabled={isInitializing || demoStep > 0}
					>
						{#if isInitializing}
							⏳ Initialisiere Demo-Daten...
						{:else if demoStep > 0}
							✅ Demo-Daten bereits initialisiert
						{:else}
							🚀 Demo-Daten jetzt erstellen
						{/if}
					</button>
				</div>
			</div>
		{:else if demoStep === 1}
			<div class="step-content">
				<h2>👥 Schülerverwaltung</h2>
				<p>Die Schülerverwaltung ermöglicht es, eine Liste von Schülern zu verwalten und zwischen verschiedenen Schülern zu wechseln.</p>
				
				<div class="feature-highlights">
					<div class="feature">
						<h4>🔄 Automatisches Speichern</h4>
						<p>Beim Wechsel zwischen Schülern wird das aktuelle Assessment automatisch gespeichert.</p>
					</div>
					<div class="feature">
						<h4>📚 Schülerliste</h4>
						<p>Einfache Verwaltung der Schülerliste mit Hinzufügen und Entfernen von Schülern.</p>
					</div>
					<div class="feature">
						<h4>💾 Lokale Speicherung</h4>
						<p>Alle Daten werden lokal im Browser gespeichert und sind offline verfügbar.</p>
					</div>
				</div>

				{#if db}
					<StudentManager 
						{db} 
						bind:currentStudent 
						bind:currentData
						on:studentChanged={handleStudentChanged}
					/>
				{/if}
			</div>
		{:else if demoStep === 2}
			<div class="step-content">
				<h2>📝 Assessment bearbeiten</h2>
				<p>Wählen Sie einen Schüler aus und bearbeiten Sie dessen Assessment. Alle Änderungen werden automatisch gespeichert.</p>

				{#if currentStudent}
					<div class="current-selection">
						<p><strong>Aktuell ausgewählt:</strong> {currentStudent}</p>
					</div>
					
					<div class="form-container">
						<FoerderplanForm bind:data={currentData} on:change={() => {}} />
					</div>
				{:else}
					<div class="no-selection">
						<p>Bitte wählen Sie zuerst einen Schüler in der Schülerverwaltung aus.</p>
					</div>
				{/if}
			</div>
		{:else if demoStep === 3}
			<div class="step-content">
				<h2>📊 Analyse & Vergleich</h2>
				<p>Analysieren Sie die Assessments und vergleichen Sie verschiedene Schüler oder verfolgen Sie den Fortschritt einzelner Schüler.</p>
				
				<div class="analysis-features">
					<div class="feature">
						<h4>🔍 Vergleichsanalyse</h4>
						<p>Vergleichen Sie mehrere Assessments, um gemeinsame Problemzonen und Stärken zu identifizieren.</p>
					</div>
					<div class="feature">
						<h4>📈 Fortschrittsanalyse</h4>
						<p>Verfolgen Sie den Fortschritt einzelner Schüler über verschiedene Assessment-Zeitpunkte.</p>
					</div>
					<div class="feature">
						<h4>📋 Detaillierte Berichte</h4>
						<p>Erhalten Sie strukturierte Analysen mit konkreten Handlungsempfehlungen.</p>
					</div>
				</div>

				{#if db}
					<AssessmentAnalysis {db} />
				{/if}
			</div>
		{/if}
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

	.breadcrumb {
		margin-top: 1rem;
	}

	.breadcrumb a {
		color: #6b7280;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.breadcrumb a:hover {
		color: #2563eb;
	}

	.demo-navigation {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.step {
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
		text-align: center;
	}

	.step:hover:not(:disabled) {
		border-color: #2563eb;
		color: #2563eb;
	}

	.step.active {
		border-color: #2563eb;
		background: #eff6ff;
		color: #2563eb;
	}

	.step.completed {
		border-color: #059669;
		background: #ecfdf5;
		color: #059669;
	}

	.step:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.step-controls {
		display: flex;
		justify-content: space-between;
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

	.btn-secondary {
		background-color: #64748b;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #475569;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-large {
		padding: 1rem 2rem;
		font-size: 1.1rem;
	}

	.demo-content {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 2rem;
	}

	.step-content h2 {
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.demo-info, .feature-highlights, .analysis-features {
		background: #f9fafb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin: 2rem 0;
	}

	.demo-info h3 {
		margin: 0 0 1rem 0;
		color: #374151;
	}

	.demo-info ul {
		margin: 0;
		color: #6b7280;
	}

	.demo-info li {
		margin-bottom: 0.5rem;
	}

	.feature-highlights, .analysis-features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.feature {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		border-left: 4px solid #2563eb;
	}

	.feature h4 {
		margin: 0 0 0.5rem 0;
		color: #1f2937;
	}

	.feature p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.action-section {
		text-align: center;
		margin: 2rem 0;
	}

	.current-selection {
		background: #eff6ff;
		border: 1px solid #93c5fd;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.no-selection {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 0.5rem;
		padding: 2rem;
		text-align: center;
		color: #92400e;
	}

	.form-container {
		margin-top: 1rem;
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		.steps {
			grid-template-columns: 1fr;
		}

		.step-controls {
			flex-direction: column;
			gap: 1rem;
		}

		.feature-highlights, .analysis-features {
			grid-template-columns: 1fr;
		}
	}
</style>
