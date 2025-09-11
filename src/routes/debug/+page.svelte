<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { initDB, getDatabaseMode, setDatabaseMode, getDatabaseEnvironment } from '$lib/utils/database.ts';

	let debugLog = [];
	let currentMode = 'localStorage';
	let dbInstance = null;
	let isLoading = false;

	function addLog(message, type = 'info') {
		debugLog = [...debugLog, {
			timestamp: new Date().toLocaleTimeString(),
			message,
			type
		}];
	}

	onMount(async () => {
		if (browser) {
			addLog('🚀 Debug page loaded');
			currentMode = getDatabaseMode();
			addLog(`📊 Current database mode: ${currentMode}`);
			
			const currentEnv = getDatabaseEnvironment();
			addLog(`🌍 Current environment: ${currentEnv}`);
			
			// Check localStorage items
			let foerderplanItems = 0;
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith('foerderplan_')) {
					foerderplanItems++;
				}
			}
			addLog(`📁 Found ${foerderplanItems} foerderplan items in localStorage`);
			
			// Auto-test database initialization
			await testDatabaseInit();
		}
	});

	async function testDatabaseInit() {
		isLoading = true;
		addLog('🔄 Testing database initialization...', 'info');

		try {
			// Force reinitialize by clearing existing instance
			dbInstance = null;
			
			// Get fresh instance
			dbInstance = await initDB();
			
			const mode = dbInstance.getMode();
			const syncStatus = dbInstance.getSyncStatus();
			
			addLog(`✅ Database initialized successfully`, 'success');
			addLog(`📊 Mode: ${mode}`, 'info');
			addLog(`🔄 Sync Status: ${syncStatus}`, 'info');
			
			// Test basic operations
			const testDoc = {
				_id: 'debug-test-' + Date.now(),
				type: 'debug',
				message: 'Test document',
				timestamp: new Date().toISOString()
			};
			
			addLog(`💾 Testing document save...`, 'info');
			const saveResult = await dbInstance.put(testDoc);
			addLog(`✅ Document saved: ${JSON.stringify(saveResult)}`, 'success');
			
			// Test manual sync if available
			if (typeof dbInstance.manualSync === 'function') {
				addLog(`🔄 Testing manual sync...`, 'info');
				const syncResult = await dbInstance.manualSync();
				addLog(`🔄 Manual sync result: ${syncResult}`, syncResult ? 'success' : 'warning');
			}
			
		} catch (error) {
			addLog(`❌ Database initialization failed: ${error.message}`, 'error');
			if (error.stack) {
				addLog(`📋 Stack trace: ${error.stack}`, 'error');
			}
		} finally {
			isLoading = false;
		}
	}

	async function switchToHybridMode() {
		addLog('🔄 Switching to hybrid mode...', 'info');
		setDatabaseMode('hybrid');
		currentMode = 'hybrid';
		addLog('✅ Mode switched to hybrid, reinitializing...', 'success');
		await testDatabaseInit();
	}

	async function testCouchDBDirect() {
		isLoading = true;
		addLog('🌐 Testing direct CouchDB connection...', 'info');

		try {
			const response = await fetch('http://157.247.1.102:5984/_up', {
				method: 'GET',
				headers: {
					'Authorization': 'Basic ' + btoa('Lehrer:jenAplan'),
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				addLog('✅ CouchDB connection successful', 'success');
				
				// Test database access
				const dbResponse = await fetch('http://157.247.1.102:5984/foerderplan', {
					method: 'GET',
					headers: {
						'Authorization': 'Basic ' + btoa('Lehrer:jenAplan')
					}
				});
				
				if (dbResponse.ok) {
					const dbInfo = await dbResponse.json();
					addLog(`📊 Database info: ${dbInfo.doc_count} documents`, 'info');
				} else if (dbResponse.status === 404) {
					addLog('⚠️ Database "foerderplan" does not exist', 'warning');
				} else {
					addLog(`❌ Database access failed: ${dbResponse.status}`, 'error');
				}
			} else {
				addLog(`❌ CouchDB connection failed: ${response.status}`, 'error');
			}
		} catch (error) {
			addLog(`❌ CouchDB connection error: ${error.message}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	function clearLog() {
		debugLog = [];
	}
</script>

<svelte:head>
	<title>Debug - Förderplan Tool</title>
</svelte:head>

<div class="debug-page">
	<h1>🔍 Database Sync Debug</h1>
	
	<div class="status-section">
		<h2>📊 Current Status</h2>
		<p><strong>Database Mode:</strong> {currentMode}</p>
		<p><strong>Database Instance:</strong> {dbInstance ? 'Initialized' : 'Not initialized'}</p>
	</div>

	<div class="actions">
		<button on:click={testDatabaseInit} disabled={isLoading}>
			{isLoading ? '🔄 Testing...' : '🧪 Test Database Init'}
		</button>
		
		<button on:click={switchToHybridMode} disabled={isLoading}>
			🔄 Switch to Hybrid Mode
		</button>
		
		<button on:click={testCouchDBDirect} disabled={isLoading}>
			🌐 Test CouchDB Direct
		</button>
		
		<button on:click={clearLog}>
			🧹 Clear Log
		</button>
	</div>

	<div class="log-section">
		<h2>📋 Debug Log</h2>
		<div class="log-container">
			{#each debugLog as entry}
				<div class="log-entry {entry.type}">
					<span class="timestamp">{entry.timestamp}</span>
					<span class="message">{entry.message}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.debug-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 20px;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	h1 {
		color: #333;
		text-align: center;
		margin-bottom: 30px;
	}

	.status-section {
		background: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		margin-bottom: 20px;
	}

	.status-section h2 {
		margin: 0 0 15px 0;
		color: #495057;
	}

	.status-section p {
		margin: 5px 0;
		font-size: 16px;
	}

	.actions {
		display: flex;
		gap: 10px;
		margin-bottom: 30px;
		flex-wrap: wrap;
	}

	button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		background: #007acc;
		color: white;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	button:hover:not(:disabled) {
		background: #005a9e;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.log-section {
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		overflow: hidden;
	}

	.log-section h2 {
		background: #f8f9fa;
		margin: 0;
		padding: 15px 20px;
		border-bottom: 1px solid #dee2e6;
		color: #495057;
	}

	.log-container {
		max-height: 400px;
		overflow-y: auto;
		padding: 10px;
	}

	.log-entry {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 8px 10px;
		margin-bottom: 5px;
		border-radius: 4px;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 13px;
	}

	.log-entry.info {
		background: #e3f2fd;
		color: #1976d2;
	}

	.log-entry.success {
		background: #e8f5e8;
		color: #2e7d32;
	}

	.log-entry.warning {
		background: #fff3e0;
		color: #f57c00;
	}

	.log-entry.error {
		background: #ffebee;
		color: #d32f2f;
	}

	.timestamp {
		min-width: 80px;
		opacity: 0.7;
		font-size: 11px;
	}

	.message {
		flex: 1;
		word-break: break-word;
	}

	@media (max-width: 600px) {
		.actions {
			flex-direction: column;
		}

		button {
			width: 100%;
		}
	}
</style>
