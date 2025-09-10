<!-- @ts-nocheck -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let localDocCount = 0;
	let localStorageSize = 0;
	let testResult = '';
	let isLoading = false;
	
	onMount(async () => {
		if (browser) {
			await updateLocalStats();
		}
	});
	
	async function updateLocalStats() {
		if (!browser) return;
		
		try {
			// Count localStorage items related to assessments
			let count = 0;
			let size = 0;
			
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith('pouchdb_') || key?.includes('assessment') || key?.includes('foerderplan')) {
					count++;
					const value = localStorage.getItem(key);
					if (value) {
						size += value.length;
					}
				}
			}
			
			localDocCount = count;
			localStorageSize = Math.round(size / 1024 * 100) / 100; // KB
			
			console.log(`📊 Local storage stats: ${count} documents, ${localStorageSize} KB`);
		} catch (error) {
			console.error('Error updating local stats:', error);
		}
	}
	
	function clearAllData() {
		if (!browser) return;
		
		if (confirm('Möchten Sie wirklich alle lokalen Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
			try {
				const keysToRemove = [];
				
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key?.startsWith('pouchdb_') || key?.includes('assessment') || key?.includes('foerderplan')) {
						keysToRemove.push(key);
					}
				}
				
				keysToRemove.forEach(key => localStorage.removeItem(key));
				
				testResult = `✅ ${keysToRemove.length} Dokumente erfolgreich gelöscht`;
				updateLocalStats();
			} catch (error) {
				testResult = `❌ Fehler beim Löschen: ${error.message}`;
			}
		}
	}
	
	async function exportData() {
		if (!browser) return;
		
		try {
			isLoading = true;
			const exportData: any = {};
			
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith('pouchdb_') || key?.includes('assessment') || key?.includes('foerderplan')) {
					const value = localStorage.getItem(key);
					if (value) {
						exportData[key] = JSON.parse(value);
					}
				}
			}
			
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `foerderplan-export-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			testResult = '✅ Daten erfolgreich exportiert';
		} catch (error) {
			testResult = `❌ Export-Fehler: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}
	
	async function importData(event: any) {
		if (!browser) return;
		
		const file = event.target.files[0];
		if (!file) return;
		
		try {
			isLoading = true;
			const text = await file.text();
			const importData = JSON.parse(text);
			
			let importCount = 0;
			
			for (const [key, value] of Object.entries(importData)) {
				localStorage.setItem(key, JSON.stringify(value));
				importCount++;
			}
			
			testResult = `✅ ${importCount} Dokumente erfolgreich importiert`;
			await updateLocalStats();
		} catch (error) {
			testResult = `❌ Import-Fehler: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}
	
	function getStorageColor(sizeKB: number): string {
		if (sizeKB < 100) return '#10b981'; // Green
		if (sizeKB < 500) return '#f59e0b'; // Yellow
		return '#ef4444'; // Red
	}
</script>

<div class="database-settings">
	<h2>Datenbank-Einstellungen</h2>
	
	<!-- Connection Status -->
	<div class="status-section">
		<h3>Lokaler Speicher (localStorage)</h3>
		<div class="status-grid">
			<div class="status-item">
				<span class="status-label">Gespeicherte Dokumente:</span>
				<span class="status-value">📱 {localDocCount} Dokumente</span>
			</div>
			<div class="status-item">
				<span class="status-label">Speicherplatz:</span>
				<span class="status-value" style="color: {getStorageColor(localStorageSize)}">
					💾 {localStorageSize} KB
				</span>
			</div>
			<div class="status-item">
				<span class="status-label">Browser:</span>
				<span class="status-value">🌐 {browser && navigator?.userAgent?.includes('Chrome') ? 'Chrome' : 'Browser'}</span>
			</div>
			<div class="status-item">
				<span class="status-label">Online-Status:</span>
				<span class="status-value">
					{browser && navigator?.onLine ? '🌐 Online' : '📱 Offline'}
				</span>
			</div>
		</div>
	</div>
	
	<!-- Data Management -->
	<div class="config-section">
		<h3>Daten-Verwaltung</h3>
		<p class="config-description">
			Verwalten Sie Ihre lokalen Förderplan-Daten. Alle Daten werden sicher in Ihrem Browser gespeichert 
			und bleiben auch nach einem Neustart erhalten.
		</p>
		
		<div class="button-group">
			<button 
				class="btn btn-info" 
				on:click={updateLocalStats}
				disabled={isLoading}
			>
				📊 Status aktualisieren
			</button>
			
			<button 
				class="btn btn-primary" 
				on:click={exportData}
				disabled={isLoading || localDocCount === 0}
			>
				{isLoading ? '⏳ Exportiere...' : '📤 Daten exportieren'}
			</button>
			
			<label class="btn btn-secondary" class:disabled={isLoading}>
				{isLoading ? '⏳ Importiere...' : '📥 Daten importieren'}
				<input 
					type="file" 
					accept=".json"
					on:change={importData}
					style="display: none;"
					disabled={isLoading}
				/>
			</label>
			
			<button 
				class="btn btn-danger" 
				on:click={clearAllData}
				disabled={isLoading || localDocCount === 0}
			>
				🗑️ Alle Daten löschen
			</button>
		</div>
		
		{#if testResult}
			<div class="test-result">
				{testResult}
			</div>
		{/if}
	</div>
	
	<!-- Future NAS Section -->
	<div class="help-section">
		<h3>Zukünftige Features</h3>
		<div class="help-content">
			<h4>🏠 Aktuell: localStorage (Offline-First)</h4>
			<p>
				• ✅ Daten bleiben nach Browser-Neustart erhalten<br>
				• ✅ Funktioniert ohne Internetverbindung<br>
				• ✅ Automatische Speicherung aller Änderungen<br>
				• ⚠️ Jedes Gerät/Browser hat eigene Daten
			</p>
			
			<h4>🔮 Geplant: NAS Synchronisation</h4>
			<p>
				• 🚧 Zentrale Datenbank auf Synology NAS<br>
				• 🚧 Automatische Synchronisation zwischen Geräten<br>
				• 🚧 Backup und Wiederherstellung<br>
				• 🚧 Mehrbenutzerzugriff
			</p>
			
			<h4>� Tipps für den aktuellen Stand</h4>
			<p>
				• Nutzen Sie "Daten exportieren" für Backups<br>
				• Importieren Sie Daten auf anderen Geräten<br>
				• URL teilen: <code>http://ihr-pc-ip:5173</code> für Netzwerkzugriff<br>
				• Jedes Gerät benötigt eigenen Import der Daten
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
	
	.status-section, .config-section, .sync-section, .help-section {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.status-section h3, .config-section h3, .sync-section h3, .help-section h3 {
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
	
	.config-description code {
		background: #f3f4f6;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: monospace;
		font-size: 0.9rem;
	}
	
	.nas-config {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.input-group label {
		font-weight: 500;
		color: #374151;
	}
	
	.nas-input {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
	}
	
	.nas-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}
	
	.button-group, .sync-controls {
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
	
	.btn-secondary {
		background: #6b7280;
		color: white;
	}
	
	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}
	
	.btn-danger {
		background: #ef4444;
		color: white;
	}
	
	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}
	
	.btn-info {
		background: #0ea5e9;
		color: white;
	}
	
	.btn-info:hover:not(:disabled) {
		background: #0284c7;
	}
	
	.btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
	
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		
		.button-group, .sync-controls {
			flex-direction: column;
		}
	}
</style>
