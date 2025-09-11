// Enhanced Hybrid Database Implementation: localStorage + CouchDB Sync
// Supports offline-first with CouchDB sync when available

// CouchDB Configuration für direkte Verbindung
const couchdbConfig = {
	localUrl: 'http://157.247.1.102:5984/',
	webUrl: 'https://couchdb.ettingshaus14.synology.me',
	username: 'Lehrer',
	password: 'jenAplan',
	databases: {
		test: 'foerderplan-test',
		production: 'foerderplan',
		backup: 'foerderplan-backup'
	}
};

// Environment-spezifische Konfiguration
export const getCurrentEnvironment = (): 'test' | 'production' | 'backup' => {
	if (typeof window !== 'undefined') {
		const hostname = window.location.hostname;
		if (hostname === 'localhost' || hostname === '127.0.0.1') {
			return 'test';
		}
	}
	return 'production';
};

interface DatabaseConfig {
	localName: string;
	environment?: 'test' | 'production' | 'backup';
	useCouchDB?: boolean;
	autoSync?: boolean;
}

// Database mode
type DatabaseMode = 'localStorage' | 'couchdb' | 'hybrid';

// Singleton instance
let hybridManagerInstance: HybridDatabaseManager | null = null;

export class HybridDatabaseManager {
	private localStoragePrefix!: string;
	private couchdbManager: any = null; // Changed from CouchDBSyncManager to any
	private config!: DatabaseConfig;
	private mode: DatabaseMode = 'localStorage';
	private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
	private syncStatus: 'idle' | 'syncing' | 'error' | 'connected' | 'disconnected' = 'idle';
	private onlineHandler = () => this.handleOnlineStatus(true);
	private offlineHandler = () => this.handleOnlineStatus(false);
	private syncCallbacks: ((status: string) => void)[] = [];

	constructor(config: DatabaseConfig) {
		// Prevent multiple instances
		if (hybridManagerInstance) {
			console.log('💡 Returning existing HybridDatabaseManager instance');
			return hybridManagerInstance;
		}
		
		this.config = config;
		this.localStoragePrefix = `foerderplan_${config.localName}_`;

		// Setup online/offline detection
		if (typeof window !== 'undefined') {
			window.addEventListener('online', this.onlineHandler);
			window.addEventListener('offline', this.offlineHandler);
		}

		// Try to initialize CouchDB if enabled
		if (config.useCouchDB) {
			this.initializeCouchDB();
		}
		
		// Store singleton instance
		hybridManagerInstance = this;
	}
	
	// Static method to reset singleton (useful for testing or mode changes)
	static resetInstance(): void {
		hybridManagerInstance = null;
	}

	private async initializeCouchDB() {
		try {
			// Dynamically import CouchDBSyncManager to avoid import issues
			console.log('🔄 Loading CouchDBSyncManager...');
			const { CouchDBSyncManager } = await import('./couchdbSync.js');
			
			const environment = this.config.environment || getCurrentEnvironment();
			console.log('🔄 Creating CouchDBSyncManager instance...');
			this.couchdbManager = new CouchDBSyncManager(couchdbConfig, environment);
			
			// Initialize the CouchDBSyncManager (loads PouchDB and sets up databases)
			console.log('🔄 Initializing CouchDBSyncManager...');
			await this.couchdbManager.initialize();

			// Test connection
			console.log('🔄 Testing CouchDB connection...');
			const connectionTest = await this.couchdbManager.testConnection();
			if (connectionTest.success) {
				this.mode = 'hybrid';
				this.syncStatus = 'connected';
				console.log('✅ CouchDB connection established');

				// Start automatic sync if enabled
				if (this.config.autoSync) {
					await this.startSync();
				}
			} else {
				console.warn(
					'⚠️ CouchDB connection failed, using localStorage only:',
					connectionTest.error
				);
				this.mode = 'localStorage';
				this.syncStatus = 'disconnected';
			}
		} catch (error) {
			console.error('❌ Failed to initialize CouchDB:', error);
			this.mode = 'localStorage';
			this.syncStatus = 'error';
			this.couchdbManager = null;
		}

		this.notifySyncCallbacks();
	}

