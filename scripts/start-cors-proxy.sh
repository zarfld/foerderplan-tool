#!/bin/bash

# CouchDB CORS Proxy Setup Script for Linux/Mac
# This script sets up and runs a CORS proxy for CouchDB development

echo "🔄 CouchDB CORS Proxy Setup"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js found: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi

# Install dependencies if package.json doesn't exist or dependencies are missing
if [ ! -f "package.json" ]; then
    echo "⚠️ No package.json found. Installing dependencies globally for this session..."
    npm install express http-proxy-middleware cors
else
    echo "📦 Installing/updating dependencies..."
    npm install express http-proxy-middleware cors
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies ready"

# Check if cors-proxy.js exists
if [ ! -f "cors-proxy.js" ]; then
    echo "❌ cors-proxy.js not found in current directory"
    echo "Please ensure cors-proxy.js is in the same directory as this script"
    exit 1
fi

echo ""
echo "🚀 Starting CouchDB CORS Proxy..."
echo "Press Ctrl+C to stop the proxy"
echo ""

# Start the proxy
node cors-proxy.js
