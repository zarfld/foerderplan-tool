// Simple CORS Proxy Server for CouchDB Development
// This proxy adds CORS headers to allow browser access to CouchDB
// Use this as a workaround if you cannot configure CORS directly on CouchDB

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();

// Configuration
const COUCHDB_URL = 'http://157.247.1.102:5984';
const PROXY_PORT = 3001;

// Enable CORS for all routes
app.use(
	cors({
		origin: true, // Allow all origins in development
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
	})
);

// Create proxy middleware
const couchdbProxy = createProxyMiddleware({
	target: COUCHDB_URL,
	changeOrigin: true,
	logLevel: 'info',
	onProxyReq: (proxyReq, req, res) => {
		console.log(`Proxying ${req.method} ${req.url} to ${COUCHDB_URL}${req.url}`);
	},
	onProxyRes: (proxyRes, req, res) => {
		// Add CORS headers to response
		proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
		proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,HEAD';
		proxyRes.headers['Access-Control-Allow-Headers'] =
			'Content-Type,Authorization,X-Requested-With,Accept';
		proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';

		console.log(`Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
	},
	onError: (err, req, res) => {
		console.error('Proxy error:', err.message);
		res.status(500).json({ error: 'Proxy error', details: err.message });
	}
});

// Use proxy for all CouchDB requests
app.use('/', couchdbProxy);

// Start proxy server
app.listen(PROXY_PORT, () => {
	console.log(`🔄 CouchDB CORS Proxy running on http://localhost:${PROXY_PORT}`);
	console.log(`📡 Proxying requests to: ${COUCHDB_URL}`);
	console.log(
		`💡 Update your app to use: http://localhost:${PROXY_PORT} instead of ${COUCHDB_URL}`
	);
	console.log('');
	console.log('To test the proxy:');
	console.log(`1. Open: http://localhost:5173/couchdb-test`);
	console.log('2. Click "🔄 Test Proxy Connection"');
	console.log('3. Check if CORS errors are resolved');
	console.log('');
	console.log('Press Ctrl+C to stop the proxy');
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n🛑 Shutting down CORS proxy...');
	process.exit(0);
});