	private async startSync() {
		if (this.couchdbManager && this.isOnline) {
			try {
				this.syncStatus = 'syncing';
				this.notifySyncCallbacks();

				await this.couchdbManager.startSync({
					live: true,
					retry: true,
					continuous: true,
					heartbeat: 10000,
					timeout: 30000
				});

				this.syncStatus = 'connected';
				console.log('🔄 CouchDB sync started');
			} catch (error) {
				console.error('❌ Sync failed:', error);
				this.syncStatus = 'error';
			}

			this.notifySyncCallbacks();
		}
	}

	private async stopSync() {
		if (this.couchdbManager) {
			await this.couchdbManager.stopSync();
			this.syncStatus = 'idle';
			console.log('⏸️ CouchDB sync stopped');
			this.notifySyncCallbacks();
		}
	}

	private handleOnlineStatus(online: boolean) {
		this.isOnline = online;

		if (online && this.couchdbManager && this.config.autoSync) {
			console.log('🌐 Back online - resuming sync');
			this.startSync();
		} else if (!online) {
			console.log('📴 Offline - sync paused');
			this.syncStatus = 'disconnected';
			this.notifySyncCallbacks();
		}
	}

	// Public API methods
	async put(doc: any): Promise<any> {
		const docWithId = { ...doc, _id: doc._id || this.generateId() };

		// Always save to localStorage first (offline-first)
		this.saveToLocalStorage(docWithId._id, docWithId);

		// Try to save to CouchDB if available
		if (this.mode === 'hybrid' && this.couchdbManager) {
			try {
				const result = await this.couchdbManager.put(docWithId);
				return result;
			} catch (error) {
				console.warn('⚠️ CouchDB save failed, data saved locally:', error);
				return { id: docWithId._id, ok: true, rev: 'local-' + Date.now() };
			}
		}

		return { id: docWithId._id, ok: true, rev: 'local-' + Date.now() };
	}

	async get(id: string): Promise<any> {
		// Try CouchDB first if available
		if (this.mode === 'hybrid' && this.couchdbManager) {
			try {
				return await this.couchdbManager.get(id);
			} catch (error) {
				console.warn('⚠️ CouchDB get failed, trying localStorage:', error);
			}
		}

		// Fallback to localStorage
		const localData = this.getFromLocalStorage(id);
		if (localData) {
			return localData;
		}

		throw new Error(`Document not found: ${id}`);
	}

	async allDocs(options: any = {}): Promise<any> {
		// Try CouchDB first if available
		if (this.mode === 'hybrid' && this.couchdbManager) {
			try {
				return await this.couchdbManager.allDocs(options);
			} catch (error) {
				console.warn('⚠️ CouchDB allDocs failed, using localStorage:', error);
			}
		}

		// Fallback to localStorage
		return this.getAllFromLocalStorage();
	}

	async remove(doc: any): Promise<any> {
		// Remove from localStorage
		this.removeFromLocalStorage(doc._id);

		// Try to remove from CouchDB if available
		if (this.mode === 'hybrid' && this.couchdbManager) {
			try {
				return await this.couchdbManager.remove(doc);
			} catch (error) {
				console.warn('⚠️ CouchDB remove failed, removed locally:', error);
				return { id: doc._id, ok: true, rev: doc._rev };
			}
		}

		return { id: doc._id, ok: true, rev: doc._rev };
	}

	// Sync control methods
	async enableCouchDBSync(): Promise<boolean> {
		if (!this.couchdbManager) {
			this.config.useCouchDB = true;
			await this.initializeCouchDB();
		}

		if (this.couchdbManager) {
			this.config.autoSync = true;
			await this.startSync();
			return true;
		}

		return false;
	}

	async disableCouchDBSync(): Promise<void> {
		this.config.autoSync = false;
		await this.stopSync();
		this.mode = 'localStorage';
		this.syncStatus = 'idle';
		this.notifySyncCallbacks();
	}

