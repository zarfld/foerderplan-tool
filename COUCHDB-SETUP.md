# CouchDB Setup and CORS Configuration Guide

## Current Issues

### 1. Local Network CORS Error (http://157.247.1.102:5984/)
- Connection succeeds but CORS headers are missing
- Browser blocks access due to security policy
- **Solution**: Configure CORS on CouchDB server

### 2. Web HTTPS Server Unreachable (https://couchdb.ettingshaus14.synology.me)
- Cannot reach server at all
- Possible network, firewall, or DNS issues
- **Solution**: Check server configuration and network access

## CORS Configuration for CouchDB

### Method 1: Using CouchDB Configuration API (Recommended)

If you have admin access to the CouchDB server, you can configure CORS via the configuration API:

```bash
# Enable CORS
curl -X PUT http://admin:password@157.247.1.102:5984/_node/_local/_config/httpd/enable_cors -d '"true"'

# Set allowed origins (use * for development, specific domains for production)
curl -X PUT http://admin:password@157.247.1.102:5984/_node/_local/_config/cors/origins -d '"*"'

# Set allowed credentials
curl -X PUT http://admin:password@157.247.1.102:5984/_node/_local/_config/cors/credentials -d '"true"'

# Set allowed methods
curl -X PUT http://admin:password@157.247.1.102:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'

# Set allowed headers
curl -X PUT http://admin:password@157.247.1.102:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'
```

### Method 2: Edit CouchDB Configuration File

Edit the CouchDB configuration file (usually `/etc/couchdb/local.ini` or similar):

```ini
[httpd]
enable_cors = true

[cors]
origins = *
credentials = true
methods = GET, PUT, POST, HEAD, DELETE
headers = accept, authorization, content-type, origin, referer, x-csrf-token
```

After editing, restart CouchDB service.

### Method 3: Fauxton Web Interface

1. Open CouchDB Fauxton interface: http://157.247.1.102:5984/_utils/
2. Go to Configuration
3. Add CORS settings as shown above

## Alternative Solutions

### 1. CORS Proxy Server (Recommended for Development)

We've included a ready-to-use CORS proxy server that solves CORS issues without requiring CouchDB server configuration.

#### Setup and Usage:

**Windows (PowerShell):**
```powershell
# Run the setup script (installs dependencies and starts proxy)
.\scripts\start-cors-proxy.ps1
```

**Linux/Mac (Bash):**
```bash
# Run the setup script (installs dependencies and starts proxy)
./scripts/start-cors-proxy.sh
```

**Manual Setup:**
```bash
# Install dependencies
npm install express http-proxy-middleware cors

# Start the proxy
node cors-proxy.js
```

#### How it Works:
- Proxy runs on `http://localhost:3001`
- Forwards all requests to your CouchDB server (`http://157.247.1.102:5984`)
- Adds proper CORS headers to all responses
- Handles authentication and all HTTP methods

#### Update Your App:
Once the proxy is running, update your CouchDB URL in the test page from:
- `http://157.247.1.102:5984/` 
- To: `http://localhost:3001/`

### 2. Direct CORS Configuration (If you have CouchDB admin access)

If you can configure CORS directly on the CouchDB server, use the commands provided in the CouchDB test page's "CORS Configuration" section.

### 3. Server-Side Sync (Production Ready)

We can create a simple proxy server that adds CORS headers:

```javascript
// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/couchdb', createProxyMiddleware({
  target: 'http://157.247.1.102:5984',
  changeOrigin: true,
  pathRewrite: {
    '^/couchdb': '', // remove /couchdb prefix
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  }
}));

app.listen(3001, () => {
  console.log('Proxy server running on http://localhost:3001');
});
```

### 2. Server-Side Sync (Production Ready)

For production deployment, implement server-side sync that handles CouchDB communication:

```
[PWA App] ↔ [Your Server API] ↔ [CouchDB]
```

This eliminates CORS issues and provides better security.

## Network Troubleshooting for Web Server

### Check HTTPS Server Accessibility

1. **DNS Resolution**:
   ```bash
   nslookup couchdb.ettingshaus14.synology.me
   ```

2. **Port Connectivity**:
   ```bash
   telnet couchdb.ettingshaus14.synology.me 443
   ```

3. **SSL Certificate**:
   ```bash
   openssl s_client -connect couchdb.ettingshaus14.synology.me:443
   ```

### Common Synology NAS Issues

1. **Firewall Settings**: Ensure port 443 is open
2. **DDNS Configuration**: Check if DDNS is properly configured
3. **SSL Certificate**: Ensure valid SSL certificate is installed
4. **Router Port Forwarding**: Check if port 443 is forwarded to NAS
5. **ISP Blocking**: Some ISPs block port 443 for residential connections

## Testing Plan

1. **Test Local CORS Fix**: After configuring CORS, test with our CouchDB test page
2. **Test Web Server**: Troubleshoot network connectivity to HTTPS endpoint
3. **Implement Fallback**: Use localStorage-only mode if remote sync is not available
4. **Production Deployment**: Implement server-side proxy for production use

## Security Considerations

- **Development**: Use `origins = *` for development
- **Production**: Set specific origins: `origins = https://your-app-domain.com`
- **Authentication**: Keep username/password secure, consider token-based auth
- **HTTPS**: Always use HTTPS in production
