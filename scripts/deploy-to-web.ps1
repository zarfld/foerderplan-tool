# Deploy Förderplan Tool to \\EttingsTest\web
# PowerShell deployment script for Windows network share

param(
    [string]$TargetPath = "\\EttingsTest\web",
    [string]$SubFolder = "foerderplan-tool",
    [switch]$Force,
    [switch]$Backup
)

Write-Host "🚀 Deploying Förderplan Tool PWA..." -ForegroundColor Green
Write-Host ""

# Build path
$BuildPath = ".\build"
$FullTargetPath = Join-Path $TargetPath $SubFolder

# Check if build directory exists
if (!(Test-Path $BuildPath)) {
    Write-Host "❌ Build directory not found: $BuildPath" -ForegroundColor Red
    Write-Host "Run 'npm run build' first to create the build files." -ForegroundColor Yellow
    exit 1
}

# Check if target network share is accessible
Write-Host "📡 Checking network share accessibility..." -ForegroundColor Cyan
try {
    if (!(Test-Path $TargetPath)) {
        Write-Host "❌ Cannot access network share: $TargetPath" -ForegroundColor Red
        Write-Host "Please ensure:" -ForegroundColor Yellow
        Write-Host "  - Network share is mounted and accessible" -ForegroundColor Yellow
        Write-Host "  - You have write permissions to the share" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Network share accessible: $TargetPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Error accessing network share: $_" -ForegroundColor Red
    exit 1
}

# Create target directory if it doesn't exist
if (!(Test-Path $FullTargetPath)) {
    Write-Host "📁 Creating target directory: $FullTargetPath" -ForegroundColor Cyan
    try {
        New-Item -ItemType Directory -Path $FullTargetPath -Force | Out-Null
        Write-Host "✅ Target directory created" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create target directory: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📁 Target directory exists: $FullTargetPath" -ForegroundColor Green
    
    # Create backup if requested
    if ($Backup) {
        $BackupPath = $FullTargetPath + "_backup_" + (Get-Date -Format "yyyyMMdd_HHmmss")
        Write-Host "💾 Creating backup: $BackupPath" -ForegroundColor Cyan
        try {
            Copy-Item -Path $FullTargetPath -Destination $BackupPath -Recurse -Force
            Write-Host "✅ Backup created successfully" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Warning: Failed to create backup: $_" -ForegroundColor Yellow
        }
    }
    
    # Clear existing files if Force is specified
    if ($Force) {
        Write-Host "🧹 Clearing existing files..." -ForegroundColor Cyan
        try {
            Remove-Item -Path "$FullTargetPath\*" -Recurse -Force
            Write-Host "✅ Existing files cleared" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to clear existing files: $_" -ForegroundColor Red
            exit 1
        }
    }
}

# Copy build files
Write-Host "📋 Copying build files..." -ForegroundColor Cyan
try {
    $FilesToCopy = Get-ChildItem -Path $BuildPath -Recurse
    $TotalFiles = $FilesToCopy.Count
    $CopiedFiles = 0
    
    Copy-Item -Path "$BuildPath\*" -Destination $FullTargetPath -Recurse -Force
    
    # Verify copy
    $CopiedFiles = (Get-ChildItem -Path $FullTargetPath -Recurse).Count
    Write-Host "✅ Successfully copied $CopiedFiles files to $FullTargetPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to copy files: $_" -ForegroundColor Red
    exit 1
}

# Display deployment information
Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Deployment Details:" -ForegroundColor Cyan
Write-Host "  Source: $BuildPath" -ForegroundColor White
Write-Host "  Target: $FullTargetPath" -ForegroundColor White
Write-Host "  Files:  $CopiedFiles" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Application URLs:" -ForegroundColor Cyan

# Try to determine the web URL
$WebUrl = $TargetPath -replace "\\\\([^\\]+)\\([^\\]+)", "http://`$1/`$2"
if ($SubFolder -ne "") {
    $WebUrl = "$WebUrl/$SubFolder"
}

Write-Host "  Local Network: $WebUrl" -ForegroundColor White
Write-Host "  Direct File:   file://$FullTargetPath/index.html" -ForegroundColor White
Write-Host ""
Write-Host "📱 PWA Features:" -ForegroundColor Cyan
Write-Host "  ✅ Offline functionality" -ForegroundColor Green
Write-Host "  ✅ Installable on mobile devices" -ForegroundColor Green
Write-Host "  ✅ CouchDB sync capabilities" -ForegroundColor Green
Write-Host "  ✅ Student progress tracking" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Usage Notes:" -ForegroundColor Yellow
Write-Host "  - Access via browser to use as web app" -ForegroundColor White
Write-Host "  - Use 'Add to Home Screen' on mobile devices" -ForegroundColor White
Write-Host "  - Configure CouchDB sync in Settings page" -ForegroundColor White
Write-Host "  - Application works offline after first load" -ForegroundColor White
Write-Host ""

# Check if we can test the deployment
if (Test-Path "$FullTargetPath\index.html") {
    Write-Host "✅ Deployment verification: index.html found" -ForegroundColor Green
    
    # Check if manifest.json exists
    if (Test-Path "$FullTargetPath\manifest.json") {
        Write-Host "✅ PWA manifest found" -ForegroundColor Green
    }
    
    # Check if service worker assets exist
    if (Test-Path "$FullTargetPath\_app") {
        Write-Host "✅ Application assets found" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Deployment verification failed: index.html not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green