	async manualSync(): Promise<boolean> {
		if (!this.couchdbManager) {
			console.warn('⚠️ CouchDB not available for manual sync');
			return false;
		}

		try {
			this.syncStatus = 'syncing';
			this.notifySyncCallbacks();

			// First, push any localStorage data that might not be synced
			await this.syncLocalStorageData();

			// Then perform a full sync
			const pushResult = await this.couchdbManager.pushToRemote();
			const pullResult = await this.couchdbManager.pullFromRemote();

			console.log('✅ Manual sync completed:', { pushResult, pullResult });
			
			this.syncStatus = 'connected';
			this.notifySyncCallbacks();
			return true;
		} catch (error) {
			console.error('❌ Manual sync failed:', error);
			this.syncStatus = 'error';
			this.notifySyncCallbacks();
			return false;
		}
	}

	// Sync all localStorage data to CouchDB with conflict resolution
	async syncLocalStorageData(): Promise<void> {
		if (!this.couchdbManager || typeof localStorage === 'undefined') {
			return;
		}

		console.log('🔄 Syncing localStorage data to CouchDB...');
		
		const syncPromises = [];
		let itemCount = 0;
		
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			// Look for all foerderplan keys, not just our specific prefix
			if (key && key.startsWith('foerderplan_')) {
				try {
					const value = localStorage.getItem(key);
					if (value) {
						const doc = JSON.parse(value);
						
						// Skip invalid documents
						if (!doc || typeof doc !== 'object') {
							console.warn(`⚠️ Skipping invalid document in ${key}`);
							continue;
						}
						
						// Clean up the document ID properly
						let docId = this.cleanDocumentId(key, doc);
						
						// Skip if we can't determine a valid document ID
						if (!docId || docId === key) {
							console.warn(`⚠️ Skipping document with invalid ID: ${key}`);
							continue;
						}
						
						// Ensure the document has a clean _id
						doc._id = docId;
						
						console.log(`🔄 Preparing to sync: localStorage key="${key}" -> docId="${docId}"`);

						// Push to CouchDB with conflict resolution
						syncPromises.push(
							this.syncDocumentWithConflictResolution(doc, docId)
								.catch(error => {
									console.warn(`⚠️ Skipped problematic document ${docId}:`, error);
									// Don't fail the entire sync for one bad document
								})
						);
						itemCount++;
					}
				} catch (error) {
					console.warn(`⚠️ Failed to parse localStorage item ${key}:`, error);
				}
			}
		}

