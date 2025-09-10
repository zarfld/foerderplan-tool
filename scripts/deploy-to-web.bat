@echo off
REM Deploy Förderplan Tool to \\EttingsTest\web
REM Simple batch script wrapper for PowerShell deployment

echo.
echo ========================================
echo   Foerderplan Tool - Network Deployment
echo ========================================
echo.

REM Check if build directory exists
if not exist "build\" (
    echo ERROR: Build directory not found!
    echo Please run 'npm run build' first.
    echo.
    pause
    exit /b 1
)

echo Deploying to \\EttingsTest\web...
echo.

REM Run PowerShell deployment script
powershell -ExecutionPolicy Bypass -File "scripts\deploy-to-web.ps1" -TargetPath "\\EttingsTest\web" -SubFolder "foerderplan-tool" -Force -Backup

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Deployment completed successfully!
    echo ========================================
    echo.
    echo The application is now available at:
    echo   \\EttingsTest\web\foerderplan-tool\
    echo.
    echo You can access it via:
    echo   - Web browser from the network
    echo   - Direct file access
    echo   - Mobile devices for PWA installation
    echo.
) else (
    echo.
    echo ========================================
    echo   Deployment failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause
