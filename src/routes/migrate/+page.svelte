<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initDB } from '$lib/utils/database.ts';

	let isLoading = false;
	let syncResults = [];
	let db = null;
	let localDataStats = {
		totalDocs: 0,
		assessments: 0,
		students: 0,
		otherDocs: 0
	};

	onMount(async () => {
		if (browser) {
			await loadLocalDataStats();
			db = await initDB();
		}
	});

	function loadLocalDataStats() {
		localDataStats = {
			totalDocs: 0,
			assessments: 0,
			students: 0,
			otherDocs: 0
		};

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('foerderplan_')) {
				localDataStats.totalDocs++;
				
				const docId = key.replace('foerderplan_', '');
				if (docId.startsWith('assessment-')) {
					localDataStats.assessments++;
				} else if (docId === 'student-list' || docId === 'current-foerderplan') {
					localDataStats.students++;
				} else {
					localDataStats.otherDocs++;
				}
			}
		}
	}

	async function migrateToCloud() {
		if (!browser || !db) return;

		isLoading = true;
		syncResults = [];

		try {
			// Step 1: Get all local data
			addResult('🔍 Sammle lokale Daten...', 'info');
			
			const localDocs = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith('foerderplan_')) {
					try {
						const value = localStorage.getItem(key);
						const parsed = JSON.parse(value);
						const docId = key.replace('foerderplan_', '');
						localDocs.push({ ...parsed, _id: docId });
					} catch (e) {
						addResult(`⚠️ Ungültiges JSON für ${key}`, 'warning');
					}
				}
			}

			addResult(`📊 ${localDocs.length} Dokumente gefunden`, 'info');

			// Step 2: Check CouchDB connection
			addResult('🌐 Prüfe CouchDB Verbindung...', 'info');
			
			const mode = db.getMode();
			const syncStatus = db.getSyncStatus();
			
			addResult(`📡 Modus: ${mode}, Status: ${syncStatus}`, 'info');

			if (mode === 'localStorage') {
				addResult('⚠️ CouchDB nicht verfügbar, Migration nicht möglich', 'error');
				return;
			}

			// Step 3: Migrate each document
			addResult('🔄 Starte Migration...', 'info');
			
			let successCount = 0;
			let errorCount = 0;

			for (const doc of localDocs) {
				try {
					await db.put(doc);
					successCount++;
					addResult(`✅ ${doc._id} migriert`, 'success');
				} catch (error) {
					errorCount++;
					addResult(`❌ Fehler bei ${doc._id}: ${error.message}`, 'error');
				}
			}

			// Step 4: Manual sync to ensure everything is pushed
			addResult('🔄 Führe finale Synchronisation durch...', 'info');
			
			const syncSuccess = await db.manualSync();
			
			if (syncSuccess) {
				addResult('✅ Migration erfolgreich abgeschlossen!', 'success');
				addResult(`📊 Erfolgreich: ${successCount}, Fehler: ${errorCount}`, 'info');
			} else {
				addResult('⚠️ Migration teilweise erfolgreich, finale Sync fehlgeschlagen', 'warning');
			}

		} catch (error) {
			addResult(`❌ Migration Fehler: ${error.message}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	async function verifyCloudData() {
		if (!browser || !db) return;

		isLoading = true;
		syncResults = [];

		try {
			addResult('🔍 Prüfe Cloud-Daten...', 'info');

			const cloudDocs = await db.allDocs({ include_docs: true });
			const foerderplanDocs = cloudDocs.rows.filter(row => 
				row.id.startsWith('assessment-') || 
				row.id === 'current-foerderplan' || 
				row.id === 'student-list'
			);

			addResult(`📊 ${foerderplanDocs.length} Förderplan-Dokumente in der Cloud`, 'info');

			// Show breakdown
			const assessments = foerderplanDocs.filter(doc => doc.id.startsWith('assessment-'));
			const studentData = foerderplanDocs.filter(doc => 
				doc.id === 'current-foerderplan' || doc.id === 'student-list'
			);

			addResult(`📝 ${assessments.length} Bewertungen`, 'info');
			addResult(`👥 ${studentData.length} Schüler-Dokumente`, 'info');

			// List documents
			foerderplanDocs.forEach(doc => {
				addResult(`📄 ${doc.id}`, 'success');
			});

		} catch (error) {
			addResult(`❌ Fehler beim Prüfen der Cloud-Daten: ${error.message}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	function addResult(message, type) {
		syncResults = [...syncResults, { 
			message, 
			type, 
			timestamp: new Date().toLocaleTimeString() 
		}];
	}

	function clearResults() {
		syncResults = [];
	}
</script>

<div class="migration-tool">
	<h1>🔄 Daten-Migration zu CouchDB</h1>
	
	<div class="stats-card">
		<h2>📊 Lokale Daten</h2>
		<div class="stats-grid">
			<div class="stat">
				<span class="stat-value">{localDataStats.totalDocs}</span>
				<span class="stat-label">Gesamt Dokumente</span>
			</div>
			<div class="stat">
				<span class="stat-value">{localDataStats.assessments}</span>
				<span class="stat-label">Bewertungen</span>
			</div>
			<div class="stat">
				<span class="stat-value">{localDataStats.students}</span>
				<span class="stat-label">Schüler-Daten</span>
			</div>
		</div>
	</div>

	<div class="actions">
		<button 
			on:click={migrateToCloud} 
			disabled={isLoading || localDataStats.totalDocs === 0}
			class="btn-primary"
		>
			{#if isLoading}
				🔄 Migriere...
			{:else}
				🚀 Daten zu CouchDB migrieren
			{/if}
		</button>

		<button 
			on:click={verifyCloudData} 
			disabled={isLoading}
			class="btn-secondary"
		>
			🔍 Cloud-Daten prüfen
		</button>

		<button 
			on:click={clearResults} 
			disabled={isLoading}
			class="btn-outline"
		>
			🧹 Ergebnisse löschen
		</button>
	</div>

	{#if syncResults.length > 0}
		<div class="results">
			<h3>📋 Migration Ergebnisse</h3>
			<div class="results-list">
				{#each syncResults as result}
					<div class="result-item {result.type}">
						<span class="timestamp">{result.timestamp}</span>
						<span class="message">{result.message}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.migration-tool {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}

	h1 {
		color: #333;
		margin-bottom: 30px;
		text-align: center;
	}

	.stats-card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 30px;
	}

	.stats-card h2 {
		margin: 0 0 20px 0;
		color: #333;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 20px;
	}

	.stat {
		text-align: center;
		padding: 16px;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.stat-value {
		display: block;
		font-size: 2rem;
		font-weight: bold;
		color: #007acc;
		margin-bottom: 4px;
	}

	.stat-label {
		font-size: 0.9rem;
		color: #666;
	}

	.actions {
		display: flex;
		gap: 12px;
		margin-bottom: 30px;
		flex-wrap: wrap;
	}

	button {
		padding: 12px 24px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 160px;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #007acc;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #005a9e;
	}

	.btn-secondary {
		background: #28a745;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #218838;
	}

	.btn-outline {
		background: transparent;
		color: #666;
		border: 2px solid #ddd;
	}

	.btn-outline:hover:not(:disabled) {
		background: #f8f9fa;
		border-color: #007acc;
		color: #007acc;
	}

	.results {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.results h3 {
		margin: 0 0 20px 0;
		color: #333;
	}

	.results-list {
		max-height: 400px;
		overflow-y: auto;
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		margin-bottom: 8px;
		border-radius: 6px;
		font-family: monospace;
		font-size: 14px;
	}

	.result-item.info {
		background: #e3f2fd;
		color: #1976d2;
	}

	.result-item.success {
		background: #e8f5e8;
		color: #2e7d32;
	}

	.result-item.warning {
		background: #fff3e0;
		color: #f57c00;
	}

	.result-item.error {
		background: #ffebee;
		color: #d32f2f;
	}

	.timestamp {
		font-size: 12px;
		opacity: 0.7;
		min-width: 80px;
	}

	.message {
		flex: 1;
	}

	@media (max-width: 600px) {
		.actions {
			flex-direction: column;
		}

		button {
			min-width: auto;
		}
	}
</style>