		await Promise.all(syncPromises);
		console.log(`✅ Processed ${itemCount} localStorage items for CouchDB sync`);
	}

	// Helper method to clean up document IDs from localStorage keys
	private cleanDocumentId(localStorageKey: string, doc: any): string {
		// First, try to extract from localStorage key
		let docId = localStorageKey;
		
		// Remove various possible prefixes
		docId = docId.replace(/^foerderplan_/, '');
		docId = docId.replace(/^foerderplan-local_/, '');
		docId = docId.replace(/^[^_]*_/, ''); // Remove any remaining prefix before first underscore
		
		// If document already has an _id, prefer it if it's cleaner
		if (doc._id && !doc._id.includes('foerderplan_') && !doc._id.includes('foerderplan-local_')) {
			docId = doc._id;
		}
		
		// Final cleanup: ensure we have a clean ID
		if (docId.includes('foerderplan_') || docId.includes('foerderplan-local_')) {
			// Extract the meaningful part (usually after the last underscore before timestamp)
			const parts = docId.split('_');
			// Look for assessment IDs, current-foerderplan, student-list, etc.
			for (let i = parts.length - 1; i >= 0; i--) {
				const part = parts.slice(i).join('_');
				if (part.startsWith('assessment-') || 
					part === 'current-foerderplan' || 
					part === 'student-list' ||
					part.match(/^[a-zA-Z-]+\d/)) { // IDs that start with letters and contain numbers
					docId = part;
					break;
				}
			}
		}
		
		console.log(`📝 Cleaned document ID: "${localStorageKey}" -> "${docId}"`);
		return docId;
	}

	// Helper method to sync a single document with conflict resolution
	private async syncDocumentWithConflictResolution(doc: any, docId: string): Promise<void> {
		if (!this.couchdbManager) return;
		
		try {
			// Clean the document first
			const cleanDoc = { ...doc, _id: docId };
			delete cleanDoc._rev; // Remove any stale revision info
			
			// First, check if document exists in CouchDB
			let existingDoc = null;
			try {
				existingDoc = await this.couchdbManager.get(docId);
			} catch (error: any) {
				if (error.status !== 404) {
					// Real error, not just "document not found"
					throw error;
				}
				// Document doesn't exist - this is OK
			}
			
			if (existingDoc) {
				// Document exists - update it with correct revision
				const updatedDoc = {
					...cleanDoc,
					_rev: existingDoc._rev
				};
				
				try {
					await this.couchdbManager.put(updatedDoc);
					console.log(`✅ Updated existing document: ${docId}`);
				} catch (conflictError: any) {
					if (conflictError.status === 409) {
						// Still conflict - try one more time with fresh revision
						console.log(`⚠️ Conflict persists for ${docId}, attempting force sync...`);
						await this.forceSync(docId, cleanDoc);
					} else {
						throw conflictError;
					}
				}
			} else {
				// Document doesn't exist - create new one
				await this.couchdbManager.put(cleanDoc);
				console.log(`✅ Created new document: ${docId}`);
			}
		} catch (error: any) {
			console.error(`❌ Failed to update ${docId}:`, error);
			// Don't throw - continue with other documents
		}
	}

	// Force sync with multiple retry attempts
	private async forceSync(docId: string, doc: any, maxRetries: number = 3): Promise<void> {
		if (!this.couchdbManager) return;
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Get fresh revision each time
				const existingDoc = await this.couchdbManager.get(docId);
				const updatedDoc = {
					...doc,
					_id: docId,
					_rev: existingDoc._rev
				};
				
				await this.couchdbManager.put(updatedDoc);
				console.log(`✅ Force synced document: ${docId} (attempt ${attempt})`);
				return;
			} catch (error: any) {
				if (error.status === 409 && attempt < maxRetries) {
					console.log(`⚠️ Force sync attempt ${attempt} failed for ${docId}, retrying...`);
					// Wait a bit before retry
					await new Promise(resolve => setTimeout(resolve, 100 * attempt));
					continue;
				} else {
					console.error(`❌ Force sync failed for ${docId}:`, error);
					break;
				}
			}
		}
	}

	// Status and callback methods
	getSyncStatus(): string {
		return this.syncStatus;
	}

	getMode(): DatabaseMode {
		return this.mode;
	}

	onSyncStatusChange(callback: (status: string) => void): void {
		this.syncCallbacks.push(callback);
	}

	private notifySyncCallbacks(): void {
		this.syncCallbacks.forEach((callback) => {
			try {
				callback(this.syncStatus);
			} catch (error) {
				console.error('Sync callback error:', error);
			}
		});
	}

	// LocalStorage helper methods
	private saveToLocalStorage(id: string, data: any): void {
		if (typeof localStorage === 'undefined') return;

		try {
			localStorage.setItem(this.localStoragePrefix + id, JSON.stringify(data));
		} catch (error) {
			console.error('LocalStorage save failed:', error);
		}
	}

	private getFromLocalStorage(id: string): any | null {
		if (typeof localStorage === 'undefined') return null;

		try {
			const data = localStorage.getItem(this.localStoragePrefix + id);
			return data ? JSON.parse(data) : null;
		} catch (error) {
			console.error('LocalStorage get failed:', error);
			return null;
		}
	}

	private removeFromLocalStorage(id: string): void {
		if (typeof localStorage === 'undefined') return;

		try {
			localStorage.removeItem(this.localStoragePrefix + id);
		} catch (error) {
			console.error('LocalStorage remove failed:', error);
		}
	}

	private getAllFromLocalStorage(): any {
		if (typeof localStorage === 'undefined') {
			return { total_rows: 0, offset: 0, rows: [] };
		}

		const docs: any[] = [];
		const prefix = this.localStoragePrefix;

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(prefix)) {
				try {
					const data = localStorage.getItem(key);
					if (data) {
						const doc = JSON.parse(data);
						docs.push({ id: doc._id, doc });
					}
				} catch (error) {
					console.error('Failed to parse localStorage document:', error);
				}
			}
		}

		return {
			total_rows: docs.length,
			offset: 0,
			rows: docs
		};
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	// Cleanup
	destroy(): void {
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.onlineHandler);
			window.removeEventListener('offline', this.offlineHandler);
		}

		if (this.couchdbManager) {
			this.stopSync();
		}

		this.syncCallbacks = [];
	}
}
