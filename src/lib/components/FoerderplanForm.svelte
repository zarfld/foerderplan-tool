<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let data: any = {};
	
	const dispatch = createEventDispatcher();
	
	// Initialize data structure if empty
	if (!data.student) data.student = {};
	if (!data.assessmentPeriod) data.assessmentPeriod = {};
	if (!data.spracheSprechen) data.spracheSprechen = { assessments: [] };
	if (!data.lesen) data.lesen = { assessments: [] };
	if (!data.schreiben) data.schreiben = { assessments: [] };
	if (!data.mathematik) data.mathematik = { assessments: [] };
	if (!data.foerdermassnahmen) data.foerdermassnahmen = {};

	// Initialize assessments with default tasks if empty
	if (data.spracheSprechen.assessments.length === 0) {
		data.spracheSprechen.assessments = [
			{"task": "Verwendet das Kind einen altersgemäßen Wortschatz?", "status": "", "notes": ""},
			{"task": "Kann es zusammenhängend erzählen und berichten?", "status": "", "notes": ""},
			{"task": "Beschreibt es in ganzen, zusammenhängenden Sätzen?", "status": "", "notes": ""},
			{"task": "Versteht es Anweisungen und Aufträge an die eigene Person?", "status": "", "notes": ""},
			{"task": "Versteht es Anweisungen und Aufträge an die Gruppe?", "status": "", "notes": ""},
			{"task": "Zeigt es auffällige Störungen im Wortschatz?", "status": "", "notes": ""},
			{"task": "Zeigt es auffällige Störungen in der Grammatik?", "status": "", "notes": ""},
			{"task": "Richtige Lautbildung beim Nachsprechen von Silben, Wörtern, Sätzen?", "status": "", "notes": ""},
			{"task": "Redefluss fließend?", "status": "", "notes": ""}
		];
	}

	if (data.lesen.assessments.length === 0) {
		data.lesen.assessments = [
			{"task": "Kann das Kind die bisher eingeführten Buchstaben lautieren?", "status": "", "notes": ""},
			{"task": "Kommen immer wieder Verwechslungen vor?", "status": "", "notes": ""},
			{"task": "Erkennt das Kind häufig gelesene Wörter wieder?", "status": "", "notes": ""},
			{"task": "Das Kind kann Pseudowörter nicht lesen.", "status": "", "notes": ""},
			{"task": "Das Kind buchstabiert fast alle Wörter. Der Sinn des Gelesenen wird zumeist nicht erfasst.", "status": "", "notes": ""},
			{"task": "Das Kind liest stockend, weil es noch zu viele Wörter erlesen muss. Der Sinn des Erlesenen wird einigermaßen erfasst.", "status": "", "notes": ""},
			{"task": "Hat das Kind Interesse am Leseunterricht", "status": "", "notes": ""},
			{"task": "Das Kind kann wohl flüssig lesen, nicht jedoch den Textsinn erfassen.", "status": "", "notes": ""},
			{"task": "Das Kind kann ausreichend flüssig lesen, um den Textsinn zu erfassen.", "status": "", "notes": ""}
		];
	}

	if (data.schreiben.assessments.length === 0) {
		data.schreiben.assessments = [
			{"task": "Kann es die Buchstaben formgerecht abschreiben?", "status": "", "notes": ""},
			{"task": "Kann das Kind genannte Buchstaben schreiben?", "status": "", "notes": ""},
			{"task": "Das Kind schreibt lautgetreu?", "status": "", "notes": ""},
			{"task": "Kann es die Druckschrift in Schreibschrift umsetzen?", "status": "", "notes": ""},
			{"task": "Gelingt das Abschreiben von Wörtern ohne Fehler?", "status": "", "notes": ""},
			{"task": "Gelingt das Abschreiben von Texten ohne Fehler?", "status": "", "notes": ""},
			{"task": "Kann es die wichtigsten Wörter des Grundwortschatzes auswendig schreiben?", "status": "", "notes": ""},
			{"task": "Kann es häufig geübte Wörter richtig schreiben?", "status": "", "notes": ""},
			{"task": "Kann es angesagte Sätze richtig schreiben?", "status": "", "notes": ""},
			{"task": "Findet es Fehler in eigenen Texten?", "status": "", "notes": ""},
			{"task": "Das Kind spricht beim Schreiben mit.", "status": "", "notes": ""},
			{"task": "Formuliert es Texte so, dass ein sinnvoller Ablauf der Geschichte entsteht?", "status": "", "notes": ""},
			{"task": "Hat das Kind Freude am Schreiben", "status": "", "notes": ""}
		];
	}

	if (data.mathematik.assessments.length === 0) {
		data.mathematik.assessments = [
			{"task": "Das Kind kann Mengen erfassen bis …", "status": "", "notes": ""},
			{"task": "Beim Brettspiel (Mensch ärgere Dich nicht etc.) rückt es die gewürfelte Anzahl vor (und rückt die Spielfigur nicht eins für eins weiter)", "status": "", "notes": ""},
			{"task": "Es hat eine Ziffernkenntnis bis …", "status": "", "notes": ""},
			{"task": "Vor und Rückwärtszählen gelingt bis …", "status": "", "notes": ""},
			{"task": "Zuzählen gelingt mit Veranschaulichung im Zahlenraum ............", "status": "", "notes": ""},
			{"task": "Zuzählen gelingt ohne Veranschaulichung im Zahlenraum ...........", "status": "", "notes": ""},
			{"task": "Rechnet das Kind noch immer zählend?", "status": "", "notes": ""},
			{"task": "Gelingen Rechnungen mit Platzhaltern?", "status": "", "notes": ""},
			{"task": "Treten Unsicherheiten im Kopfrechnen auf?", "status": "", "notes": ""},
			{"task": "Kann es schriftlich addieren?", "status": "", "notes": ""},
			{"task": "Kann es schriftlich subtrahieren?", "status": "", "notes": ""},
			{"task": "Kann es schriftlich multiplizieren?", "status": "", "notes": ""},
			{"task": "Kann es schriftlich dividieren?", "status": "", "notes": ""},
			{"task": "Kann es Sachaufgaben berechnen?", "status": "", "notes": ""},
			{"task": "Sonstige Auffälligkeiten in Mathematik:", "status": "", "notes": ""}
		];
	}

	function updateData() {
		dispatch('change', { data });
	}
