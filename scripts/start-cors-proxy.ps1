# CouchDB CORS Proxy Setup Script for Windows PowerShell
# This script sets up and runs a CORS proxy for CouchDB development

Write-Host "🔄 CouchDB CORS Proxy Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if package.json exists and has proxy dependencies
$needsInstall = $false

if (!(Test-Path "package.json")) {
    Write-Host "⚠️ No package.json found. Creating minimal package.json..." -ForegroundColor Yellow
    $packageJson = @{
        name = "couchdb-cors-proxy"
        version = "1.0.0"
        description = "CORS proxy for CouchDB development"
        main = "cors-proxy.js"
        dependencies = @{
            express = "^4.18.2"
            "http-proxy-middleware" = "^2.0.6"
            cors = "^2.8.5"
        }
    } | ConvertTo-Json -Depth 10
    
    $packageJson | Out-File -FilePath "package.json" -Encoding UTF8
    $needsInstall = $true
} else {
    # Check if required dependencies are in package.json
    $packageContent = Get-Content "package.json" | ConvertFrom-Json
    $dependencies = $packageContent.dependencies
    
    if (!$dependencies.express -or !$dependencies."http-proxy-middleware" -or !$dependencies.cors) {
        Write-Host "⚠️ Missing proxy dependencies. Will install..." -ForegroundColor Yellow
        $needsInstall = $true
    }
}

# Install dependencies if needed
if ($needsInstall) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install express http-proxy-middleware cors
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
}

# Check if cors-proxy.js exists
if (!(Test-Path "cors-proxy.js")) {
    Write-Host "❌ cors-proxy.js not found in current directory" -ForegroundColor Red
    Write-Host "Please ensure cors-proxy.js is in the same directory as this script" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting CouchDB CORS Proxy..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the proxy" -ForegroundColor Yellow
Write-Host ""

# Start the proxy
try {
    node cors-proxy.js
} catch {
    Write-Host "❌ Failed to start proxy server" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}
