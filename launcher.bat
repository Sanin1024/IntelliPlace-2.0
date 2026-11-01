@echo off
setlocal EnableDelayedExpansion

:: ============================================================
:: IntelliPlace Local Development Launcher
:: ============================================================

title IntelliPlace Launcher

echo ============================================================
echo               IntelliPlace Launcher (Windows)
echo      Unified Placement ^& Readiness Management Platform
echo ============================================================
echo.

:: Parse check / dry-run mode
set "DRY_RUN=0"
if /i "%~1"=="--check" set "DRY_RUN=1"
if /i "%~1"=="--dry-run" set "DRY_RUN=1"
if /i "%~1"=="-c" set "DRY_RUN=1"

if "!DRY_RUN!"=="1" (
    echo [INFO] Running in check / dry-run mode. No changes will be made.
    echo.
)

:: 1. Navigate to script's directory (workspace root)
cd /d "%~dp0"
echo [INFO] Working directory: %CD%
echo.

:: 2. Check Prerequisites: Node.js (Enforce >= 18)
where node >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js [v18 or higher] from https://nodejs.org/
    echo.
    if "!DRY_RUN!"=="0" pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"

:: Parse major version number (e.g. v20.12.0 -> 20)
set "NV=!NODE_VER:v=!"
set "NODE_MAJOR="
for /f "tokens=1 delims=." %%a in ("!NV!") do set "NODE_MAJOR=%%a"

if not defined NODE_MAJOR (
    echo [ERROR] Could not determine Node.js version from "!NODE_VER!".
    if "!DRY_RUN!"=="0" pause
    exit /b 1
)

if !NODE_MAJOR! LSS 18 (
    echo [ERROR] Node.js version !NODE_VER! is installed, but Node.js 18 or higher is required.
    echo Please upgrade Node.js from https://nodejs.org/
    echo.
    if "!DRY_RUN!"=="0" pause
    exit /b 1
)
echo [OK] Node.js is installed: !NODE_VER!

:: 3. Check Prerequisites: npm
where npm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] npm was not found in your PATH.
    echo Please ensure npm is installed and accessible.
    echo.
    if "!DRY_RUN!"=="0" pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
echo [OK] npm is installed: !NPM_VER!

:: 4. Check Backend Configuration (.env)
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo.
        echo [WARN] Backend configuration file "backend\.env" is missing.
        echo [INFO] Template found at "backend\.env.example".
        if "!DRY_RUN!"=="1" (
            echo [INFO] Would prompt to copy "backend\.env.example" to "backend\.env".
        ) else (
            set "COPY_ENV=Y"
            set /p "COPY_ENV=Copy backend\.env.example to backend\.env now? [Y/n, default=Y]: "
            if "!COPY_ENV!"=="" set "COPY_ENV=Y"
            if /i "!COPY_ENV!"=="Y" (
                copy "backend\.env.example" "backend\.env" >nul
                if !ERRORLEVEL! equ 0 (
                    echo [OK] Created backend\.env from backend\.env.example.
                ) else (
                    echo [ERROR] Failed to copy backend\.env.example to backend\.env.
                    pause
                    exit /b 1
                )
            ) else (
                echo [ERROR] Backend configuration file "backend\.env" is required.
                pause
                exit /b 1
            )
        )
    ) else (
        echo.
        echo [ERROR] Backend configuration file "backend\.env" is missing and "backend\.env.example" was not found!
        echo.
        if "!DRY_RUN!"=="0" pause
        exit /b 1
    )
)
if exist "backend\.env" (
    echo [OK] Backend environment configuration found [backend\.env]
)

:: 5. Check Dependencies (node_modules)
if not exist "node_modules" (
    echo.
    echo [WARN] Project dependencies [node_modules] not found.
    if "!DRY_RUN!"=="1" (
        echo [INFO] Would install dependencies across workspaces [npm install].
    ) else (
        echo [INFO] Installing dependencies across workspaces...
        call npm install
        if !ERRORLEVEL! neq 0 (
            echo.
            echo [ERROR] Dependency installation failed.
            pause
            exit /b 1
        )
        echo [OK] Dependencies successfully installed.
    )
) else (
    echo [OK] Root dependencies present [node_modules]
)

:: 6. Check Database (PostgreSQL port 5433)
set "PG_FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":5433 .*LISTENING"') do (
    set "PG_FOUND=1"
)

