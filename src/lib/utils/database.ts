// Database operations - Enhanced localStorage with CouchDB sync capability
// Provides offline-first storage with optional CouchDB synchronization

// Simple mock for localStorage operations
const mockDB: any = {
	async put(doc: any) {
		const key = `foerderplan_${doc._id}`;
		const docWithMeta = {
			...doc,
			_rev: doc._rev || `1-${Date.now()}`,
			_id: doc._id || Date.now().toString(36) + Math.random().toString(36).substr(2)
		};
		localStorage.setItem(key, JSON.stringify(docWithMeta));
		console.log(`💾 Saved to localStorage: ${docWithMeta._id}`);
		return { ok: true, id: docWithMeta._id, rev: docWithMeta._rev };
	},

	async get(id: string) {
		const key = `foerderplan_${id}`;
		const doc = localStorage.getItem(key);
		if (!doc) throw new Error('Document not found');
		const parsed = JSON.parse(doc);
		console.log(`� Retrieved from localStorage: ${id}`);
		return parsed;
	},

	async allDocs(options: any = {}) {
		const keys = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('foerderplan_')) {
				keys.push(key);
			}
		}

		const rows = keys.map((key) => {
			try {
				const docString = localStorage.getItem(key);
				if (!docString) return null;
				
				// Check if it's valid JSON first
				const doc = JSON.parse(docString);
				
				// Ensure it has required fields
				if (!doc._id) {
					console.warn(`⚠️ Document in localStorage missing _id: ${key}`);
					return null;
				}
				
				return {
					id: doc._id,
					key: doc._id,
					value: { rev: doc._rev },
					doc: options.include_docs ? doc : undefined
				};
			} catch (error) {
				console.warn(`⚠️ Skipping invalid JSON in localStorage key: ${key}`, error);
				// Remove the invalid entry
				try {
					localStorage.removeItem(key);
					console.log(`🧹 Removed invalid localStorage entry: ${key}`);
				} catch (removeError) {
					console.error(`❌ Failed to remove invalid key ${key}:`, removeError);
				}
				return null;
			}
		}).filter(row => row !== null); // Filter out invalid entries

		console.log(`📚 Retrieved ${rows.length} valid documents from localStorage`);
		return {
			total_rows: rows.length,
			offset: 0,
			rows
		};
	},

	async remove(doc: any) {
		const key = `foerderplan_${doc._id}`;
		localStorage.removeItem(key);
		console.log(`�️ Removed from localStorage: ${doc._id}`);
		return { ok: true, id: doc._id, rev: doc._rev };
	},

	// Sync status methods for compatibility
	getSyncStatus() {
		return 'localStorage';
	},

	getMode() {
		return 'localStorage';
	},

	onSyncStatusChange(callback: (status: string) => void) {
		// No-op for localStorage-only mode
		callback('localStorage');
	}
};

let db: any = null;
let dbMode: 'localStorage' | 'couchdb' | 'hybrid' = 'localStorage';
let isInitializing: boolean = false;
let initPromise: Promise<any> | null = null;

// Database mode can be changed via localStorage setting
export function getDatabaseMode(): 'localStorage' | 'couchdb' | 'hybrid' {
	if (typeof window !== 'undefined') {
		const mode = localStorage.getItem('foerderplan_db_mode');
		if (mode === 'couchdb' || mode === 'hybrid') {
			return mode as 'couchdb' | 'hybrid';
		}
	}
	return 'localStorage';
}

export function setDatabaseMode(mode: 'localStorage' | 'couchdb' | 'hybrid'): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem('foerderplan_db_mode', mode);
		dbMode = mode;
		// Reset database instance to force reinitialize
		db = null;
		isInitializing = false;
		initPromise = null;
		
		// Reset HybridDatabaseManager singleton if it exists
		try {
			import('./hybridDatabase2.js').then((module) => {
				if (module.HybridDatabaseManager?.resetInstance) {
					module.HybridDatabaseManager.resetInstance();
				}
			});
		} catch (error) {
			// Ignore if module not loaded yet
		}
		
		console.log(`🔄 Database mode changed to: ${mode}`);
	}
}

