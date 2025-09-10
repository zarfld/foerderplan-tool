// Enhanced Hybrid Database Implementation: localStorage + CouchDB Sync
// Supports offline-first with CouchDB sync when available

import { CouchDBSyncManager } from './couchdbSync.js';

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

export class HybridDatabaseManager {
	private localStoragePrefix: string;
	private couchdbManager: CouchDBSyncManager | null = null;
	private config: DatabaseConfig;
	private mode: DatabaseMode = 'localStorage';
	private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
	private syncStatus: 'idle' | 'syncing' | 'error' | 'connected' | 'disconnected' = 'idle';
	private onlineHandler = () => this.handleOnlineStatus(true);
	private offlineHandler = () => this.handleOnlineStatus(false);
	private syncCallbacks: ((status: string) => void)[] = [];
	
	constructor(config: DatabaseConfig) {
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
	}

	private async initializeCouchDB() {
		try {
			const environment = this.config.environment || getCurrentEnvironment();
			this.couchdbManager = new CouchDBSyncManager(couchdbConfig, environment);
			
			// Test connection
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
				console.warn('⚠️ CouchDB connection failed, using localStorage only:', connectionTest.error);
				this.mode = 'localStorage';
				this.syncStatus = 'disconnected';
			}
		} catch (error) {
			console.error('❌ Failed to initialize CouchDB:', error);
			this.mode = 'localStorage';
			this.syncStatus = 'error';
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
		if (this.couchdbManager) {
			try {
				await this.couchdbManager.startSync();
				return true;
			} catch (error) {
				console.error('❌ Manual sync failed:', error);
				return false;
			}
		}
		return false;
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
		this.syncCallbacks.forEach(callback => {
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