if "!PG_FOUND!"=="0" (
    echo [INFO] PostgreSQL was not detected on port 5433.

    if "!DRY_RUN!"=="1" (
        echo [INFO] Would check Docker and start PostgreSQL container via "docker compose up -d --wait postgres".
    ) else (
        :: Check if Docker CLI is installed
        where docker >nul 2>&1
        if !ERRORLEVEL! neq 0 (
            echo [ERROR] Docker command was not found in your PATH.
            echo Please install Docker Desktop and ensure "docker" is accessible from command line.
            set "DOCKER_AVAILABLE=0"
        ) else (
            set "DOCKER_AVAILABLE=1"
        )

        if "!DOCKER_AVAILABLE!"=="1" (
            :: Check if Docker daemon is responsive
            docker info >nul 2>&1
            if !ERRORLEVEL! neq 0 (
                echo [INFO] Docker daemon is not running.
                if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
                    echo [INFO] Launching Docker Desktop...
                    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
                    echo [INFO] Waiting for Docker engine to initialize...
                    for /l %%w in (1,1,15) do (
                        if "!PG_FOUND!"=="0" (
                            powershell -NoProfile -Command "Start-Sleep -Seconds 3"
                            docker info >nul 2>&1
                            if !ERRORLEVEL! equ 0 (
                                echo [OK] Docker engine is now ready.
                                echo [INFO] Starting PostgreSQL container via Docker Compose...
                                docker compose up -d --wait postgres
                                for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":5433 .*LISTENING"') do (
                                    set "PG_FOUND=1"
                                )
                            )
                        )
                    )
                ) else (
                    echo [WARN] Docker Desktop was not found at standard location.
                )
            ) else (
                echo [INFO] Starting PostgreSQL container via Docker Compose...
                docker compose up -d --wait postgres
                if !ERRORLEVEL! neq 0 (
                    echo [ERROR] "docker compose up -d --wait postgres" failed.
                )
                for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":5433 .*LISTENING"') do (
                    set "PG_FOUND=1"
                )
            )
        )

        if "!PG_FOUND!"=="1" (
            echo [OK] PostgreSQL service successfully started on port 5433.
        ) else (
            echo.
            echo ============================================================
            echo [ERROR] PostgreSQL database is NOT running on port 5433!
            echo ============================================================
            echo IntelliPlace requires PostgreSQL to authenticate and operate.
            echo If you proceed without it, logging in will fail with
            echo "Database unavailable" or "Internal Server Error".
            echo.
            echo Please ensure Docker Desktop is running, or execute:
            echo   docker compose up -d --wait postgres
            echo ============================================================
            echo.
            set "PROCEED_NO_DB=N"
            set /p "PROCEED_NO_DB=Proceed anyway without database? [y/N, default=N]: "
            if "!PROCEED_NO_DB!"=="" set "PROCEED_NO_DB=N"
            if /i not "!PROCEED_NO_DB!"=="Y" (
                echo [INFO] Launcher stopped. Please start PostgreSQL and run launcher again.
                echo.
                pause
                exit /b 1
            )
        )
    )
) else (
    echo [OK] PostgreSQL service detected on port 5433.
)
echo.

:: 7. Port Conflict Detection & Handling
echo Checking for port conflicts...

:: Check Port 4000 (Backend)
set "PID_4000="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":4000 .*LISTENING"') do (
    set "PID_4000=%%a"
)
if defined PID_4000 (
    set "PROC_4000=unknown"
    for /f "tokens=1" %%i in ('tasklist /FI "PID eq !PID_4000!" /NH 2^>nul') do (
        if not "%%i"=="INFO:" set "PROC_4000=%%i"
    )
    echo [WARN] Port 4000 [Backend] is currently occupied by !PROC_4000! [PID: !PID_4000!]
    if "!DRY_RUN!"=="1" (
        echo [INFO] Would prompt to terminate process !PROC_4000! [PID: !PID_4000!, default=N].
    ) else (
        set "KILL_4000=N"
        set /p "KILL_4000=Terminate process !PROC_4000! [PID: !PID_4000!] to free port 4000? [y/N, default=N]: "
        if "!KILL_4000!"=="" set "KILL_4000=N"
        if /i "!KILL_4000!"=="Y" (
            taskkill /F /PID !PID_4000! >nul 2>&1
            echo [OK] Process !PID_4000! [!PROC_4000!] terminated.
        ) else (
            echo [WARN] Proceeding without terminating. Backend may fail to bind to port 4000.
        )
    )
) else (
    echo [OK] Port 4000 [Backend] is free.
)

