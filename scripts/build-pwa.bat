@echo off
REM PWA Build Script for Windows - Förderplan echo 📁 Build directory ready: build\
echo 📱 PWA ready: ✅l
REM This script optimizes the build for PWA deployment on Windows

echo 🔨 Building Förderplan PWA for Windows...

REM Clean previous build
if exist build rmdir /s /q build

REM Set production environment
set NODE_ENV=production

REM Build the application
call npm run build

echo 📝 Validating PWA build...

REM Check if build directory exists
if not exist build (
    echo ❌ Build directory not found!
    exit /b 1
)

REM Check manifest
if not exist build\manifest.webmanifest (
    echo ❌ PWA manifest not found!
    exit /b 1
) else (
    echo ✅ PWA manifest found
)

REM Check icons
if not exist build\icon-192.png (
    echo ❌ PWA icon 192px missing!
    exit /b 1
)
if not exist build\icon-512.png (
    echo ❌ PWA icon 512px missing!
    exit /b 1
)
echo ✅ PWA icons found

REM Check service worker
if exist build\sw.js (
    echo ✅ Service worker found
) else if exist build\service-worker.js (
    echo ✅ Service worker found
) else if exist build\registerSW.js (
    echo ✅ Service worker registration found
) else (
    echo ⚠️  Service worker not found (might be embedded)
)

echo.
echo 📊 Build Statistics:
echo ===================
for /f %%i in ('dir build /s /-c ^| find "File(s)"') do echo 📄 Files: %%i
echo 📁 Build directory ready
echo �️  Client files: .svelte-kit\output\client
echo �📱 PWA ready: ✅
echo.

echo 🚀 PWA build completed successfully!
echo.
echo To serve locally for testing:
echo   npm run preview
echo.
echo To test on network (Android devices):
echo   npm run dev:network
echo.
echo Windows 10 is serving as web server for Android devices.
echo Access from Android: http://[YOUR-PC-IP]:5173
echo.

REM Get local IP for Android access
echo Your PC IP addresses:
ipconfig | findstr /i "IPv4"

pause