// Clean localStorage from invalid entries
export function cleanLocalStorage(): void {
	if (typeof window === 'undefined') return;
	
	const keysToRemove: string[] = [];
	
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith('foerderplan_')) {
			// Skip the database mode setting - it's stored as plain text, not JSON
			if (key === 'foerderplan_db_mode') {
				continue;
			}
			
			try {
				const value = localStorage.getItem(key);
				if (value) {
					// Check if it's valid JSON
					JSON.parse(value);
				} else {
					keysToRemove.push(key);
				}
			} catch (error) {
				console.warn(`🧹 Removing invalid localStorage entry: ${key}`, error);
				keysToRemove.push(key);
			}
		}
	}
	
	// Check for the database mode setting specifically (but don't try to parse as JSON)
	try {
		const dbModeValue = localStorage.getItem('foerderplan_db_mode');
		if (dbModeValue && dbModeValue !== 'localStorage' && dbModeValue !== 'couchdb' && dbModeValue !== 'hybrid') {
			console.warn(`🧹 Removing invalid db_mode setting: ${dbModeValue}`);
			localStorage.removeItem('foerderplan_db_mode');
		}
	} catch (error) {
		console.warn('🧹 Error checking db_mode setting:', error);
		localStorage.removeItem('foerderplan_db_mode');
	}
	
	// Remove all invalid keys
	keysToRemove.forEach(key => {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error(`❌ Failed to remove key ${key}:`, error);
		}
	});
	
	if (keysToRemove.length > 0) {
		console.log(`🧹 Cleaned ${keysToRemove.length} invalid localStorage entries`);
	}
}

export async function initDB(): Promise<any> {
	// Return existing instance if already initialized
	if (db) {
		console.log('💡 Database already initialized, returning existing instance');
		return db;
	}
	
	// If already initializing, wait for the existing promise
	if (isInitializing && initPromise) {
		console.log('⏳ Database initialization in progress, waiting...');
		return initPromise;
	}
	
	// Start initialization
	isInitializing = true;
	initPromise = _initializeDatabase();
	
	try {
		const result = await initPromise;
		isInitializing = false;
		return result;
	} catch (error) {
		isInitializing = false;
		initPromise = null;
		throw error;
	}
}

