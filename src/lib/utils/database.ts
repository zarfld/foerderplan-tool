// Simple database operations without PouchDB for now
// This provides a basic localStorage-based implementation

let mockDB: any = {
	async put(doc: any) {
		const key = `pouchdb_${doc._id}`;
		localStorage.setItem(key, JSON.stringify(doc));
		return { ok: true, id: doc._id, rev: `1-${Date.now()}` };
	},
	
	async get(id: string) {
		const key = `pouchdb_${id}`;
		const doc = localStorage.getItem(key);
		if (!doc) throw new Error('Document not found');
		return JSON.parse(doc);
	},
	
	async allDocs(options: any = {}) {
		const keys = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('pouchdb_')) {
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
	}
};

let db: any = null;

export async function initDB(): Promise<any> {
	if (db) {
		return db;
	}

	try {
		// Initialize mock database (localStorage-based)
		db = mockDB;

		console.log('Database initialized successfully (localStorage fallback)');
		return db;
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	}
}

export async function saveData(database: any, id: string, data: any): Promise<void> {
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
		let doc: any = {
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

export async function saveAssessment(database: any, studentName: string, assessmentData: any): Promise<string> {
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
		console.log('All assessments for debug:', assessments.map((a: any) => ({id: a._id, student: a.studentName, timestamp: a.timestamp})));
		
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

export async function loadAllAssessments(database: PouchDB.Database, studentName?: string): Promise<any[]> {
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
			.map(row => row.doc as any)
			.filter(doc => doc && doc.type === 'assessment')
			.map(doc => ({
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
	assessments.forEach(assessment => {
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
			uniqueStudents: finalAssessments.map(a => a.studentName)
		};
	}

	const comparison: any = {
		students: finalAssessments.map(a => a.studentName),
		timestamps: finalAssessments.map(a => a.timestamp),
		assessmentCount: finalAssessments.length,
		uniqueStudentCount: finalAssessments.length,
		commonIssues: {},
		progressAreas: {},
		subjectComparison: {},
		foerdermassnahmenComparison: {}
	};

	const subjects = ['spracheSprechen', 'lesen', 'schreiben', 'mathematik'];
	
	subjects.forEach(subject => {
		comparison.subjectComparison[subject] = {
			commonProblems: [],
			strongAreas: [],
			mixedResults: []
		};

		const subjectData = finalAssessments.map(a => a.assessmentData[subject]?.assessments || []);
		
		// Find patterns in each task
		if (subjectData.length > 0 && subjectData[0].length > 0) {
			subjectData[0].forEach((task: any, taskIndex: number) => {
				const responses = subjectData.map(data => data[taskIndex]?.status || '');
				const notes = subjectData.map(data => data[taskIndex]?.notes || '');
				
				const jaCount = responses.filter(r => r === 'ja').length;
				const teilweiseCount = responses.filter(r => r === 'teilweise').length;
				const neinCount = responses.filter(r => r === 'nein').length;
				
				const analysisItem = {
					task: task.task,
					responses,
					notes: notes.filter(n => n.trim() !== ''),
					statistics: { jaCount, teilweiseCount, neinCount },
					students: finalAssessments.map(a => a.studentName)
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
		const measureAreas = ['horenUnterscheiden', 'sprechenVerstehen', 'optischeWahrnehmung', 'mathematikFoerderung'];
		
		measureAreas.forEach(area => {
			comparison.foerdermassnahmenComparison[area] = {
				commonlyApplied: [],
				rarelyApplied: [],
				effectiveNotes: []
			};

			const measureData = finalAssessments.map(a => a.assessmentData.foerdermassnahmen?.[area] || []);
			
			if (measureData.length > 0 && measureData[0].length > 0) {
				measureData[0].forEach((measure: any, measureIndex: number) => {
					const applied = measureData.map(data => data[measureIndex]?.applied || false);
					const appliedCount = applied.filter(Boolean).length;
					const notes = measureData.map(data => data[measureIndex]?.notes || '').filter(n => n.trim() !== '');
					
					const analysisItem = {
						measure: measure.measure,
						appliedCount,
						percentage: Math.round((appliedCount / finalAssessments.length) * 100),
						notes,
						students: finalAssessments.map(a => a.studentName)
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

export async function getProgressTracking(database: PouchDB.Database, studentName: string): Promise<any> {
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

		subjects.forEach(subject => {
			const firstAssessment = assessments[0].assessmentData[subject]?.assessments || [];
			const latestAssessment = assessments[assessments.length - 1].assessmentData[subject]?.assessments || [];
			
			const improvements: any[] = [];
			const deteriorations: any[] = [];
			
			firstAssessment.forEach((task: any, index: number) => {
				if (latestAssessment[index]) {
					const oldStatus = task.status;
					const newStatus = latestAssessment[index].status;
					
					// Define status values for comparison
					const statusValue: { [key: string]: number } = { 'nein': 1, 'teilweise': 2, 'ja': 3, '': 0 };
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
