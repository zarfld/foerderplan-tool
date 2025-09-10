// CouchDB Configuration für direkte Verbindung
// Da CORS bereits konfiguriert ist, verwenden wir die direkte Verbindung
export const couchdbConfig = {
	localUrl: 'http://157.247.1.102:5984/',
	webUrl: 'https://couchdb.ettingshaus14.synology.me', // Fallback wenn Web-Server verfügbar wird
	username: 'Lehrer',
	password: 'jenAplan',
	databases: {
		test: 'foerderplan-test', // Für Entwicklung und Tests
		production: 'foerderplan', // Für Live-Lehrerdaten
		backup: 'foerderplan-backup' // Für automatische Backups
	},
	// Sync-Optionen
	syncOptions: {
		live: true, // Live-Synchronisation
		retry: true, // Automatische Wiederholung bei Fehlern
		continuous: true, // Kontinuierliche Synchronisation
		heartbeat: 10000, // 10 Sekunden Heartbeat
		timeout: 30000 // 30 Sekunden Timeout
	}
};

// Environment-spezifische Konfiguration
export const getCurrentEnvironment = (): 'test' | 'production' | 'backup' => {
	// In der Entwicklung verwenden wir 'test'
	// In der Produktion sollte dies auf 'production' gesetzt werden
	if (typeof window !== 'undefined') {
		const hostname = window.location.hostname;
		if (hostname === 'localhost' || hostname === '127.0.0.1') {
			return 'test';
		}
	}
	return 'production';
};