async function _initializeDatabase(): Promise<any> {
	// Clean localStorage from invalid entries first
	cleanLocalStorage();

	dbMode = getDatabaseMode();
	console.log(`🚀 Initializing Database (${dbMode} mode)...`);

	try {
		if (dbMode === 'couchdb' || dbMode === 'hybrid') {
			// Try to initialize CouchDB connection
			try {
				console.log('🔄 Attempting to load HybridDatabaseManager...');
				
				// Get the current environment setting
				const environment = getDatabaseEnvironment();
				console.log(`🌍 Using environment: ${environment}`);
				
				// First try to load the module to see if there are import issues
				const hybridModule = await import('./hybridDatabase2.js');
				console.log('✅ HybridDatabaseManager module loaded successfully');
				
				const { HybridDatabaseManager } = hybridModule;
				if (!HybridDatabaseManager) {
					throw new Error('HybridDatabaseManager not found in module exports');
				}
				
				console.log('🔄 Creating HybridDatabaseManager instance...');
				const hybridDb = new HybridDatabaseManager({
					localName: 'foerderplan-local',
					environment: environment,
					useCouchDB: true,
					autoSync: true
				});
				
				console.log('✅ HybridDatabaseManager instance created successfully');
				
				// Wait a bit for async initialization to complete
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Verify that the instance has required methods
				if (typeof hybridDb.put !== 'function' || 
					typeof hybridDb.get !== 'function' || 
					typeof hybridDb.allDocs !== 'function' || 
					typeof hybridDb.remove !== 'function') {
					throw new Error('HybridDatabaseManager missing required methods');
				}
				
				console.log('✅ HybridDatabaseManager methods verified');
				
				// Create database wrapper with all required methods
				db = {
					put: hybridDb.put.bind(hybridDb),
					get: hybridDb.get.bind(hybridDb),
					allDocs: hybridDb.allDocs.bind(hybridDb),
					remove: hybridDb.remove.bind(hybridDb),
					getMode: () => hybridDb.getMode?.() || dbMode,
					getSyncStatus: () => hybridDb.getSyncStatus?.() || 'unknown',
					manualSync: () => hybridDb.manualSync?.() || Promise.resolve(false),
					onSyncStatusChange: hybridDb.onSyncStatusChange?.bind(hybridDb) || (() => {})
				};
				
				console.log('✅ Database initialized successfully (CouchDB/Hybrid mode)');
				return db;
			} catch (error) {
				console.warn('⚠️ CouchDB initialization failed, falling back to localStorage:', error);
				// Log detailed error information
				if (error instanceof Error) {
					console.warn('⚠️ Error name:', error.name);
					console.warn('⚠️ Error message:', error.message);
					if (error.stack) {
						console.warn('⚠️ Error stack:', error.stack);
					}
				}
				dbMode = 'localStorage';
			}
		}

		// Fallback to localStorage mode
		dbMode = 'localStorage';
		db = {
			...mockDB,
			getMode: () => 'localStorage',
			getSyncStatus: () => 'offline',
			manualSync: () => Promise.resolve(false)
		};

		console.log('✅ Database initialized successfully (localStorage fallback)');
		return db;
	} catch (error) {
		console.error('❌ Error initializing database:', error);
		throw error;
	}
}

