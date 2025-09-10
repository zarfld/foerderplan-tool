<script lang="ts">
	import { onMount } from 'svelte';
	import { initDB } from '../utils/database.js';

	let syncStatus = 'initializing';
	let dbMode = 'unknown';
	let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
	let db: any = null;

	onMount(() => {
		// Initialize database asynchronously
		initDB().then((database) => {
			db = database;
			syncStatus = db.getSyncStatus();
			dbMode = db.getMode();
		});

		// Setup online/offline detection
		if (typeof window !== 'undefined') {
			const updateOnlineStatus = () => {
				isOnline = navigator.onLine;
			};

			window.addEventListener('online', updateOnlineStatus);
			window.addEventListener('offline', updateOnlineStatus);

			// Return cleanup function
			return () => {
				window.removeEventListener('online', updateOnlineStatus);
				window.removeEventListener('offline', updateOnlineStatus);
			};
		}
	});

	function getStatusIcon() {
		if (!isOnline) return '📴';

		switch (syncStatus) {
			case 'connected':
				return '🟢';
			case 'syncing':
				return '🔄';
			case 'error':
				return '🔴';
			case 'disconnected':
				return '🟡';
			case 'localStorage':
				return '💾';
			default:
				return '⚪';
		}
	}

	function getStatusText() {
		if (!isOnline) return 'Offline';

		switch (syncStatus) {
			case 'connected':
				return 'CouchDB verbunden';
			case 'syncing':
				return 'Synchronisiert...';
			case 'error':
				return 'Sync-Fehler';
			case 'disconnected':
				return 'CouchDB getrennt';
			case 'localStorage':
				return 'Lokal gespeichert';
			default:
				return 'Initialisiert...';
		}
	}

	function getModeText() {
		switch (dbMode) {
			case 'hybrid':
				return 'Hybrid (Lokal + CouchDB)';
			case 'couchdb':
				return 'CouchDB';
			case 'localStorage':
				return 'LocalStorage';
			default:
				return 'Unbekannt';
		}
	}
</script>

<div class="sync-status">
	<div class="status-indicator">
		<span class="status-icon">{getStatusIcon()}</span>
		<span class="status-text">{getStatusText()}</span>
	</div>

	<div class="mode-info">
		<small>Modus: {getModeText()}</small>
	</div>
</div>

<style>
	.sync-status {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-icon {
		font-size: 1rem;
	}

	.status-text {
		font-weight: 500;
		color: #495057;
	}

	.mode-info {
		color: #6c757d;
	}

	.mode-info small {
		font-size: 0.75rem;
	}
</style>
