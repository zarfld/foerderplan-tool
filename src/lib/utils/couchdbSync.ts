// CouchDB Sync Database - Real PouchDB with CouchDB synchronization
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// Global flag to track if PouchDB is loaded
let pouchDBLoaded = false;
let PouchDBConstructor: any = null;

// Function to load PouchDB with improved fallback strategy
async function ensurePouchDBLoaded() {
	if (pouchDBLoaded && PouchDBConstructor) return PouchDBConstructor;
	
	// Strategy 1: Check for existing global PouchDB first (CDN priority)
	if (typeof window !== 'undefined' && (window as any).PouchDB) {
		PouchDBConstructor = (window as any).PouchDB;
		pouchDBLoaded = true;
		console.log('✅ Using existing global PouchDB');
		return PouchDBConstructor;
	}
	
	// Strategy 2: Load from CDN (most reliable in production)
	try {
		console.log('🔄 Loading PouchDB from CDN...');
		return new Promise((resolve, reject) => {
			if (typeof window === 'undefined') {
				reject(new Error('Cannot load CDN PouchDB in non-browser environment'));
				return;
			}
			
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js';
			script.onload = () => {
				if ((window as any).PouchDB) {
					PouchDBConstructor = (window as any).PouchDB;
					pouchDBLoaded = true;
					console.log('✅ PouchDB loaded from CDN');
					resolve(PouchDBConstructor);
				} else {
					reject(new Error('PouchDB not available after CDN load'));
				}
			};
			script.onerror = () => {
				console.warn('⚠️ CDN loading failed, trying bundled version...');
				// Fallback to bundled version
				loadBundledPouchDB()
					.then(resolve)
					.catch(reject);
			};
			document.head.appendChild(script);
		});
		
	} catch (cdnError) {
		console.warn('⚠️ CDN loading failed:', cdnError);
		return loadBundledPouchDB();
	}
}

// Separate function for bundled PouchDB loading
async function loadBundledPouchDB() {
	try {
		console.log('🔄 Attempting bundled PouchDB...');
		// First, try to use the bundled version
		const pouchDBModule = await import('pouchdb');
		PouchDBConstructor = pouchDBModule.default || pouchDBModule;
		
		// Test if the constructor works properly
		if (typeof PouchDBConstructor !== 'function') {
			throw new Error('PouchDB constructor is not a function');
		}
		
		// Try to load adapters
		try {
			const [httpAdapter, idbAdapter] = await Promise.all([
				import('pouchdb-adapter-http'),
				import('pouchdb-adapter-idb')
			]);
			
			PouchDBConstructor.plugin(httpAdapter.default || httpAdapter);
			PouchDBConstructor.plugin(idbAdapter.default || idbAdapter);
			console.log('✅ PouchDB loaded with adapters');
		} catch (adapterError) {
			console.warn('⚠️ PouchDB loaded but adapters failed:', adapterError);
			console.log('📡 Continuing with basic PouchDB (HTTP adapter might still work)');
		}
		
		// Test creating a simple database to ensure it works
		try {
			const testDb = new PouchDBConstructor('connection-test', { adapter: 'memory' });
			await testDb.info();
			await testDb.destroy();
			console.log('✅ PouchDB constructor test passed');
		} catch (testError) {
			console.error('❌ PouchDB constructor test failed:', testError);
			throw new Error('PouchDB constructor test failed: ' + testError.message);
		}
		
		pouchDBLoaded = true;
		return PouchDBConstructor;
		
	} catch (bundleError) {
		console.error('❌ Bundled PouchDB failed:', bundleError);
		throw new Error('All PouchDB loading strategies failed');
	}
}

export interface CouchDBConfig {
	localUrl: string;
	webUrl: string;
	username: string;
	password: string;
	databases: {
		test: string;
		production: string;
		backup: string;
	};
}

export interface SyncOptions {
	live: boolean;
	retry: boolean;
	continuous: boolean;
	heartbeat: number;
	timeout: number;
}

