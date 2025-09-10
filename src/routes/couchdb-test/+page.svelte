<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let testResult = '';
	let isLoading = false;
	let connectionStatus = 'Not tested';

	// CouchDB connection details
	const couchdbConfig = {
		localUrl: 'http://157.247.1.102:5984/',
		webUrl: 'https://couchdb.ettingshaus14.synology.me',
		proxyUrl: 'http://localhost:3001/', // CORS proxy for development
		username: 'Lehrer',
		password: 'jenAplan',
		databases: {
			test: 'foerderplan-test', // For development and testing
			production: 'foerderplan', // For live teacher data
			backup: 'foerderplan-backup' // For automated backups
		}
	};

	// Helper function to safely access database names
	function getDatabaseName(key: string): string {
		const databases = couchdbConfig.databases as Record<string, string>;
		return databases[key] || '';
	}

	let selectedDatabase = 'test'; // Default to test database

	async function testConnection(url: string) {
		try {
			// Test basic connection with CORS mode
			const response = await fetch(url, {
				method: 'GET',
				mode: 'cors',
				credentials: 'include',
				headers: {
					Authorization: 'Basic ' + btoa(`${couchdbConfig.username}:${couchdbConfig.password}`),
					'Content-Type': 'application/json',
					Accept: 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return { success: true, data };
		} catch (error) {
			// Enhanced error detection with proper type checking
			const errorMessage =
				error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

			if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
				return {
					success: false,
					error: `CORS Error: ${error instanceof Error ? error.message : String(error)}`,
					errorType: 'cors',
					solution:
						'Configure CORS headers on CouchDB server. See COUCHDB-SETUP.md for instructions.'
				};
			} else if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
				return {
					success: false,
					error: `Network Error: ${error instanceof Error ? error.message : String(error)}`,
					errorType: 'network',
					solution:
						'Check if server is running and accessible. Verify URL and network connectivity.'
				};
			} else if (errorMessage.includes('timeout')) {
				return {
					success: false,
					error: `Timeout Error: ${error instanceof Error ? error.message : String(error)}`,
					errorType: 'timeout',
					solution:
						'Server is taking too long to respond. Check server performance and network latency.'
				};
			} else {
				return {
					success: false,
					error: `Unknown Error: ${error instanceof Error ? error.message : String(error)}`,
					errorType: 'unknown',
					solution: 'Check browser console for more details.'
				};
			}
		}
	}

	async function testDatabase(url: string) {
		try {
			// Test database access
			const dbName =
				couchdbConfig.databases[selectedDatabase as keyof typeof couchdbConfig.databases];
			const dbUrl = `${url}${dbName}/`;
			const response = await fetch(dbUrl, {
				method: 'GET',
				mode: 'cors',
				credentials: 'include',
				headers: {
					Authorization: 'Basic ' + btoa(`${couchdbConfig.username}:${couchdbConfig.password}`),
					'Content-Type': 'application/json',
					Accept: 'application/json'
				}
			});

			if (response.status === 404) {
				// Database doesn't exist, try to create it
				const createResponse = await fetch(dbUrl, {
					method: 'PUT',
					mode: 'cors',
					credentials: 'include',
					headers: {
						Authorization: 'Basic ' + btoa(`${couchdbConfig.username}:${couchdbConfig.password}`),
						'Content-Type': 'application/json',
						Accept: 'application/json'
					}
				});

				if (!createResponse.ok) {
					throw new Error(`Failed to create database: ${createResponse.status}`);
				}

				return { success: true, created: true };
			} else if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return { success: true, data };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async function testDocument(url: string) {
		try {
			// Test document creation with unique ID to avoid conflicts
			const dbName = getDatabaseName(selectedDatabase);
			const timestamp = Date.now();
			const docId = `test-doc-${timestamp}`;
			const docUrl = `${url}${dbName}/${docId}`;

			const testDoc = {
				_id: docId,
				type: 'test',
				timestamp: new Date().toISOString(),
				message: `Test document from Förderplan Tool (${selectedDatabase} database)`,
				testNumber: timestamp
			};

			// First try to create the document
			const response = await fetch(docUrl, {
				method: 'PUT',
				headers: {
					Authorization: 'Basic ' + btoa(`${couchdbConfig.username}:${couchdbConfig.password}`),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(testDoc)
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const createResult = await response.json();

			// Verify the document was created by reading it back
			const verifyResponse = await fetch(docUrl, {
				method: 'GET',
				headers: {
					Authorization: 'Basic ' + btoa(`${couchdbConfig.username}:${couchdbConfig.password}`),
					'Content-Type': 'application/json'
				}
			});

			if (!verifyResponse.ok) {
				throw new Error(`Verification failed: HTTP ${verifyResponse.status}`);
			}

			const verifyResult = await verifyResponse.json();

			return {
				success: true,
				data: createResult,
				verified: verifyResult,
				docId: docId
			};
		} catch (error: any) {
			return { success: false, error: error?.message || String(error) };
		}
	}

	async function runFullTest(url: string, label: string) {
		if (!browser) return;

		isLoading = true;
		testResult += `\n📊 Testing ${label} (${url})\n`;
		testResult += '='.repeat(50) + '\n';

		// Test 1: Basic connection
		testResult += '1️⃣ Testing basic connection...\n';
		const connectionTest = await testConnection(url);
		if (connectionTest.success) {
			testResult += `✅ Connection successful!\n`;
			testResult += `   CouchDB Version: ${connectionTest.data.version}\n`;
			testResult += `   UUID: ${connectionTest.data.uuid}\n\n`;
		} else {
			testResult += `❌ Connection failed: ${connectionTest.error}\n\n`;
			isLoading = false;
			return;
		}

		// Test 2: Database access
		testResult += '2️⃣ Testing database access...\n';
		const dbTest = await testDatabase(url);
		if (dbTest.success) {
			if (dbTest.created) {
				testResult += `✅ Database created successfully!\n\n`;
			} else {
				testResult += `✅ Database access successful!\n`;
				testResult += `   Database: ${dbTest.data.db_name}\n`;
				testResult += `   Documents: ${dbTest.data.doc_count}\n\n`;
			}
		} else {
			testResult += `❌ Database access failed: ${dbTest.error}\n\n`;
			isLoading = false;
			return;
		}

		// Test 3: Document operations
		testResult += '3️⃣ Testing document operations...\n';
		const docTest = await testDocument(url);
		if (docTest.success) {
			testResult += `✅ Document operation successful!\n`;
			testResult += `   Document ID: ${docTest.data.id || docTest.docId}\n`;
			testResult += `   Revision: ${docTest.data.rev}\n`;
			if (docTest.verified) {
				testResult += `   ✅ Document verified: ${docTest.verified._id}\n`;
				testResult += `   Created: ${docTest.verified.timestamp}\n`;
			}
			testResult += '\n';
		} else {
			testResult += `❌ Document operation failed: ${docTest.error}\n`;
			if (docTest.error.includes('409') || docTest.error.includes('Conflict')) {
				testResult += `   💡 This usually means the test document already exists.\n`;
				testResult += `   The database is working correctly.\n`;
			}
			testResult += '\n';
		}

		isLoading = false;
	}

	async function testLocalConnection() {
		connectionStatus = 'Testing local connection...';
		await runFullTest(couchdbConfig.localUrl, 'Local Network Connection');
		connectionStatus = 'Local test completed';
	}

	async function testWebConnection() {
		connectionStatus = 'Testing web connection...';
		await runFullTest(couchdbConfig.webUrl, 'Web HTTPS Connection');
		connectionStatus = 'Web test completed';
	}

	async function testProxyConnection() {
		connectionStatus = 'Testing proxy connection...';
		await runFullTest(couchdbConfig.proxyUrl, 'CORS Proxy Connection (localhost:3001)');
		connectionStatus = 'Proxy test completed';
	}

	function clearResults() {
		testResult = '';
		connectionStatus = 'Cleared';
	}

	// Diagnostics and helper functions
	function generateCORSCommands() {
		const serverUrl = couchdbConfig.localUrl;
		const adminCredentials = `admin:admin`; // Default - user should change this

		return `
# CouchDB CORS Configuration Commands
# Replace 'admin:admin' with your actual admin credentials

# 1. Enable CORS
curl -X PUT http://${adminCredentials}@${serverUrl.replace('http://', '').replace('/', '')}/_node/_local/_config/httpd/enable_cors -d '"true"'

# 2. Set allowed origins (development - use specific domain in production)
curl -X PUT http://${adminCredentials}@${serverUrl.replace('http://', '').replace('/', '')}/_node/_local/_config/cors/origins -d '"*"'

# 3. Set allowed credentials
curl -X PUT http://${adminCredentials}@${serverUrl.replace('http://', '').replace('/', '')}/_node/_local/_config/cors/credentials -d '"true"'

# 4. Set allowed methods
curl -X PUT http://${adminCredentials}@${serverUrl.replace('http://', '').replace('/', '')}/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'

# 5. Set allowed headers
curl -X PUT http://${adminCredentials}@${serverUrl.replace('http://', '').replace('/', '')}/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'

# Check CORS configuration
curl http://${adminCredentials}@${serverUrl.replace('http://', '').replace('/', '')}/_node/_local/_config/cors
		`.trim();
	}

	async function testNetworkConnectivity() {
		testResult += '\n🔍 Network Diagnostics\n';
		testResult += '='.repeat(50) + '\n';

		// Test basic connectivity without authentication
		const urls = [couchdbConfig.localUrl, couchdbConfig.webUrl];

		for (const url of urls) {
			testResult += `\n📡 Testing basic connectivity to ${url}\n`;

			try {
				const startTime = Date.now();
				const response = await fetch(url, {
					method: 'HEAD',
					mode: 'no-cors',
					cache: 'no-cache'
				});
				const endTime = Date.now();

				testResult += `✅ Server responded (${endTime - startTime}ms)\n`;
				testResult += `   Status: ${response.status || 'No CORS - server accessible'}\n`;
			} catch (error) {
				testResult += `❌ Connection failed: ${error instanceof Error ? error.message : String(error)}\n`;

				if (url.includes('https://')) {
					testResult += `   💡 For HTTPS servers, check:\n`;
					testResult += `      - SSL certificate validity\n`;
					testResult += `      - DNS resolution\n`;
					testResult += `      - Firewall settings\n`;
					testResult += `      - Port forwarding (if behind router)\n`;
				}
			}
		}
	}

	let showCORSCommands = false;
	let corsCommands = '';

	function toggleCORSCommands() {
		showCORSCommands = !showCORSCommands;
		if (showCORSCommands) {
			corsCommands = generateCORSCommands();
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			alert('Commands copied to clipboard!');
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			alert('Failed to copy to clipboard. Please copy manually.');
		}
	}
</script>

<svelte:head>
	<title>CouchDB Connection Test - Förderplan Tool</title>
</svelte:head>

<div class="couchdb-test">
	<h1>🗄️ CouchDB Connection Test</h1>

	<div class="connection-info">
		<h2>📋 Connection Details</h2>
		<div class="config-display">
			<div class="config-item">
				<strong>Local URL:</strong>
				{couchdbConfig.localUrl}
			</div>
			<div class="config-item">
				<strong>Web URL:</strong>
				{couchdbConfig.webUrl}
			</div>
			<div class="config-item">
				<strong>Proxy URL:</strong>
				{couchdbConfig.proxyUrl}
				<span class="proxy-note">(CORS-enabled development proxy)</span>
			</div>
			<div class="config-item">
				<strong>Username:</strong>
				{couchdbConfig.username}
			</div>
			<div class="config-item">
				<strong>Selected Database:</strong>
				<select bind:value={selectedDatabase} class="db-selector">
					<option value="test">🧪 {couchdbConfig.databases.test} (Test)</option>
					<option value="production">🏭 {couchdbConfig.databases.production} (Production)</option>
					<option value="backup">💾 {couchdbConfig.databases.backup} (Backup)</option>
				</select>
			</div>
		</div>
	</div>

	<div class="test-controls">
		<h2>🧪 Connection Tests</h2>
		<div class="button-group">
			<button class="btn btn-primary" on:click={testLocalConnection} disabled={isLoading}>
				🏠 Test Local Connection
			</button>

			<button class="btn btn-secondary" on:click={testWebConnection} disabled={isLoading}>
				🌐 Test Web Connection
			</button>

			<button class="btn btn-success" on:click={testProxyConnection} disabled={isLoading}>
				🔄 Test Proxy Connection
			</button>

			<button class="btn btn-outline" on:click={clearResults} disabled={isLoading}>
				🗑️ Clear Results
			</button>
		</div>

		<div class="diagnostics-section">
			<h3>🔧 Diagnostics & Troubleshooting</h3>
			<div class="diagnostic-controls">
				<button class="btn btn-info" on:click={testNetworkConnectivity} disabled={isLoading}>
					🔍 Network Diagnostics
				</button>

				<button class="btn btn-warning" on:click={toggleCORSCommands}>
					{showCORSCommands ? '🔼' : '🔽'} CORS Configuration
				</button>
			</div>

			{#if showCORSCommands}
				<div class="cors-commands">
					<h4>🔧 CORS Configuration Commands</h4>
					<p class="cors-warning">
						⚠️ <strong>Security Note:</strong> Replace 'admin:admin' with your actual CouchDB admin credentials.
						For production, use specific domain instead of '*' for origins.
					</p>

					<div class="command-box">
						<div class="command-header">
							<span>Run these commands on your CouchDB server:</span>
							<button class="btn btn-small" on:click={() => copyToClipboard(corsCommands)}>
								📋 Copy Commands
							</button>
						</div>
						<pre class="command-text">{corsCommands}</pre>
					</div>

					<div class="alternative-methods">
						<h5>Alternative Configuration Methods:</h5>
						<ul>
							<li>
								<strong>Fauxton Web Interface:</strong> Go to
								<a href="{couchdbConfig.localUrl}_utils/" target="_blank"
									>{couchdbConfig.localUrl}_utils/</a
								> → Configuration → Add CORS settings
							</li>
							<li>
								<strong>Configuration File:</strong> Edit CouchDB config file (usually
								<code>/etc/couchdb/local.ini</code>) and restart service
							</li>
							<li>
								<strong>Proxy Server:</strong> Use a proxy server with CORS headers if direct configuration
								is not possible
							</li>
						</ul>
					</div>
				</div>
			{/if}
		</div>

		<div class="status">
			<strong>Status:</strong>
			<span class="status-text" class:loading={isLoading}>
				{connectionStatus}
			</span>
		</div>
	</div>

	<div class="test-results">
		<h2>📊 Test Results</h2>
		<div class="results-container">
			{#if isLoading}
				<div class="loading-indicator">
					<div class="spinner"></div>
					<span>Running tests...</span>
				</div>
			{/if}

			<pre class="results-text">{testResult ||
					'No tests run yet. Click a test button above to start.'}</pre>
		</div>
	</div>

	<div class="next-steps">
		<h2>�️ Database Setup</h2>
		<div class="database-info">
			<div class="info-box warning">
				<h3>⚠️ Database Creation Required</h3>
				<p>
					The selected database <code>{getDatabaseName(selectedDatabase)}</code> needs to be created
					before we can test full functionality.
				</p>

				<h4>Recommended Database Structure:</h4>
				<ul>
					<li><strong>🧪 {couchdbConfig.databases.test}:</strong> For development and testing</li>
					<li><strong>🏭 {couchdbConfig.databases.production}:</strong> For live teacher data</li>
					<li><strong>💾 {couchdbConfig.databases.backup}:</strong> For automated backups</li>
				</ul>

				<h4>Manual Creation Options:</h4>
				<ol>
					<li>
						<strong>Via Fauxton (Web Interface):</strong><br />
						Visit
						<a href="{couchdbConfig.localUrl}_utils/" target="_blank"
							>{couchdbConfig.localUrl}_utils/</a
						><br />
						Login with <code>{couchdbConfig.username}</code> /
						<code>{couchdbConfig.password}</code><br />
						Create database: <code>{getDatabaseName(selectedDatabase)}</code>
					</li>
					<li>
						<strong>Via HTTP PUT:</strong><br />
						<code>PUT {couchdbConfig.localUrl}{getDatabaseName(selectedDatabase)}</code><br />
						(with Basic Auth credentials)
					</li>
				</ol>
			</div>

			<div class="info-box info">
				<h3>🔍 What We're Testing</h3>
				<ul>
					<li>✅ <strong>Basic Connection:</strong> Can we reach the CouchDB server?</li>
					<li>
						⚠️ <strong>Database Access:</strong> Can we access/create the database? (CORS limited)
					</li>
					<li>
						⚠️ <strong>Document Operations:</strong> Can we read/write documents? (CORS limited)
					</li>
				</ul>
				<p>
					<em
						>Note: CORS restrictions prevent full testing from the browser. A real sync
						implementation would use a different approach.</em
					>
				</p>
			</div>
		</div>
	</div>

	<div class="next-steps">
		<h2>🚀 Next Steps</h2>
		<div class="steps-list">
			<div class="step">
				<strong>1.</strong> Create the databases manually via Fauxton:
				<ul>
					<li>🧪 <code>{couchdbConfig.databases.test}</code> - For development/testing</li>
					<li>🏭 <code>{couchdbConfig.databases.production}</code> - For live teacher data</li>
					<li>💾 <code>{couchdbConfig.databases.backup}</code> - For automated backups</li>
				</ul>
			</div>
			<div class="step">
				<strong>2.</strong> Run connection tests to verify basic connectivity (CORS will still limit
				functionality)
			</div>
			<div class="step">
				<strong>3.</strong> Implement server-side sync or use PouchDB for direct connection
			</div>
			<div class="step">
				<strong>4.</strong> Configure automatic background sync with conflict resolution
			</div>
		</div>
	</div>

	<div class="diagnostics">
		<h2>🛠️ Diagnostics & Helpers</h2>
		<div class="info-box">
			<h3>🔧 CORS Configuration Helper</h3>
			<p>Use the following commands to configure CORS on your CouchDB server:</p>

			<pre class="cors-commands">{corsCommands}</pre>

			<button class="btn btn-secondary" on:click={toggleCORSCommands} disabled={isLoading}>
				{showCORSCommands ? '🔽 Hide CORS Commands' : '▶️ Show CORS Commands'}
			</button>

			<button
				class="btn btn-primary"
				on:click={() => copyToClipboard(corsCommands)}
				disabled={isLoading || !corsCommands}
			>
				📋 Copy CORS Commands
			</button>
		</div>

		<div class="info-box">
			<h3>🌐 Network Connectivity Test</h3>
			<p>Check basic network connectivity to the CouchDB server:</p>

			<button class="btn btn-primary" on:click={testNetworkConnectivity} disabled={isLoading}>
				🔍 Test Network Connectivity
			</button>
		</div>
	</div>
</div>

<style>
	.couchdb-test {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	h1 {
		color: #1f2937;
		margin-bottom: 2rem;
		text-align: center;
	}

	h2 {
		color: #374151;
		margin-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
		padding-bottom: 0.5rem;
	}

	.connection-info,
	.test-controls,
	.test-results,
	.next-steps,
	.diagnostics {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.config-display {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.config-item {
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e9ecef;
	}

	.proxy-note {
		font-size: 0.8rem;
		color: #6c757d;
		font-style: italic;
	}

	.db-selector {
		margin-left: 0.5rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		background: white;
		font-size: 0.875rem;
	}

	.db-selector:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #10b981;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #059669;
	}

	.btn-success {
		background: #28a745;
		color: white;
	}

	.btn-success:hover:not(:disabled) {
		background: #218838;
	}

	.btn-outline {
		background: transparent;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover:not(:disabled) {
		background: #f9fafb;
	}

	.status {
		padding: 1rem;
		background: #f0f9ff;
		border: 1px solid #0ea5e9;
		border-radius: 6px;
	}

	.status-text {
		color: #0369a1;
		font-weight: 500;
	}

	.status-text.loading {
		color: #d97706;
	}

	.results-container {
		position: relative;
		min-height: 200px;
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		color: #d97706;
		font-weight: 500;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #fed7aa;
		border-top: 2px solid #d97706;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.results-text {
		background: #1f2937;
		color: #f9fafb;
		padding: 1.5rem;
		border-radius: 6px;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-x: auto;
		white-space: pre-wrap;
		min-height: 150px;
	}

	.steps-list {
		display: grid;
		gap: 1rem;
	}

	.step {
		padding: 1rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 6px;
		border-left: 4px solid #10b981;
	}

	.database-info {
		display: grid;
		gap: 1.5rem;
	}

	.info-box {
		padding: 1.5rem;
		border-radius: 8px;
		border-left: 4px solid;
	}

	.info-box.warning {
		background: #fffbeb;
		border-left-color: #f59e0b;
		border: 1px solid #fed7aa;
	}

	.info-box.warning h3 {
		color: #92400e;
		margin-bottom: 1rem;
	}

	.info-box.info {
		background: #eff6ff;
		border-left-color: #3b82f6;
		border: 1px solid #bfdbfe;
	}

	.info-box.info h3 {
		color: #1e40af;
		margin-bottom: 1rem;
	}

	.info-box code {
		background: rgba(0, 0, 0, 0.1);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
	}

	.info-box a {
		color: #3b82f6;
		text-decoration: underline;
	}

	.info-box a:hover {
		color: #1e40af;
	}

	.info-box ol,
	.info-box ul {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	.info-box li {
		margin-bottom: 0.5rem;
	}

	.diagnostics {
		background: #f9fafb;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #d1d5db;
	}

	.cors-commands {
		background: #1f2937;
		color: #f9fafb;
		padding: 1rem;
		border-radius: 6px;
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-x: auto;
		white-space: pre-wrap;
		margin-bottom: 1rem;
	}

	/* Enhanced Diagnostics Section */
	.diagnostics-section {
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1rem 0;
	}

	.diagnostics-section h3 {
		margin: 0 0 1rem 0;
		color: #495057;
	}

	.diagnostic-controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.btn-info {
		background: #17a2b8;
		color: white;
	}

	.btn-info:hover {
		background: #138496;
	}

	.btn-warning {
		background: #ffc107;
		color: #212529;
	}

	.btn-warning:hover {
		background: #e0a800;
	}

	.btn-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}

	/* CORS Commands Enhancement */
	.cors-commands {
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 1rem;
		color: inherit;
	}

	.cors-commands h4 {
		margin: 0 0 1rem 0;
		color: #495057;
	}

	.cors-warning {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 1rem;
		color: #856404;
	}

	.command-box {
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.command-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #e9ecef;
		border-bottom: 1px solid #dee2e6;
		border-radius: 8px 8px 0 0;
		font-weight: 500;
	}

	.command-text {
		padding: 1rem;
		margin: 0;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		line-height: 1.4;
		background: #ffffff;
		border: none;
		overflow-x: auto;
		white-space: pre;
		color: #212529;
	}

	.alternative-methods {
		background: #e7f3ff;
		border: 1px solid #b3d9ff;
		border-radius: 8px;
		padding: 1rem;
	}

	.alternative-methods h5 {
		margin: 0 0 0.5rem 0;
		color: #0056b3;
	}

	.alternative-methods ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.alternative-methods li {
		margin-bottom: 0.5rem;
	}

	.alternative-methods a {
		color: #0056b3;
		text-decoration: none;
	}

	.alternative-methods a:hover {
		text-decoration: underline;
	}

	.alternative-methods code {
		background: #f1f3f4;
		padding: 0.125rem 0.25rem;
		border-radius: 3px;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.couchdb-test {
			padding: 1rem;
		}

		.config-display {
			grid-template-columns: 1fr;
		}

		.button-group,
		.diagnostic-controls {
			flex-direction: column;
		}

		.command-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
