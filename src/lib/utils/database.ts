import PouchDB from 'pouchdb';
import adapter from 'pouchdb-adapter-idb';

// Initialize PouchDB with IndexedDB adapter
PouchDB.plugin(adapter);

let db: PouchDB.Database | null = null;

export async function initDB(): Promise<PouchDB.Database> {
	if (db) {
		return db;
	}

	try {
		// Initialize local database
		db = new PouchDB('foerderplan-tool', {
			adapter: 'idb'
		});

		console.log('Database initialized successfully');
		return db;
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	}
}

export async function saveData(database: PouchDB.Database, id: string, data: any): Promise<void> {
	try {
		const timestamp = new Date().toISOString();
		
		// Try to get existing document to get its revision
		let doc: any = {
			_id: id,
			data: data,
			lastModified: timestamp
		};

		try {
			const existingDoc = await database.get(id);
			doc._rev = existingDoc._rev;
		} catch (error) {
			// Document doesn't exist yet, which is fine
		}

		await database.put(doc);
		console.log('Data saved successfully:', id);
	} catch (error) {
		console.error('Error saving data:', error);
		throw error;
	}
}

export async function loadData(database: PouchDB.Database, id: string): Promise<any | null> {
	try {
		const doc = await database.get(id);
		console.log('Data loaded successfully:', id);
		return (doc as any).data;
	} catch (error) {
		if ((error as any).status === 404) {
			console.log('Document not found:', id);
			return null;
		}
		console.error('Error loading data:', error);
		throw error;
	}
}

export async function getAllDocuments(database: PouchDB.Database): Promise<any[]> {
	try {
		const result = await database.allDocs({ include_docs: true });
		return result.rows
			.filter(row => row.doc && !row.id.startsWith('_design/'))
			.map(row => ({
				id: row.id,
				data: (row.doc as any).data,
				lastModified: (row.doc as any).lastModified
			}));
	} catch (error) {
		console.error('Error getting all documents:', error);
		throw error;
	}
}

export async function deleteDocument(database: PouchDB.Database, id: string): Promise<void> {
	try {
		const doc = await database.get(id);
		await database.remove(doc);
		console.log('Document deleted successfully:', id);
	} catch (error) {
		console.error('Error deleting document:', error);
		throw error;
	}
}

export async function syncWithCouchDB(localDB: PouchDB.Database, remoteURL: string): Promise<void> {
	try {
		const remoteDB = new PouchDB(remoteURL);
		
		// Bidirectional sync
		const sync = localDB.sync(remoteDB, {
			live: false,
			retry: true
		});

		sync.on('complete', (info) => {
			console.log('Sync completed successfully:', info);
		});

		sync.on('error', (error) => {
			console.error('Sync error:', error);
			throw error;
		});

		return new Promise((resolve, reject) => {
			sync.on('complete', () => resolve());
			sync.on('error', reject);
		});
	} catch (error) {
		console.error('Error during sync:', error);
		throw error;
	}
}
