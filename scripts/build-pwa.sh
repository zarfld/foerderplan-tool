#!/bin/bash

# PWA Build Script for Förderplan Tool
# This script optimizes the build for PWA deployment

echo "🔨 Building Förderplan PWA..."

# Clean previous build
rm -rf build/

# Set production environment
export NODE_ENV=production

# Build the application
npm run build

echo "📝 Validating PWA build..."

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "❌ Build directory not found!"
    exit 1
fi

# Check manifest
if [ ! -f "build/manifest.json" ]; then
    echo "❌ PWA manifest not found!"
    exit 1
else
    echo "✅ PWA manifest found"
fi

# Check icons
if [ ! -f "build/icon-192.png" ] || [ ! -f "build/icon-512.png" ]; then
    echo "❌ PWA icons missing!"
    exit 1
else
    echo "✅ PWA icons found"
fi

# Check service worker
if [ ! -f "build/sw.js" ] && [ ! -f "build/service-worker.js" ]; then
    echo "⚠️  Service worker not found (might be embedded)"
else
    echo "✅ Service worker found"
fi

# Display build info
echo ""
echo "📊 Build Statistics:"
echo "==================="
echo "📁 Build size: $(du -sh build/ | cut -f1)"
echo "📄 Files: $(find build/ -type f | wc -l)"
echo "🖼️  Icons: $(ls build/icon-*.png 2>/dev/null | wc -l)"
echo "📱 PWA ready: ✅"
echo ""

echo "🚀 PWA build completed successfully!"
echo ""
echo "To serve locally for testing:"
echo "  npm run preview"
echo ""
echo "To test on network devices:"
echo "  npm run dev:network"
