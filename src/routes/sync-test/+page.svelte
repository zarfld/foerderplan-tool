<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initDB, getDatabaseMode, getDatabaseEnvironment } from '$lib/utils/database.ts';

	let logs: string[] = [];
	let dbInstance: any = null;
	let syncStatus = 'unknown';
	let isLoading = false;

	function addLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
		const timestamp = new Date().toLocaleTimeString();
		const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
		logs = [...logs, `${timestamp} ${emoji} ${message}`];
	}

	onMount(async () => {
		if (browser) {
			addLog('🚀 Sync test page loaded');
			const mode = getDatabaseMode();
			const env = getDatabaseEnvironment();
			addLog(`📊 Current mode: ${mode}, environment: ${env}`);
			
			await testDatabaseConnection();
		}
	});

	async function testDatabaseConnection() {
		isLoading = true;
		addLog('🔄 Testing database connection...', 'info');

		try {
			dbInstance = await initDB();
			addLog('✅ Database initialized successfully', 'success');

			// Test basic operations
			const testDoc = {
				_id: `sync-test-${Date.now()}`,
				type: 'sync-test',
				data: 'Test document for sync',
				timestamp: new Date().toISOString()
			};

			addLog('🔄 Testing document save...', 'info');
			const saveResult = await dbInstance.put(testDoc);
			addLog(`✅ Document saved: ${saveResult.id}`, 'success');

			// Get sync status
			if (dbInstance.getSyncStatus) {
				syncStatus = dbInstance.getSyncStatus();
				addLog(`📡 Sync status: ${syncStatus}`, 'info');
			}

			// Test sync if available
			if (dbInstance.manualSync) {
				addLog('🔄 Testing manual sync...', 'info');
				const syncResult = await dbInstance.manualSync();
				addLog(`📡 Manual sync result: ${syncResult}`, syncResult ? 'success' : 'warning');
			}

			// Test document retrieval
			addLog('🔄 Testing document retrieval...', 'info');
			const retrievedDoc = await dbInstance.get(testDoc._id);
			addLog(`✅ Document retrieved: ${retrievedDoc._id}`, 'success');

			// List all documents
			addLog('🔄 Listing all documents...', 'info');
			const allDocs = await dbInstance.allDocs({ include_docs: true });
			addLog(`📂 Found ${allDocs.rows.length} documents total`, 'info');

		} catch (error: any) {
			addLog(`❌ Database test failed: ${error?.message || error}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	async function testManualSync() {
		if (!dbInstance || !dbInstance.manualSync) {
			addLog('❌ Manual sync not available', 'error');
			return;
		}

		isLoading = true;
		addLog('🔄 Starting manual sync...', 'info');

		try {
			const result = await dbInstance.manualSync();
			addLog(`📡 Manual sync completed: ${result}`, result ? 'success' : 'warning');
			
			// Update sync status
			if (dbInstance.getSyncStatus) {
				syncStatus = dbInstance.getSyncStatus();
				addLog(`📡 Updated sync status: ${syncStatus}`, 'info');
			}
		} catch (error: any) {
			addLog(`❌ Manual sync failed: ${error?.message || error}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	async function testCouchDBConnection() {
		addLog('🔍 Testing direct CouchDB connection...', 'info');
		
		const env = getDatabaseEnvironment();
		const dbName = env === 'test' ? 'foerderplan-test' : 'foerderplan';
		const url = `http://157.247.1.102:5984/${dbName}`;
		
		addLog(`📡 Testing: ${url}`, 'info');

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Authorization': 'Basic ' + btoa('Lehrer:jenAplan'),
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const info = await response.json();
				addLog(`✅ CouchDB connection successful: ${info.db_name}`, 'success');
				addLog(`📊 Doc count: ${info.doc_count}, Update seq: ${info.update_seq}`, 'info');
			} else {
				addLog(`❌ CouchDB connection failed: ${response.status} ${response.statusText}`, 'error');
			}
		} catch (error: any) {
			addLog(`❌ CouchDB connection error: ${error?.message || error}`, 'error');
		}
	}

	function clearLogs() {
		logs = [];
	}
</script>

<svelte:head>
	<title>Sync Test - Foerderplan Tool</title>
</svelte:head>

<main class="container">
	<h1>🔄 Sync Test Tool</h1>
	<p>Comprehensive testing of database synchronization functionality.</p>

	<div class="controls">
		<button on:click={testDatabaseConnection} disabled={isLoading}>
			{isLoading ? '⏳ Testing...' : '🔄 Test Database'}
		</button>
		
		<button on:click={testManualSync} disabled={isLoading || !dbInstance}>
			{isLoading ? '⏳ Syncing...' : '📡 Manual Sync'}
		</button>

		<button on:click={testCouchDBConnection} disabled={isLoading}>
			{isLoading ? '⏳ Testing...' : '🔍 Test CouchDB Direct'}
		</button>

		<button on:click={clearLogs}>
			🧹 Clear Logs
		</button>
	</div>

	<div class="status-info">
		<h3>Current Status</h3>
		<p><strong>Sync Status:</strong> <span class="status-{syncStatus}">{syncStatus}</span></p>
		<p><strong>Database Mode:</strong> {getDatabaseMode()}</p>
		<p><strong>Environment:</strong> {getDatabaseEnvironment()}</p>
	</div>

	<div class="logs-section">
		<h3>Test Logs</h3>
		<div class="logs">
			{#each logs as log}
				<div class="log-entry">{log}</div>
			{/each}
		</div>
	</div>
</main>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		color: #333;
		margin-bottom: 1rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin: 2rem 0;
		flex-wrap: wrap;
	}

	button {
		padding: 0.8rem 1.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.status-info {
		background: #f3f4f6;
		padding: 1.5rem;
		border-radius: 8px;
		margin: 2rem 0;
	}

	.status-info h3 {
		margin-top: 0;
		color: #374151;
	}

	.status-info p {
		margin: 0.5rem 0;
		color: #4b5563;
	}

	.status-connected { color: #059669; font-weight: bold; }
	.status-syncing { color: #d97706; font-weight: bold; }
	.status-error { color: #dc2626; font-weight: bold; }
	.status-disconnected { color: #6b7280; }
	.status-unknown { color: #6b7280; }

	.logs-section {
		margin-top: 2rem;
	}

	.logs {
		background: #1f2937;
		color: #f9fafb;
		padding: 1.5rem;
		border-radius: 8px;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.9rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.log-entry {
		padding: 0.25rem 0;
		border-bottom: 1px solid #374151;
	}

	.log-entry:last-child {
		border-bottom: none;
	}
</style>
