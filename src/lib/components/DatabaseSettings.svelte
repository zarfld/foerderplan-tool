<!-- Updated Database Settings with CouchDB Sync -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initDB, getDatabaseMode, setDatabaseMode, getDatabaseEnvironment, setDatabaseEnvironment } from '$lib/utils/database';

	let db: any = null;
	let syncStatus = 'initializing';
	let dbMode = 'unknown';
	let localDocCount = 0;
	let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
	let testResult = '';
	let isLoading = false;
	let selectedDbMode: 'localStorage' | 'couchdb' | 'hybrid' = 'localStorage';
	let couchdbConfig = {
		localUrl: 'http://157.247.1.102:5984',
		webUrl: 'https://couchdb.ettingshaus14.synology.me',
		environment: 'test' as 'test' | 'production' | 'backup'
	};

	onMount(async () => {
		if (browser) {
			// Get current database mode
			selectedDbMode = getDatabaseMode();
			
			// Get current environment setting
			couchdbConfig.environment = getDatabaseEnvironment();
			
			// Initialize database
			db = await initDB();

			// Handle missing functions gracefully for localStorage mode
			syncStatus = db.getSyncStatus ? db.getSyncStatus() : 'offline';
			dbMode = db.getMode ? db.getMode() : selectedDbMode;

			// Update stats
			await updateStats();

			// Setup online/offline detection
			const updateOnlineStatus = () => {
				isOnline = navigator.onLine;
			};

			window.addEventListener('online', updateOnlineStatus);
			window.addEventListener('offline', updateOnlineStatus);
		}
	});

	async function updateStats() {
		if (!db) return;

		try {
			// Use getAllDocuments instead of loadAllAssessments
			const allDocs = await db.allDocs({ include_docs: true });
			localDocCount = allDocs.rows.filter(
				(row: any) =>
					row.id.startsWith('assessment-') ||
					row.id === 'current-foerderplan' ||
					row.id === 'student-list'
			).length;
			console.log(`📊 Database stats: ${localDocCount} documents`);
		} catch (error) {
			console.error('Error updating stats:', error);
		}
	}

	async function testCouchDBConnection() {
		if (!browser) return;

		isLoading = true;
		testResult = '';

		try {
			const response = await fetch(`${couchdbConfig.localUrl}/_up`, {
				method: 'GET',
				headers: {
					Authorization: 'Basic ' + btoa('Lehrer:jenAplan'),
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				testResult = '✅ CouchDB-Verbindung erfolgreich';
			} else {
				testResult = `❌ CouchDB-Verbindung fehlgeschlagen: ${response.status}`;
			}
		} catch (error: any) {
			testResult = `❌ CouchDB-Verbindungsfehler: ${error?.message || error}`;
		} finally {
			isLoading = false;
		}
	}

	async function triggerSync() {
		if (!db) return;

		isLoading = true;
		testResult = '';

		try {
			const success = await db.manualSync();
			if (success) {
				testResult = '✅ Synchronisation erfolgreich';
				await updateStats();
			} else {
				testResult = '❌ Synchronisation fehlgeschlagen';
			}
		} catch (error: any) {
			testResult = `❌ Sync-Fehler: ${error?.message || error}`;
		} finally {
			isLoading = false;
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'synced':
				return '#10b981'; // Green
			case 'syncing':
				return '#f59e0b'; // Yellow
			case 'offline':
				return '#6b7280'; // Gray
			case 'error':
				return '#ef4444'; // Red
			default:
				return '#3b82f6'; // Blue
		}
	}

	function getModeDescription(mode: string): string {
		switch (mode) {
			case 'hybrid':
				return 'Hybrid (PouchDB + CouchDB Sync)';
			case 'localStorage':
				return 'Lokaler Speicher (Offline)';
			case 'couchdb':
				return 'CouchDB (Online)';
			default:
				return 'Unbekannt';
		}
	}

	async function switchDatabaseMode() {
		if (!browser) return;

		isLoading = true;
		testResult = '';

		try {
			// Set new database mode
			setDatabaseMode(selectedDbMode);
			
			// Reinitialize database with new mode
			db = await initDB();
			syncStatus = db.getSyncStatus ? db.getSyncStatus() : 'offline';
			dbMode = db.getMode ? db.getMode() : selectedDbMode;

			await updateStats();
			testResult = `✅ Datenbank-Modus erfolgreich zu "${getModeDescription(selectedDbMode)}" gewechselt`;
			
			// Auto-reload page to ensure clean state
			setTimeout(() => {
				window.location.reload();
			}, 2000);
			
		} catch (error: any) {
			testResult = `❌ Modus-Wechsel fehlgeschlagen: ${error?.message || error}`;
		} finally {
			isLoading = false;
		}
	}

	async function switchEnvironment() {
		if (!db) return;

		isLoading = true;
		testResult = '';

		try {
			// Save the environment setting
			setDatabaseEnvironment(couchdbConfig.environment);
			
			// Reinitialize database with new environment
			db = await initDB();
			syncStatus = db.getSyncStatus ? db.getSyncStatus() : 'offline';
			dbMode = db.getMode ? db.getMode() : 'localStorage';

			await updateStats();
			testResult = `✅ Umgebung zu "${couchdbConfig.environment}" gewechselt`;
		} catch (error: any) {
			testResult = `❌ Umgebungswechsel fehlgeschlagen: ${error?.message || error}`;
		} finally {
			isLoading = false;
		}
	}

	async function forceSyncNow() {
		if (!db) return;

		isLoading = true;
		testResult = '';

		try {
			if (db.manualSync) {
				const success = await db.manualSync();
				if (success) {
					testResult = '✅ Synchronisation erfolgreich durchgeführt';
					await updateStats();
					syncStatus = db.getSyncStatus ? db.getSyncStatus() : 'offline';
				} else {
					testResult = '❌ Synchronisation fehlgeschlagen';
				}
			} else {
				testResult = '⚠️ Sync nicht verfügbar im localStorage-Modus';
			}
		} catch (error: any) {
			testResult = `❌ Sync-Fehler: ${error?.message || error}`;
		} finally {
			isLoading = false;
		}
	}

	async function testConnection() {
		if (!db) return;

		isLoading = true;
		testResult = '';

		try {
			// Test both local and web URLs
			const localTest = await fetch(`${couchdbConfig.localUrl}/_up`);
			const webTest = await fetch(`${couchdbConfig.webUrl}/_up`);

			const localOk = localTest.ok;
			const webOk = webTest.ok;

			if (localOk && webOk) {
				testResult = '✅ Beide CouchDB-Verbindungen funktionieren';
			} else if (localOk) {
				testResult = '⚠️ Nur lokale CouchDB-Verbindung funktioniert';
			} else if (webOk) {
				testResult = '⚠️ Nur Web-CouchDB-Verbindung funktioniert';
			} else {
				testResult = '❌ Keine CouchDB-Verbindung verfügbar';
			}
		} catch (error: any) {
			testResult = `❌ Verbindungstest fehlgeschlagen: ${error?.message || error}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="database-settings">
	<h2>Datenbank-Einstellungen</h2>

	<!-- Sync Status -->
	<div class="status-section">
		<h3>📊 System-Status</h3>
		<div class="status-grid">
			<div class="status-item">
				<span class="status-label">Datenbank-Modus:</span>
				<span class="status-value">�️ {getModeDescription(dbMode)}</span>
			</div>
			<div class="status-item">
				<span class="status-label">Sync-Status:</span>
				<span class="status-value" style="color: {getStatusColor(syncStatus)}">
					⚡ {syncStatus === 'synced'
						? 'Synchronisiert'
						: syncStatus === 'syncing'
							? 'Synchronisiert...'
							: syncStatus === 'offline'
								? 'Offline-Modus'
								: syncStatus === 'error'
									? 'Sync-Fehler'
									: 'Unbekannt'}
				</span>
			</div>
			<div class="status-item">
				<span class="status-label">Lokale Dokumente:</span>
				<span class="status-value">📱 {localDocCount} Förderplan-Dokumente</span>
			</div>
			<div class="status-item">
				<span class="status-label">Verbindungsstatus:</span>
				<span class="status-value">
					{isOnline ? '🌐 Online' : '📱 Offline'}
				</span>
			</div>
		</div>
	</div>

	<!-- Database Mode Selection -->
	<div class="config-section">
		<h3>💽 Datenbank-Modus</h3>
		<p class="config-description">
			Wählen Sie den gewünschten Datenbank-Modus. Die Änderung erfordert einen Neustart der App.
		</p>

		<div class="mode-selector">
			<label>
				<input
					type="radio"
					bind:group={selectedDbMode}
					value="localStorage"
				/>
				<span class="mode-option">
					📱 LocalStorage (Offline)
					<small>Nur lokale Speicherung im Browser</small>
				</span>
			</label>

			<label>
				<input
					type="radio"
					bind:group={selectedDbMode}
					value="hybrid"
				/>
				<span class="mode-option">
					🔄 Hybrid (LocalStorage + CouchDB)
					<small>Lokale Speicherung mit CouchDB-Synchronisation</small>
				</span>
			</label>

			<label>
				<input
					type="radio"
					bind:group={selectedDbMode}
					value="couchdb"
				/>
				<span class="mode-option">
					🌐 CouchDB (Online)
					<small>Direkte CouchDB-Verbindung</small>
				</span>
			</label>
		</div>

		{#if selectedDbMode !== dbMode}
			<div class="mode-change-warning">
				⚠️ Der gewählte Modus unterscheidet sich vom aktuellen Modus. Klicken Sie "Modus wechseln" um die Änderung zu übernehmen.
			</div>
			<button class="btn btn-primary mode-switch-btn" on:click={switchDatabaseMode} disabled={isLoading}>
				{isLoading ? '⏳ Wechselt Modus...' : '🔄 Modus wechseln'}
			</button>
		{/if}
	</div>

	<!-- Environment Management -->
	<div class="config-section">
		<h3>🔧 Umgebungseinstellungen</h3>
		<p class="config-description">
			Wechseln Sie zwischen verschiedenen CouchDB-Umgebungen. Die Änderung wird sofort aktiv.
		</p>

		<div class="environment-selector">
			<label>
				<input
					type="radio"
					bind:group={couchdbConfig.environment}
					value="test"
					on:change={switchEnvironment}
				/>
				<span class="env-option">
					🧪 Test-Umgebung
					<small>Für Entwicklung und Tests</small>
				</span>
			</label>

			<label>
				<input
					type="radio"
					bind:group={couchdbConfig.environment}
					value="production"
					on:change={switchEnvironment}
				/>
				<span class="env-option">
					🏭 Produktions-Umgebung
					<small>Für den Echtbetrieb</small>
				</span>
			</label>

			<label>
				<input
					type="radio"
					bind:group={couchdbConfig.environment}
					value="backup"
					on:change={switchEnvironment}
				/>
				<span class="env-option">
					� Backup-Umgebung
					<small>Für Datenarchivierung</small>
				</span>
			</label>
		</div>

		<div class="button-group">
			<button class="btn btn-info" on:click={updateStats} disabled={isLoading}>
				{isLoading ? '⏳ Aktualisiere...' : '� Status aktualisieren'}
			</button>

			<button class="btn btn-primary" on:click={forceSyncNow} disabled={isLoading || !isOnline}>
				{isLoading ? '⏳ Synchronisiere...' : '⚡ Jetzt synchronisieren'}
			</button>

			<button class="btn btn-warning" on:click={testConnection} disabled={isLoading}>
				{isLoading ? '⏳ Teste...' : '� Verbindung testen'}
			</button>
		</div>

		{#if testResult}
			<div class="test-result">
				{testResult}
			</div>
		{/if}
	</div>

	<!-- Architecture Information -->
	<div class="help-section">
		<h3>ℹ️ System-Architektur</h3>
		<div class="help-content">
			<h4>�️ Hybrid Database System</h4>
			<p>
				• ✅ <strong>PouchDB:</strong> Lokale Speicherung im Browser<br />
				• ✅ <strong>CouchDB:</strong> Zentrale Synchronisation auf Synology NAS<br />
				• ✅ <strong>Offline-First:</strong> Funktioniert auch ohne Internet<br />
				• ✅ <strong>Auto-Sync:</strong> Automatische Synchronisation wenn online
			</p>

			<h4>🌐 CouchDB-Konfiguration</h4>
			<p>
				• <strong>Lokal:</strong> <code>{couchdbConfig.localUrl}</code><br />
				• <strong>Web:</strong> <code>{couchdbConfig.webUrl}</code><br />
				• <strong>Aktuelle Umgebung:</strong> <code>{couchdbConfig.environment}</code><br />
				• <strong>Datenbank:</strong> <code>foerderplan-{couchdbConfig.environment}</code>
			</p>

			<h4>� Funktionsweise</h4>
			<p>
				• Alle Daten werden sofort lokal in PouchDB gespeichert<br />
				• Bei Internetverbindung wird automatisch mit CouchDB synchronisiert<br />
				• Konflikte werden automatisch erkannt und gekennzeichnet<br />
				• Jedes Gerät hat eine vollständige lokale Kopie der Daten
			</p>

			<h4>🔐 Datensicherheit</h4>
			<p>
				• Daten bleiben auch bei Serverausfall verfügbar<br />
				• Automatische Backups durch CouchDB-Replikation<br />
				• Versionierung aller Dokument-Änderungen<br />
				• Keine Datenverluste durch Offline-First Architektur
			</p>
		</div>
	</div>
</div>

<style>
	.database-settings {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.database-settings h2 {
		color: #1f2937;
		margin-bottom: 2rem;
		text-align: center;
	}

	.status-section,
	.config-section,
	.help-section {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.status-section h3,
	.config-section h3,
	.help-section h3 {
		margin-bottom: 1rem;
		color: #374151;
		font-weight: 600;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.status-item {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
	}

	.status-label {
		font-weight: 500;
		color: #6b7280;
	}

	.status-value {
		font-weight: 600;
		color: #1f2937;
	}

	.config-description {
		color: #6b7280;
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.button-group {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-info {
		background: #0ea5e9;
		color: white;
	}

	.btn-info:hover:not(:disabled) {
		background: #0284c7;
	}

	.btn-warning {
		background: #f59e0b;
		color: white;
	}

	.btn-warning:hover:not(:disabled) {
		background: #d97706;
	}

	.environment-selector {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 1rem 0;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.mode-selector {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 1rem 0;
		padding: 1rem;
		background: #f0f9ff;
		border-radius: 8px;
		border: 1px solid #bfdbfe;
	}

	.environment-selector label,
	.mode-selector label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		padding: 0.75rem;
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.environment-selector label:hover,
	.mode-selector label:hover {
		background: #f3f4f6;
	}

	.environment-selector input[type='radio'],
	.mode-selector input[type='radio'] {
		margin: 0;
	}

	.env-option,
	.mode-option {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.env-option small,
	.mode-option small {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.mode-change-warning {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		color: #92400e;
		padding: 0.75rem;
		border-radius: 6px;
		margin: 1rem 0;
		font-size: 0.875rem;
	}

	.mode-switch-btn {
		width: 100%;
		margin-top: 0.5rem;
	}

	.test-result {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: 6px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.help-content h4 {
		color: #374151;
		margin: 1rem 0 0.5rem 0;
		font-weight: 600;
	}

	.help-content p {
		color: #6b7280;
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	@media (max-width: 768px) {
		.database-settings {
			padding: 1rem;
		}

		.status-grid {
			grid-template-columns: 1fr;
		}

		.button-group {
			flex-direction: column;
		}
	}
</style>