:: Check Port 5173 (Frontend)
set "PID_5173="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":5173 .*LISTENING"') do (
    set "PID_5173=%%a"
)
if defined PID_5173 (
    set "PROC_5173=unknown"
    for /f "tokens=1" %%i in ('tasklist /FI "PID eq !PID_5173!" /NH 2^>nul') do (
        if not "%%i"=="INFO:" set "PROC_5173=%%i"
    )
    echo [WARN] Port 5173 [Frontend] is currently occupied by !PROC_5173! [PID: !PID_5173!]
    if "!DRY_RUN!"=="1" (
        echo [INFO] Would prompt to terminate process !PROC_5173! [PID: !PID_5173!, default=N].
    ) else (
        set "KILL_5173=N"
        set /p "KILL_5173=Terminate process !PROC_5173! [PID: !PID_5173!] to free port 5173? [y/N, default=N]: "
        if "!KILL_5173!"=="" set "KILL_5173=N"
        if /i "!KILL_5173!"=="Y" (
            taskkill /F /PID !PID_5173! >nul 2>&1
            echo [OK] Process !PID_5173! [!PROC_5173!] terminated.
        ) else (
            echo [WARN] Proceeding without terminating. Frontend may use a different port.
        )
    )
) else (
    echo [OK] Port 5173 [Frontend] is free.
)
echo.

:: 8. Check if dry-run / check mode was requested
if "!DRY_RUN!"=="1" (
    echo [OK] All pre-flight checks completed successfully. Dry run finished.
    exit /b 0
)

:: 9. Start Backend & Frontend in separate terminal windows
echo ============================================================
echo               Launching Development Servers
echo ============================================================
echo [INFO] Starting Backend API in a separate terminal window...
start "IntelliPlace - Backend API (Port 4000)" cmd /k "title IntelliPlace - Backend (Port 4000) && echo ======================================== && echo  IntelliPlace Backend Server [Port 4000] && echo ======================================== && npm run dev:backend"

echo [INFO] Starting Frontend Dev Server in a separate terminal window...
start "IntelliPlace - Frontend (Port 5173)" cmd /k "title IntelliPlace - Frontend [Port 5173] && echo ======================================== && echo  IntelliPlace Frontend Vite Server [Port 5173] && echo ======================================== && npm run dev:frontend"
echo.

:: 10. Wait for Backend and Frontend Readiness, then Launch Browser
echo [INFO] Waiting for backend (http://localhost:4000/api/health) and frontend (http://localhost:5173) to be ready...
powershell -NoProfile -Command "$bReady = $false; $fReady = $false; $sw = [System.Diagnostics.Stopwatch]::StartNew(); while ($sw.Elapsed.TotalSeconds -lt 30) { if (-not $bReady) { try { $r = Invoke-WebRequest -Uri 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $bReady = $true } } catch {} }; if (-not $fReady) { try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $fReady = $true } } catch {} }; if ($bReady -and $fReady) { break }; Start-Sleep -Seconds 1 }; if ($bReady -and $fReady) { exit 0 } else { if (-not $bReady) { Write-Host '[WARN] Backend health check timed out (http://localhost:4000/api/health)' }; if (-not $fReady) { Write-Host '[WARN] Frontend server timed out (http://localhost:5173)' }; exit 1 }"
if !ERRORLEVEL! equ 0 (
    echo [OK] Both servers are healthy and responding.
) else (
    echo [WARN] Timed out waiting for servers to report ready (max 30s). Opening browser anyway...
)

echo [INFO] Opening IntelliPlace in your default browser...
start "" "http://localhost:5173/login"

echo.
echo ============================================================
echo                 IntelliPlace is now Running!
echo ============================================================
echo.
echo   * Web Application: http://localhost:5173/login
echo   * Backend API:     http://localhost:4000/api
echo   * Health Endpoint: http://localhost:4000/api/health
echo.
echo   Default Demo Accounts:
echo     - Admin:     admin@intelliplace.edu    / Admin@123
echo     - PO:        po@intelliplace.edu       / Po@12345
echo     - Trainer:   trainer1@intelliplace.edu / Trainer@123
echo     - Student:   alice@student.edu         / Student@123
echo.
echo ============================================================
echo Keep the backend and frontend terminal windows open.
echo To stop all services, run stop-dev.bat.
echo ============================================================
echo.
pause