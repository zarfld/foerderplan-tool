// CouchDB Sync Database - Real PouchDB with CouchDB synchronization
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import PouchDB from 'pouchdb';
import HttpAdapter from 'pouchdb-adapter-http';
import IdbAdapter from 'pouchdb-adapter-idb';

// Add adapters
PouchDB.plugin(HttpAdapter);
PouchDB.plugin(IdbAdapter);

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

	constructor(config: CouchDBConfig, environment: 'test' | 'production' | 'backup' = 'test') {
		this.config = config;
		this.currentDatabase = config.databases[environment];
		this.setupDatabases();
		this.setupOnlineListener();
	}

	private setupDatabases() {
		// Local database (IndexedDB)
		this.localDB = new PouchDB(this.currentDatabase, {
			adapter: 'idb'
		});

		// Remote database (CouchDB) - Direct connection now that CORS is configured
		const remoteUrl = `${this.config.localUrl}${this.currentDatabase}`;
		this.remoteDB = new PouchDB(remoteUrl, {
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
			const info = await this.remoteDB.info();
			return { success: true, info };
		} catch (error) {
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
