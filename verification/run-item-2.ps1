# PowerShell script to execute item 2 fresh raw runs in exact sequence
$ErrorActionPreference = 'Continue'

function Stop-Port4000 {
    $conns = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        if ($c.OwningProcess -gt 0) {
            Write-Host "Stopping process on port 4000: $($c.OwningProcess)"
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
}

function Run-Step([string]$title, [scriptblock]$action) {
    Write-Host "================================================================"
    Write-Host ">>> STEP: $title"
    Write-Host "================================================================"
    & $action
}

# 1. npm run demo:reset
Run-Step "1. npm run demo:reset" {
    npm run demo:reset
}

# 2. npm run db:counts
Run-Step "2. npm run db:counts (initial)" {
    npm run db:counts
}

# 3. Start test server (NODE_ENV=test, CODE_RUNNER_ENABLED=true)
Run-Step "3. Start test server (NODE_ENV=test, CODE_RUNNER_ENABLED=true)" {
    Stop-Port4000

    $backendDir = (Resolve-Path "backend").Path
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c npx tsx src/app.ts"
    $psi.WorkingDirectory = $backendDir
    $psi.EnvironmentVariables["NODE_ENV"] = "test"
    $psi.EnvironmentVariables["CODE_RUNNER_ENABLED"] = "true"
    $psi.EnvironmentVariables["PORT"] = "4000"
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $testServerProcess = [System.Diagnostics.Process]::Start($psi)
    Write-Host "Started test server runner PID: $($testServerProcess.Id)"

    # Wait for test server to become responsive
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 600
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:4000/api/problems/runner-status" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $ready = $true
                Write-Host "Test server is ready on port 4000! Status 200 received."
                break
            }
        } catch {}
    }
    if (-not $ready) {
        Write-Host "WARNING: Test server did not report ready in 18s"
    }

    # 4. npm run e2e
    Run-Step "4. npm run e2e" {
        npm run e2e
    }

    # 5. npm run smoke
    Run-Step "5. npm run smoke" {
        npm run smoke
    }

    # Stop test server
    Write-Host "Stopping test server on port 4000..."
    Stop-Port4000
    if (-not $testServerProcess.HasExited) {
        Stop-Process -Id $testServerProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

# 6. npm run db:counts again
Run-Step "6. npm run db:counts (after e2e & smoke)" {
    npm run db:counts
}

# 7. npm run validate:content
Run-Step "7. npm run validate:content" {
    npm run validate:content
}

# Restore normal dev server (NODE_ENV=development, CODE_RUNNER_ENABLED=false)
Write-Host "================================================================"
Write-Host ">>> Restoring normal dev server on port 4000"
Write-Host "================================================================"
Stop-Port4000

$backendDir = (Resolve-Path "backend").Path
$psiDev = New-Object System.Diagnostics.ProcessStartInfo
$psiDev.FileName = "cmd.exe"
$psiDev.Arguments = "/c npx tsx src/app.ts"
$psiDev.WorkingDirectory = $backendDir
$psiDev.EnvironmentVariables["NODE_ENV"] = "development"
$psiDev.EnvironmentVariables["CODE_RUNNER_ENABLED"] = "false"
$psiDev.EnvironmentVariables["PORT"] = "4000"
$psiDev.UseShellExecute = $false
$psiDev.CreateNoWindow = $true

$devProc = [System.Diagnostics.Process]::Start($psiDev)
Write-Host "Restored dev server runner PID: $($devProc.Id)"
Start-Sleep -Seconds 3
