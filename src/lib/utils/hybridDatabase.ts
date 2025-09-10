// Hybrid Database Implementation: localStorage + CouchDB Sync
// Supports offline-first with NAS sync when available

// For now, we'll use a simple localStorage implementation
// Later this can be enhanced with actual PouchDB

interface DatabaseConfig {
	localName: string;
	remoteCouchDB?: string;
	autoSync?: boolean;
}

// Simple mock of PouchDB interface for localStorage
interface MockPouchDB {
	put(doc: any): Promise<any>;
	get(id: string): Promise<any>;
	allDocs(options?: any): Promise<any>;
	remove(doc: any): Promise<any>;
	find?(request: any): Promise<any>;
	sync?(remote: any, options?: any): any;
	info?(): Promise<any>;
}

class HybridDatabase {
	private localDB: MockPouchDB;
	private remoteDB: MockPouchDB | null = null;
	private syncHandler: any = null;
	private config: DatabaseConfig;
	private isOnline: boolean = navigator.onLine;
	private syncStatus: 'idle' | 'syncing' | 'error' | 'paused' = 'idle';
	private onlineHandler = () => this.handleOnlineStatus(true);
	private offlineHandler = () => this.handleOnlineStatus(false);
	
	constructor(config: DatabaseConfig) {
		this.config = config;
		
		// Initialize local mock database (localStorage-based)
		this.localDB = this.createLocalDB(config.localName);
		
		// Try to connect to remote CouchDB (Synology NAS)
		if (config.remoteCouchDB) {
			this.setupRemoteSync(config.remoteCouchDB);
		}
		
		// Listen for online/offline events
		window.addEventListener('online', this.onlineHandler);
		window.addEventListener('offline', this.offlineHandler);
	}
	
	private createLocalDB(name: string): MockPouchDB {
		const prefix = `${name}_`;
		
		return {
			async put(doc: any) {
				const key = prefix + doc._id;
				const docWithRev = {
					...doc,
					_rev: doc._rev || `1-${Date.now()}`
				};
				localStorage.setItem(key, JSON.stringify(docWithRev));
				return { ok: true, id: doc._id, rev: docWithRev._rev };
			},
			
			async get(id: string) {
				const key = prefix + id;
				const doc = localStorage.getItem(key);
				if (!doc) throw new Error('Document not found');
				return JSON.parse(doc);
			},
			
			async allDocs(options: any = {}) {
				const keys = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key?.startsWith(prefix)) {
						keys.push(key);
					}
				}
				
				const rows = keys.map(key => {
					const doc = JSON.parse(localStorage.getItem(key) || '{}');
					return {
						id: doc._id,
						key: doc._id,
						value: { rev: doc._rev },
						doc: options.include_docs ? doc : undefined
					};
				});
				
				return {
					total_rows: rows.length,
					offset: 0,
					rows
				};
			},
			
			async remove(doc: any) {
				const key = prefix + doc._id;
				localStorage.removeItem(key);
				return { ok: true, id: doc._id, rev: doc._rev };
			},
			