</script>

<div class="foerderplan-form">
	<h1>📋 Förderplan für den Förderunterricht</h1>

	<!-- Student Information -->
	<section class="form-section">
		<div class="header-info">
			<div class="form-group">
				<label for="zeitraum">Zeitraum:</label>
				<input
					id="zeitraum"
					type="text"
					bind:value={data.assessmentPeriod.timeframe}
					on:input={updateData}
					placeholder="z.B. Schuljahr 2024/2025, 1. Halbjahr"
				/>
			</div>
			<div class="form-group">
				<label for="klasse">Klasse:</label>
				<input
					id="klasse"
					type="text"
					bind:value={data.student.class}
					on:input={updateData}
					placeholder="z.B. 2A"
				/>
			</div>
			<div class="form-group">
				<label for="klassenlehrerin">Klassenlehrerin:</label>
				<input
					id="klassenlehrerin"
					type="text"
					bind:value={data.student.teacher}
					on:input={updateData}
					placeholder="Name der Lehrerin"
				/>
			</div>
			<div class="form-group">
				<label for="schuelerin">SchülerIn:</label>
				<input
					id="schuelerin"
					type="text"
					bind:value={data.student.name}
					on:input={updateData}
					placeholder="Name des Schülers/der Schülerin"
				/>
			</div>
		</div>
	</section>

	<!-- Sprache und Sprechen -->
	<section class="form-section">
		<h2>🗣️ Sprache und Sprechen</h2>
		<div class="table-container">
			<table class="assessment-table">
				<thead>
					<tr>
						<th>Beobachtungsaufgabe/Förderansatz</th>
						<th>ja</th>
						<th>teilw</th>
						<th>nein</th>
						<th>Anmerkung</th>
					</tr>
				</thead>
				<tbody>
					{#each data.spracheSprechen.assessments as assessment, index}
						<tr>
							<td class="task-cell">{assessment.task}</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="ja"
									on:change={updateData}
									name={`sprache-${index}`}
									aria-label={`${assessment.task} - ja`}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="teilweise"
									on:change={updateData}
									name={`sprache-${index}`}
									aria-label={`${assessment.task} - teilweise`}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="nein"
									on:change={updateData}
									name={`sprache-${index}`}
									aria-label={`${assessment.task} - nein`}
								/>
							</td>
							<td class="notes-cell">
								<input
									type="text"
									bind:value={assessment.notes}
									on:input={updateData}
									placeholder="Anmerkung..."
									aria-label={`Anmerkung für: ${assessment.task}`}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Lesen -->
	<section class="form-section">
		<h2>📖 Lesen</h2>
		<div class="table-container">
			<table class="assessment-table">
				<thead>
					<tr>
						<th>Beobachtungsaufgabe/Förderansatz</th>
						<th>ja</th>
						<th>teilw</th>
						<th>nein</th>
						<th>Anmerkung</th>
					</tr>
				</thead>
				<tbody>
					{#each data.lesen.assessments as assessment, index}
						<tr>
							<td class="task-cell">{assessment.task}</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="ja"
									on:change={updateData}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="teilweise"
									on:change={updateData}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="nein"
									on:change={updateData}
								/>
							</td>
							<td class="notes-cell">
								<input
									type="text"
									bind:value={assessment.notes}
									on:input={updateData}
									placeholder="Anmerkung..."
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Schreiben -->
	<section class="form-section">
		<h2>✏️ Schreiben</h2>
		<div class="table-container">
			<table class="assessment-table">
				<thead>
					<tr>
						<th>Beobachtungsaufgabe/Förderansatz</th>
						<th>ja</th>
						<th>teilw</th>
						<th>nein</th>
						<th>Anmerkung</th>
					</tr>
				</thead>
				<tbody>
					{#each data.schreiben.assessments as assessment, index}
						<tr>
							<td class="task-cell">{assessment.task}</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="ja"
									on:change={updateData}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="teilweise"
									on:change={updateData}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="nein"
									on:change={updateData}
								/>
							</td>
							<td class="notes-cell">
								<input
									type="text"
									bind:value={assessment.notes}
									on:input={updateData}
									placeholder="Anmerkung..."
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Mathematik -->
	<section class="form-section">
		<h2>🔢 Mathematik</h2>
		<div class="table-container">
			<table class="assessment-table">
				<thead>
					<tr>
						<th>Beobachtungsaufgabe/Förderansatz</th>
						<th>ja</th>
						<th>teilw</th>
						<th>nein</th>
						<th>Anmerkung</th>
					</tr>
				</thead>
				<tbody>
					{#each data.mathematik.assessments as assessment, index}
						<tr>
							<td class="task-cell">{assessment.task}</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="ja"
									on:change={updateData}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="teilweise"
									on:change={updateData}
								/>
							</td>
							<td class="status-cell">
								<input
									type="radio"
									bind:group={assessment.status}
									value="nein"
									on:change={updateData}
								/>
							</td>
							<td class="notes-cell">
								<input
									type="text"
									bind:value={assessment.notes}
									on:input={updateData}
									placeholder="Anmerkung..."
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Fördermaßnahmen -->
	<section class="form-section">
		<h2>🎯 Fördermaßnahmen</h2>
		
		{#if !data.foerdermassnahmen.horenUnterscheiden}
			{(data.foerdermassnahmen.horenUnterscheiden = [
				{"measure": "Reimwörter", "applied": false, "notes": ""},
				{"measure": "Ähnlich klingende Wörter unterscheiden", "applied": false, "notes": ""},
				{"measure": "Zusammengesetzte Wörter bilden", "applied": false, "notes": ""},
				{"measure": "Einzahl – Mehrzahl bilden", "applied": false, "notes": ""}
			], "")}
		{/if}
		
		<div class="measures-section">
			<h3>👂 Bereich: Hören und Unterscheiden</h3>
			<ul class="measures-list">
				{#each data.foerdermassnahmen.horenUnterscheiden as measure, index}
					<li class="measure-item">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={measure.applied}
								on:change={updateData}
							/>
							{measure.measure}
						</label>
						<input
							type="text"
							bind:value={measure.notes}
							on:input={updateData}
							placeholder="Bemerkungen..."
							class="measure-notes"
						/>
					</li>
				{/each}
			</ul>
		</div>

		{#if !data.foerdermassnahmen.sprechenVerstehen}
			{(data.foerdermassnahmen.sprechenVerstehen = [
				{"measure": "Bilder erkennen und darüber berichten", "applied": false, "notes": ""},
				{"measure": "Berufe raten", "applied": false, "notes": ""},
				{"measure": "Zeichen zuordnen", "applied": false, "notes": ""},
				{"measure": "Geschichte erzählen", "applied": false, "notes": ""},
				{"measure": "Nach Oberbegriffen ordnen", "applied": false, "notes": ""},
				{"measure": "Bildergeschichte erzählen", "applied": false, "notes": ""},
				{"measure": "Präpositionen auf, unter, rechts und links", "applied": false, "notes": ""},
				{"measure": "Zusammengesetzte Wörter bilden", "applied": false, "notes": ""},
				{"measure": "Bilder beschreiben", "applied": false, "notes": ""},
				{"measure": "Gefühle zuordnen", "applied": false, "notes": ""},
				{"measure": "Präposition zwischen", "applied": false, "notes": ""}
			], "")}
		{/if}
		
		<div class="measures-section">
			<h3>💬 Bereich: Sprechen und Verstehen</h3>
			<ul class="measures-list">
				{#each data.foerdermassnahmen.sprechenVerstehen as measure, index}
					<li class="measure-item">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={measure.applied}
								on:change={updateData}
							/>
							{measure.measure}
						</label>
						<input
							type="text"
							bind:value={measure.notes}
							on:input={updateData}
							placeholder="Bemerkungen..."
							class="measure-notes"
						/>
					</li>
				{/each}
			</ul>
		</div>

		{#if !data.foerdermassnahmen.optischeWahrnehmung}
			{(data.foerdermassnahmen.optischeWahrnehmung = [
				{"measure": "Bilder vergleichen", "applied": false, "notes": ""},
				{"measure": "Fehlendes ergänzen", "applied": false, "notes": ""},
				{"measure": "Rechts-links-Vergleich", "applied": false, "notes": ""},
				{"measure": "Formen und Mengen erkennen", "applied": false, "notes": ""}
			], "")}
		{/if}
		
		<div class="measures-section">
			<h3>👁️ Bereich: Optische Wahrnehmung</h3>
			<ul class="measures-list">
				{#each data.foerdermassnahmen.optischeWahrnehmung as measure, index}
					<li class="measure-item">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={measure.applied}
								on:change={updateData}
							/>
							{measure.measure}
						</label>
						<input
							type="text"
							bind:value={measure.notes}
							on:input={updateData}
							placeholder="Bemerkungen..."
							class="measure-notes"
						/>
					</li>
				{/each}
			</ul>
		</div>

		{#if !data.foerdermassnahmen.mathematikFoerderung}
			{(data.foerdermassnahmen.mathematikFoerderung = [
				{"measure": "Mengen legen", "applied": false, "notes": ""},
				{"measure": "Mengen vergleichen (weniger-mehr)", "applied": false, "notes": ""},
				{"measure": "Mengen zählen", "applied": false, "notes": ""},
				{"measure": "Sachaufgaben", "applied": false, "notes": ""}
			], "")}
		{/if}
		
		<div class="measures-section">
			<h3>🔢 Fördermaßnahmen Mathematik</h3>
			<ul class="measures-list">
				{#each data.foerdermassnahmen.mathematikFoerderung as measure, index}
					<li class="measure-item">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={measure.applied}
								on:change={updateData}
							/>
							{measure.measure}
						</label>
						<input
							type="text"
							bind:value={measure.notes}
							on:input={updateData}
							placeholder="Bemerkungen..."
							class="measure-notes"
						/>
					</li>
				{/each}
			</ul>
		</div>
	</section>
</div>

<style>
	.foerderplan-form {
		max-width: 100%;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

	h1 {
		text-align: center;
		color: #1e293b;
		margin-bottom: 2rem;
		font-size: 1.75rem;
	}

	.form-section {
		margin-bottom: 3rem;
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.header-info {
		background: #f8fafc;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-group input {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
	}

	.form-group input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	h2 {
		background: #2563eb;
		color: white;
		margin: 0;
		padding: 1rem 1.5rem;
		font-size: 1.25rem;
		font-weight: 600;
	}

	h3 {
		color: #1e293b;
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.table-container {
		padding: 1.5rem;
		overflow-x: auto;
	}

	.assessment-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 800px;
	}

	.assessment-table th {
		background: #f1f5f9;
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		color: #374151;
		border: 1px solid #d1d5db;
		font-size: 0.875rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.assessment-table td {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		vertical-align: top;
	}

	.assessment-table tr:nth-child(even) {
		background-color: #fafafa;
	}

	.assessment-table tr:hover {
		background-color: #f0f9ff;
	}

	.task-cell {
		width: 50%;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.status-cell {
		width: 8%;
		text-align: center;
		padding: 0.5rem;
	}

	.status-cell input[type="radio"] {
		transform: scale(1.2);
		margin: 0;
	}

	.notes-cell {
		width: 26%;
	}

	.notes-cell input {
		width: 100%;
		border: none;
		background: transparent;
		padding: 0.25rem;
		font-size: 0.875rem;
	}

	.notes-cell input:focus {
		outline: none;
		background: #f9fafb;
		border-radius: 0.25rem;
	}

	.measures-section {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.measures-section:last-child {
		border-bottom: none;
	}

	.measures-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.measure-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.measure-item:last-child {
		border-bottom: none;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.checkbox-label input[type="checkbox"] {
		transform: scale(1.1);
		margin: 0;
	}

	.measure-notes {
		flex: 0 0 200px;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	.measure-notes:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-info {
			grid-template-columns: 1fr;
		}
		
		.table-container {
			padding: 0.75rem;
		}
		
		.assessment-table {
			font-size: 0.75rem;
			min-width: 600px; /* Ensure table stays readable on mobile */
		}
		
		.assessment-table th,
		.assessment-table td {
			padding: 0.4rem;
		}
		
		.task-cell {
			font-size: 0.8rem;
		}
		
		.notes-cell input {
			font-size: 0.8rem;
		}
		
		.measure-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.checkbox-label {
			width: 100%;
		}
		
		.measure-notes {
			flex: none;
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.assessment-table {
			font-size: 0.7rem;
		}
		
		.assessment-table th,
		.assessment-table td {
			padding: 0.3rem;
		}
		
		.task-cell {
			font-size: 0.75rem;
		}
		
		h2 {
			font-size: 1.1rem;
			padding: 0.75rem 1rem;
		}
		
		h3 {
			font-size: 1rem;
		}
	}

	/* Print Styles */
	@media print {
		.foerderplan-form {
			font-size: 12px;
			line-height: 1.2;
		}

		.form-section {
			box-shadow: none;
			border: 1px solid #000;
			margin-bottom: 1rem;
			break-inside: avoid;
		}

		.header-info {
			background: white !important;
			border-bottom: 1px solid #000;
		}

		h2 {
			background: #f0f0f0 !important;
			color: #000 !important;
			font-size: 14px;
		}

		.assessment-table {
			font-size: 10px;
		}

		.assessment-table th,
		.assessment-table td {
			padding: 4px;
			border: 1px solid #000;
		}

		.assessment-table th {
			background: #f0f0f0 !important;
		}

		.notes-cell input {
			border: none;
			background: transparent;
		}

		.measure-item {
			break-inside: avoid;
		}
	}
</style>
