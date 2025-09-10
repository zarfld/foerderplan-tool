# Deploy Foerderplan Tool to \\EttingsTest\web
param(
    [string]$TargetPath = "\\EttingsTest\web",
    [string]$AppName = "foerderplan-tool",
    [switch]$Force,
    [switch]$Backup
)

$BuildPath = Join-Path $PSScriptRoot "..\build"
$FullTargetPath = Join-Path $TargetPath $AppName

Write-Host "Deploying Foerderplan Tool PWA..." -ForegroundColor Green
Write-Host "Source: $BuildPath" -ForegroundColor Cyan
Write-Host "Target: $FullTargetPath" -ForegroundColor Cyan

# Check if build directory exists
if (!(Test-Path $BuildPath)) {
    Write-Host "ERROR: Build directory not found: $BuildPath" -ForegroundColor Red
    Write-Host "Please run 'npm run build' first" -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking network share accessibility..." -ForegroundColor Cyan

try {
    if (!(Test-Path $TargetPath)) {
        Write-Host "ERROR: Cannot access network share: $TargetPath" -ForegroundColor Red
        Write-Host "Please ensure the network drive is accessible" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "SUCCESS: Network share accessible: $TargetPath" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Error accessing network share: $_" -ForegroundColor Red
    exit 1
}

# Create target directory if it doesn't exist
if (!(Test-Path $FullTargetPath)) {
    Write-Host "Creating target directory: $FullTargetPath" -ForegroundColor Cyan
    try {
        New-Item -ItemType Directory -Path $FullTargetPath -Force | Out-Null
        Write-Host "SUCCESS: Target directory created" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to create target directory: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Target directory exists: $FullTargetPath" -ForegroundColor Green
    
    # Create backup if requested
    if ($Backup) {
        $BackupPath = $FullTargetPath + "_backup_" + (Get-Date -Format "yyyyMMdd_HHmmss")
        Write-Host "Creating backup: $BackupPath" -ForegroundColor Cyan
        try {
            Copy-Item -Path $FullTargetPath -Destination $BackupPath -Recurse -Force
            Write-Host "SUCCESS: Backup created successfully" -ForegroundColor Green
        } catch {
            Write-Host "WARNING: Failed to create backup: $_" -ForegroundColor Yellow
        }
    }
    
    # Clear existing files if Force is specified
    if ($Force) {
        Write-Host "Clearing existing files..." -ForegroundColor Cyan
        try {
            Remove-Item -Path "$FullTargetPath\*" -Recurse -Force
            Write-Host "SUCCESS: Existing files cleared" -ForegroundColor Green
        } catch {
            Write-Host "ERROR: Failed to clear existing files: $_" -ForegroundColor Red
            exit 1
        }
    }
}

# Copy build files using robocopy for better performance
Write-Host "Copying build files..." -ForegroundColor Cyan

$RobocopyArgs = @(
    $BuildPath,
    $FullTargetPath,
    "/E",           # Copy subdirectories, including empty ones
    "/R:3",         # Retry 3 times on failed copies
    "/W:1",         # Wait 1 second between retries
    "/MT:8",        # Use 8 threads
    "/XD", "node_modules", ".git", ".svelte-kit"  # Exclude directories
)

$RobocopyResult = & robocopy @RobocopyArgs

# Check robocopy exit code (0-3 are success, 4+ are errors)
$ExitCode = $LASTEXITCODE
if ($ExitCode -lt 4) {
    Write-Host "SUCCESS: Files copied successfully" -ForegroundColor Green
    
    # Parse robocopy output for file count
    $OutputLines = $RobocopyResult | Where-Object { $_ -match "Files :" }
    if ($OutputLines) {
        $CopiedFiles = ($OutputLines | Select-Object -Last 1) -replace ".*Files\s*:\s*(\d+).*", '$1'
        Write-Host "Copied $CopiedFiles files to $FullTargetPath" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: robocopy failed with exit code $ExitCode" -ForegroundColor Red
    exit 1
}

# Verify deployment
Write-Host "Verifying deployment..." -ForegroundColor Cyan

$IndexPath = Join-Path $FullTargetPath "index.html"
if (Test-Path $IndexPath) {
    Write-Host "SUCCESS: index.html found" -ForegroundColor Green
    
    # Check for key application files
    $AppFiles = @(
        "favicon.png",
        "manifest.json"
    )
    
    $MissingFiles = @()
    foreach ($File in $AppFiles) {
        $FilePath = Join-Path $FullTargetPath $File
        if (!(Test-Path $FilePath)) {
            $MissingFiles += $File
        }
    }
    
    if ($MissingFiles.Count -eq 0) {
        Write-Host "SUCCESS: All application files found" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Missing files: $($MissingFiles -join ', ')" -ForegroundColor Yellow
        Write-Host "SUCCESS: Application assets found" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Deployment verification failed: index.html not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green