export class CouchDBSyncManager {
	private localDB: any;
	private remoteDB: any;
	private config: CouchDBConfig;
	private currentDatabase: string;
	private syncHandler: any;
	private isOnline: boolean = navigator.onLine;
	private PouchDBConstructor: any = null;

	constructor(config: CouchDBConfig, environment: 'test' | 'production' | 'backup' = 'test') {
		this.config = config;
		this.currentDatabase = config.databases[environment];
		// Don't call setupDatabases yet - wait for init
	}

	async initialize() {
		this.PouchDBConstructor = await ensurePouchDBLoaded();
		this.setupDatabases();
		this.setupOnlineListener();
	}

	private async init() {
		await this.initialize();
	}

	private setupDatabases() {
		if (!this.PouchDBConstructor) {
			throw new Error('PouchDB not loaded. Call initialize() first.');
		}
		
		// Local database (IndexedDB)
		this.localDB = new this.PouchDBConstructor(this.currentDatabase, {
			adapter: 'idb'
		});

		// Remote database (CouchDB) - Direct connection now that CORS is configured
		const remoteUrl = `${this.config.localUrl}${this.currentDatabase}`;
		console.log(`🔧 Setting up CouchDB connection:`);
		console.log(`   - Local URL: ${this.config.localUrl}`);
		console.log(`   - Web URL: ${this.config.webUrl}`);
		console.log(`   - Database: ${this.currentDatabase}`);
		console.log(`   - Full Remote URL: ${remoteUrl}`);
		
		this.remoteDB = new this.PouchDBConstructor(remoteUrl, {
			adapter: 'http',
			auth: {
				username: this.config.username,
				password: this.config.password
			},
			skip_setup: false, // Let PouchDB create database if needed
			ajax: {
				timeout: 30000, // Increased timeout for better reliability
				cache: false,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		});

		console.log(`📡 CouchDB connection configured: ${remoteUrl}`);
	}

	private setupOnlineListener() {
		window.addEventListener('online', () => {
			this.isOnline = true;
			this.startSync();
		});

		window.addEventListener('offline', () => {
			this.isOnline = false;
			this.stopSync();
		});
	}

	async testConnection(): Promise<{ success: boolean; error?: string; info?: any }> {
		try {
			console.log(`🔍 Testing CouchDB connection to: ${this.remoteDB.name}`);
			const info = await this.remoteDB.info();
			console.log(`✅ Connection test successful:`, info);
			return { success: true, info };
		} catch (error) {
			console.error(`❌ Connection test failed:`, error);
			return {
				success: false,
				error: `Connection failed: ${error.message}. This might be due to CORS or network issues.`
			};
		}
	}

	async startSync(options: Partial<SyncOptions> = {}): Promise<void> {
		if (!this.isOnline) {
			console.log('Offline - sync will start when connection is restored');
			return;
		}

		const defaultOptions: SyncOptions = {
			live: true,
			retry: true,
			continuous: true,
			heartbeat: 10000,
			timeout: 20000,
			...options
		};

		try {
			// Test connection first
			const connectionTest = await this.testConnection();
			if (!connectionTest.success) {
				console.warn('Cannot start sync - connection test failed:', connectionTest.error);
				return;
			}

			this.syncHandler = this.localDB
				.sync(this.remoteDB, defaultOptions)
				.on('change', (info: any) => {
					console.log('Sync change:', info);
					this.emitSyncEvent('change', info);
				})
				.on('paused', (err: any) => {
					console.log('Sync paused:', err);
					this.emitSyncEvent('paused', err);
				})
				.on('active', () => {
					console.log('Sync resumed');
					this.emitSyncEvent('active', null);
				})
				.on('denied', (err: any) => {
					console.error('Sync denied:', err);
					this.emitSyncEvent('denied', err);
				})
				.on('complete', (info: any) => {
					console.log('Sync complete:', info);
					this.emitSyncEvent('complete', info);
				})
				.on('error', (err: any) => {
					console.error('Sync error:', err);
					this.emitSyncEvent('error', err);
				});

			console.log('Background sync started');
		} catch (error) {
			console.error('Failed to start sync:', error);
			throw error;
		}
	}

	stopSync(): void {
		if (this.syncHandler) {
			this.syncHandler.cancel();
			this.syncHandler = null;
			console.log('Background sync stopped');
		}
	}

	private emitSyncEvent(type: string, data: any) {
		const event = new CustomEvent('couchdb-sync', {
			detail: { type, data, database: this.currentDatabase }
		});
		window.dispatchEvent(event);
	}

	// Database operations
	async put(doc: any): Promise<any> {
		try {
			return await this.localDB.put(doc);
		} catch (error) {
			console.error('Put failed:', error);
			throw error;
		}
	}

	async get(id: string): Promise<any> {
		try {
			return await this.localDB.get(id);
		} catch (error) {
			if (error.status === 404) {
				throw new Error('Document not found');
			}
			throw error;
		}
	}

	async allDocs(options: any = {}): Promise<any> {
		try {
			return await this.localDB.allDocs({
				include_docs: true,
				...options
			});
		} catch (error) {
			console.error('AllDocs failed:', error);
			throw error;
		}
	}

	async find(selector: any): Promise<any> {
		try {
			return await this.localDB.find(selector);
		} catch (error) {
			console.error('Find failed:', error);
			throw error;
		}
	}

	async remove(doc: any): Promise<any> {
		try {
			return await this.localDB.remove(doc);
		} catch (error) {
			console.error('Remove failed:', error);
			throw error;
		}
	}

	// Manual sync operations
	async pushToRemote(): Promise<any> {
		try {
			return await this.localDB.replicate.to(this.remoteDB);
		} catch (error) {
			console.error('Push to remote failed:', error);
			throw error;
		}
	}

	async pullFromRemote(): Promise<any> {
		try {
			return await this.localDB.replicate.from(this.remoteDB);
		} catch (error) {
			console.error('Pull from remote failed:', error);
			throw error;
		}
	}

	// Status and info
	async getLocalInfo(): Promise<any> {
		return await this.localDB.info();
	}

	async getRemoteInfo(): Promise<any> {
		return await this.remoteDB.info();
	}

	getSyncStatus(): { isOnline: boolean; issyncing: boolean; database: string } {
		return {
			isOnline: this.isOnline,
			issyncing: !!this.syncHandler,
			database: this.currentDatabase
		};
	}

	// Switch database environment
	async switchDatabase(environment: 'test' | 'production' | 'backup'): Promise<void> {
		this.stopSync();
		this.currentDatabase = this.config.databases[environment];
		this.setupDatabases();

		if (this.isOnline) {
			await this.startSync();
		}
	}

	// Cleanup
	destroy(): void {
		this.stopSync();
		if (this.localDB) {
			this.localDB.close();
		}
	}
}

// Default configuration
export const defaultCouchDBConfig: CouchDBConfig = {
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

// Global sync manager instance
let syncManager: CouchDBSyncManager | null = null;

export async function initCouchDBSync(
	environment: 'test' | 'production' | 'backup' = 'test'
): Promise<CouchDBSyncManager> {
	if (syncManager) {
		syncManager.destroy();
	}

	syncManager = new CouchDBSyncManager(defaultCouchDBConfig, environment);
	
	// Initialize PouchDB and setup databases
	await syncManager.initialize();

	// Test connection and start sync if possible
	const connectionTest = await syncManager.testConnection();
	if (connectionTest.success) {
		await syncManager.startSync();
		console.log('CouchDB sync initialized and started');
	} else {
		console.warn('CouchDB sync initialized but could not connect:', connectionTest.error);
	}

	return syncManager;
}

export function getCouchDBSync(): CouchDBSyncManager | null {
	return syncManager;
}