export async function saveData(database: any, id: string, data: any): Promise<void> {
	try {
		const timestamp = new Date().toISOString();

		// Try to get existing document to get its revision
		const doc: any = {
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

export async function loadData(database: any, id: string): Promise<any | null> {
	try {
		const doc = await database.get(id);
		console.log('Data loaded successfully:', id);
		return doc.data;
	} catch (error) {
		// Handle both PouchDB-style errors and simple errors
		if ((error as any).status === 404 || (error as any).message === 'Document not found') {
			console.log('Document not found (first time load):', id);
			return null;
		}
		console.error('Error loading data:', error);
		return null; // Return null instead of throwing to prevent app crash
	}
}

export async function getAllDocuments(database: any): Promise<any[]> {
	try {
		const result = await database.allDocs({ include_docs: true });
		return result.rows
			.filter((row: any) => row.doc && !row.id.startsWith('_design/'))
			.map((row: any) => ({
				id: row.id,
				data: (row.doc as any).data,
				lastModified: (row.doc as any).lastModified
			}));
	} catch (error) {
		console.error('Error getting all documents:', error);
		throw error;
	}
}

export async function deleteDocument(database: any, id: string): Promise<void> {
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

// Student management functions
export async function saveStudentList(database: any, students: string[]): Promise<void> {
	try {
		const timestamp = new Date().toISOString();
		const doc: any = {
			_id: 'student-list',
			students,
			lastModified: timestamp,
			type: 'student-list'
		};

		try {
			const existingDoc = await database.get('student-list');
			doc._rev = existingDoc._rev;
		} catch (error) {
			// Document doesn't exist yet, which is fine
		}

		await database.put(doc);
		console.log('Student list saved successfully');
	} catch (error) {
		console.error('Error saving student list:', error);
		throw error;
	}
}

export async function loadStudentList(database: any): Promise<string[]> {
	try {
		const doc = await database.get('student-list');
		return doc.students || [];
	} catch (error) {
		// Handle both PouchDB-style errors and simple errors
		if ((error as any).status === 404 || (error as any).message === 'Document not found') {
			console.log('Student list not found (first time), returning empty array');
			return [];
		}
		console.error('Error loading student list:', error);
		return []; // Return empty array instead of throwing
	}
}

export async function saveAssessment(
	database: any,
	studentName: string,
	assessmentData: any
): Promise<string> {
	try {
		const timestamp = new Date().toISOString();
		const cleanName = studentName.replace(/[^a-zA-Z0-9äöüßÄÖÜ]/g, '_');
		const assessmentId = `assessment-${cleanName}-${timestamp}`;

		const doc = {
			_id: assessmentId,
			studentName,
			assessmentData,
			timestamp,
			lastModified: timestamp,
			type: 'assessment'
		};

		await database.put(doc);
		console.log('Assessment saved successfully:', assessmentId);
		return assessmentId;
	} catch (error) {
		console.error('Error saving assessment:', error);
		throw error;
	}
}

export async function loadLatestAssessment(database: any, studentName: string): Promise<any> {
	try {
		console.log('loadLatestAssessment called for student:', studentName);
		const cleanName = studentName.replace(/[^a-zA-Z0-9äöüßÄÖÜ]/g, '_');
		console.log('Clean name:', cleanName);

		const result = await database.allDocs({
			include_docs: true,
			startkey: `assessment-${cleanName}-`,
			endkey: `assessment-${cleanName}-\ufff0`
		});

		console.log('Database query result:', result);

		if (result.rows.length === 0) {
			console.log('No assessments found for student:', studentName);
			return null;
		}

		// Sort by timestamp and get the latest - FILTER BY STUDENT NAME!
		const assessments = result.rows
			.map((row: any) => row.doc)
			.filter((doc: any) => doc && doc.type === 'assessment' && doc.studentName === studentName)
			.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		console.log('Found assessments:', assessments.length);
		console.log(
			'All assessments for debug:',
			assessments.map((a: any) => ({ id: a._id, student: a.studentName, timestamp: a.timestamp }))
		);

		if (assessments.length === 0) {
			console.log('No valid assessments after filtering');
			return null;
		}

		console.log('Latest assessment loaded for student:', studentName, assessments[0]);
		return assessments[0].assessmentData;
	} catch (error) {
		console.error('Error loading latest assessment:', error);
		throw error;
	}
}

export async function loadAllAssessments(
	database: PouchDB.Database,
	studentName?: string
): Promise<any[]> {
	try {
		let startkey = 'assessment-';
		let endkey = 'assessment-\ufff0';

		if (studentName) {
			const cleanName = studentName.replace(/[^a-zA-Z0-9äöüßÄÖÜ]/g, '_');
			startkey = `assessment-${cleanName}-`;
			endkey = `assessment-${cleanName}-\ufff0`;
		}

		const result = await database.allDocs({
			include_docs: true,
			startkey,
			endkey
		});

		const assessments = result.rows
			.map((row) => row.doc as any)
			.filter((doc) => doc && doc.type === 'assessment')
			.map((doc) => ({
				id: doc._id,
				studentName: doc.studentName,
				assessmentData: doc.assessmentData,
				timestamp: doc.timestamp
			}))
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		console.log('Loaded assessments:', assessments.length);
		return assessments;
	} catch (error) {
		console.error('Error loading assessments:', error);
		throw error;
	}
}

export async function compareAssessments(assessments: any[]): Promise<any> {
	if (assessments.length < 2) {
		return {
			error: 'Mindestens zwei Assessments sind für einen Vergleich erforderlich',
			assessments: assessments.length
		};
	}

	// Remove duplicates by student (keep only the latest assessment per student)
	const uniqueAssessments = new Map<string, any>();
	assessments.forEach((assessment) => {
		const studentName = assessment.studentName;
		const existing = uniqueAssessments.get(studentName);

		if (!existing || new Date(assessment.timestamp) > new Date(existing.timestamp)) {
			uniqueAssessments.set(studentName, assessment);
		}
	});

	const finalAssessments = Array.from(uniqueAssessments.values());

	if (finalAssessments.length < 2) {
		return {
			error: 'Mindestens zwei verschiedene Schüler sind für einen Vergleich erforderlich',
			assessments: finalAssessments.length,
			uniqueStudents: finalAssessments.map((a) => a.studentName)
		};
	}

	const comparison: any = {
		students: finalAssessments.map((a) => a.studentName),
		timestamps: finalAssessments.map((a) => a.timestamp),
		assessmentCount: finalAssessments.length,
		uniqueStudentCount: finalAssessments.length,
		commonIssues: {},
		progressAreas: {},
		subjectComparison: {},
		foerdermassnahmenComparison: {}
	};

	const subjects = ['spracheSprechen', 'lesen', 'schreiben', 'mathematik'];

	subjects.forEach((subject) => {
		comparison.subjectComparison[subject] = {
			commonProblems: [],
			strongAreas: [],
			mixedResults: []
		};

		const subjectData = finalAssessments.map((a) => a.assessmentData[subject]?.assessments || []);

		// Find patterns in each task
		if (subjectData.length > 0 && subjectData[0].length > 0) {
			subjectData[0].forEach((task: any, taskIndex: number) => {
				const responses = subjectData.map((data) => data[taskIndex]?.status || '');
				const notes = subjectData.map((data) => data[taskIndex]?.notes || '');

				const jaCount = responses.filter((r) => r === 'ja').length;
				const teilweiseCount = responses.filter((r) => r === 'teilweise').length;
				const neinCount = responses.filter((r) => r === 'nein').length;

				const analysisItem = {
					task: task.task,
					responses,
					notes: notes.filter((n) => n.trim() !== ''),
					statistics: { jaCount, teilweiseCount, neinCount },
					students: finalAssessments.map((a) => a.studentName)
				};

				// Categorize based on response patterns (use finalAssessments length)
				if (neinCount >= Math.ceil(finalAssessments.length * 0.6)) {
					comparison.subjectComparison[subject].commonProblems.push(analysisItem);
				} else if (jaCount >= Math.ceil(finalAssessments.length * 0.6)) {
					comparison.subjectComparison[subject].strongAreas.push(analysisItem);
				} else {
					comparison.subjectComparison[subject].mixedResults.push(analysisItem);
				}
			});
		}
	});

	// Analyze Fördermaßnahmen
	if (finalAssessments[0].assessmentData.foerdermassnahmen) {
		const measureAreas = [
			'horenUnterscheiden',
			'sprechenVerstehen',
			'optischeWahrnehmung',
			'mathematikFoerderung'
		];

		measureAreas.forEach((area) => {
			comparison.foerdermassnahmenComparison[area] = {
				commonlyApplied: [],
				rarelyApplied: [],
				effectiveNotes: []
			};

			const measureData = finalAssessments.map(
				(a) => a.assessmentData.foerdermassnahmen?.[area] || []
			);

			if (measureData.length > 0 && measureData[0].length > 0) {
				measureData[0].forEach((measure: any, measureIndex: number) => {
					const applied = measureData.map((data) => data[measureIndex]?.applied || false);
					const appliedCount = applied.filter(Boolean).length;
					const notes = measureData
						.map((data) => data[measureIndex]?.notes || '')
						.filter((n) => n.trim() !== '');

					const analysisItem = {
						measure: measure.measure,
						appliedCount,
						percentage: Math.round((appliedCount / finalAssessments.length) * 100),
						notes,
						students: finalAssessments.map((a) => a.studentName)
					};

					if (appliedCount >= Math.ceil(finalAssessments.length * 0.6)) {
						comparison.foerdermassnahmenComparison[area].commonlyApplied.push(analysisItem);
					} else {
						comparison.foerdermassnahmenComparison[area].rarelyApplied.push(analysisItem);
					}

					if (notes.length > 0) {
						comparison.foerdermassnahmenComparison[area].effectiveNotes.push({
							measure: measure.measure,
							notes
						});
					}
				});
			}
		});
	}

	console.log('Assessment comparison completed');
	return comparison;
}

export async function getProgressTracking(
	database: PouchDB.Database,
	studentName: string
): Promise<any> {
	try {
		const assessments = await loadAllAssessments(database, studentName);

		if (assessments.length < 2) {
			return {
				student: studentName,
				assessmentCount: assessments.length,
				message: 'Mindestens zwei Assessments sind erforderlich für Progress Tracking'
			};
		}

		// Sort by timestamp (oldest first for progress tracking)
		assessments.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

		const progress: any = {
			student: studentName,
			assessmentCount: assessments.length,
			timespan: {
				first: assessments[0].timestamp,
				latest: assessments[assessments.length - 1].timestamp
			},
			subjectProgress: {},
			overallTrend: 'stable'
		};

		const subjects = ['spracheSprechen', 'lesen', 'schreiben', 'mathematik'];
		let improvementCount = 0;
		let deteriorationCount = 0;

		subjects.forEach((subject) => {
			const firstAssessment = assessments[0].assessmentData[subject]?.assessments || [];
			const latestAssessment =
				assessments[assessments.length - 1].assessmentData[subject]?.assessments || [];

			const improvements: any[] = [];
			const deteriorations: any[] = [];

			firstAssessment.forEach((task: any, index: number) => {
				if (latestAssessment[index]) {
					const oldStatus = task.status;
					const newStatus = latestAssessment[index].status;

					// Define status values for comparison
					const statusValue: { [key: string]: number } = { nein: 1, teilweise: 2, ja: 3, '': 0 };
					const oldValue = statusValue[oldStatus as string] || 0;
					const newValue = statusValue[newStatus as string] || 0;

					if (newValue > oldValue) {
						improvements.push({
							task: task.task,
							from: oldStatus,
							to: newStatus
						});
						improvementCount++;
					} else if (newValue < oldValue) {
						deteriorations.push({
							task: task.task,
							from: oldStatus,
							to: newStatus
						});
						deteriorationCount++;
					}
				}
			});

			progress.subjectProgress[subject] = {
				improvements,
				deteriorations,
				improvementCount: improvements.length,
				deteriorationCount: deteriorations.length
			};
		});

		// Determine overall trend
		if (improvementCount > deteriorationCount * 1.5) {
			progress.overallTrend = 'improving';
		} else if (deteriorationCount > improvementCount * 1.5) {
			progress.overallTrend = 'declining';
		}

		console.log('Progress tracking completed for student:', studentName);
		return progress;
	} catch (error) {
		console.error('Error in progress tracking:', error);
		throw error;
	}
}

// Environment functions
const ENVIRONMENT_KEY = 'foerderplan_db_environment';

export function getDatabaseEnvironment(): 'test' | 'production' | 'backup' {
	if (typeof window === 'undefined') return 'test';
	const env = localStorage.getItem(ENVIRONMENT_KEY);
	return (env as 'test' | 'production' | 'backup') || 'test';
}

export function setDatabaseEnvironment(environment: 'test' | 'production' | 'backup'): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(ENVIRONMENT_KEY, environment);
	console.log(`📝 Database environment set to: ${environment}`);
	
	// Reset database instance to force reinitialize with new environment
	db = null;
	isInitializing = false;
	initPromise = null;
	
	// Reset HybridDatabaseManager singleton if it exists
	try {
		import('./hybridDatabase2.js').then((module) => {
			if (module.HybridDatabaseManager?.resetInstance) {
				module.HybridDatabaseManager.resetInstance();
			}
		});
	} catch (error) {
		// Ignore if module not loaded yet
	}
}