			async find(request: any) {
				// Simple implementation for basic queries
				const allDocsResult = await this.allDocs({ include_docs: true });
				return {
					docs: allDocsResult.rows.map(row => row.doc).filter(Boolean)
				};
			}
		};
	}
	
	private async setupRemoteSync(remoteUrl: string) {
		try {
			// For now, just simulate remote connection
			console.log('⚠️ Remote sync will be implemented later:', remoteUrl);
			// TODO: Implement actual CouchDB connection when PouchDB is properly configured
		} catch (error) {
			console.warn('⚠️ Could not connect to remote CouchDB:', error);
			console.log('📱 Running in offline-only mode');
		}
	}
	
	private startSync() {
		// TODO: Implement actual sync when PouchDB is available
		console.log('🔄 Sync functionality will be implemented later');
	}
	
	private stopSync() {
		if (this.syncHandler) {
			// TODO: Cancel sync when implemented
			this.syncHandler = null;
			this.syncStatus = 'idle';
		}
	}
	
	private handleOnlineStatus(online: boolean) {
		this.isOnline = online;
		
		if (online && this.remoteDB && this.config.autoSync) {
			console.log('🌐 Back online - resuming sync');
			this.startSync();
		} else if (!online) {
			console.log('📱 Gone offline - sync paused');
			this.stopSync();
		}
	}
	
	// Standard PouchDB interface - always works locally
	async put(doc: any) {
		return await this.localDB.put(doc);
	}
	
	async get(id: string) {
		return await this.localDB.get(id);
	}
	
	async allDocs(options: any = {}) {
		return await this.localDB.allDocs({ include_docs: true, ...options });
	}
	
	async remove(doc: any) {
		return await this.localDB.remove(doc);
	}
	
	async find(request: any) {
		if (this.localDB.find) {
			return await this.localDB.find(request);
		}
		// Fallback implementation
		const allDocs = await this.localDB.allDocs({ include_docs: true });
		return {
			docs: allDocs.rows.map((row: any) => row.doc).filter(Boolean)
		};
	}
	
	// Sync control methods
	async manualSync(): Promise<boolean> {
		if (!this.remoteDB) {
			console.warn('No remote database configured - sync will be implemented later');
			return false;
		}
		
		try {
			// TODO: Implement actual sync
			console.log('✅ Manual sync will be implemented later');
			return true;
		} catch (error) {
			console.error('❌ Manual sync failed:', error);
			return false;
		}
	}
	
	enableAutoSync() {
		this.config.autoSync = true;
		if (this.isOnline && this.remoteDB) {
			this.startSync();
		}
	}
	
	disableAutoSync() {
		this.config.autoSync = false;
		this.stopSync();
	}
	
	// Status methods
	getSyncStatus() {
		return {
			status: this.syncStatus,
			isOnline: this.isOnline,
			hasRemote: !!this.remoteDB,
			autoSync: this.config.autoSync
		};
	}
	
	async getLocalDocCount(): Promise<number> {
		const result = await this.localDB.allDocs();
		return result.total_rows;
	}
	
	async getRemoteDocCount(): Promise<number> {
		if (!this.remoteDB) return -1;
		try {
			const result = await this.remoteDB.allDocs();
			return result.total_rows;
		} catch {
			return -1;
		}
	}
	
	// Cleanup
	destroy() {
		this.stopSync();
		window.removeEventListener('online', this.onlineHandler);
		window.removeEventListener('offline', this.offlineHandler);
	}
}

// Database instance management
let hybridDB: HybridDatabase | null = null;

export async function initHybridDB(config?: Partial<DatabaseConfig>): Promise<HybridDatabase> {
	if (hybridDB) {
		return hybridDB;
	}
	
	const defaultConfig: DatabaseConfig = {
		localName: 'foerderplan-local',
		remoteCouchDB: undefined, // Will be set via environment or settings
		autoSync: true
	};
	
	// Check for Synology NAS configuration
	const nasUrl = localStorage.getItem('nas-couchdb-url');
	if (nasUrl) {
		defaultConfig.remoteCouchDB = nasUrl;
	}
	
	hybridDB = new HybridDatabase({ ...defaultConfig, ...config });
	
	console.log('🚀 Hybrid database initialized');
	return hybridDB;
}

export async function getHybridDB(): Promise<HybridDatabase> {
	if (!hybridDB) {
		return await initHybridDB();
	}
	return hybridDB;
}

// Configuration helpers
export function setNASUrl(url: string) {
	localStorage.setItem('nas-couchdb-url', url);
	console.log('💾 NAS URL saved:', url);
}

export function getNASUrl(): string | null {
	return localStorage.getItem('nas-couchdb-url');
}

export function clearNASUrl() {
	localStorage.removeItem('nas-couchdb-url');
	console.log('🗑️ NAS URL cleared');
}

// Legacy compatibility - update existing database.ts functions
export async function initDB(): Promise<any> {
	return await getHybridDB();
}

export async function saveData(database: any, id: string, data: any): Promise<void> {
	const doc = {
		_id: id,
		...data,
		timestamp: new Date().toISOString()
	};
	
	try {
		// Try to get existing document for revision
		const existing = await database.get(id);
		doc._rev = existing._rev;
	} catch {
		// Document doesn't exist, that's ok
	}
	
	await database.put(doc);
}

export async function loadData(database: any, id: string): Promise<any> {
	try {
		const doc = await database.get(id);
		const { _id, _rev, timestamp, ...data } = doc;
		return data;
	} catch {
		return null;
	}
}
