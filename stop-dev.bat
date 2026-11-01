@echo off
setlocal EnableDelayedExpansion

:: ============================================================
:: IntelliPlace Development Server Stopper
:: ============================================================

title IntelliPlace Stopper

echo ============================================================
echo               IntelliPlace Development Stopper
echo      Frees ports 4000 (Backend) and 5173 (Frontend)
echo ============================================================
echo.

cd /d "%~dp0"

:: Parse optional -y / --force flag
set "FORCE=0"
if /i "%~1"=="-y" set "FORCE=1"
if /i "%~1"=="--force" set "FORCE=1"

set "FOUND_ANY=0"

:: 1. Check Port 4000 (Backend)
set "PID_4000="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":4000 .*LISTENING"') do (
    set "PID_4000=%%a"
)

if defined PID_4000 (
    set "FOUND_ANY=1"
    set "PROC_4000=unknown"
    for /f "tokens=1" %%i in ('tasklist /FI "PID eq !PID_4000!" /NH 2^>nul') do (
        if not "%%i"=="INFO:" set "PROC_4000=%%i"
    )
    echo [FOUND] Port 4000 [Backend] is occupied by !PROC_4000! [PID: !PID_4000!]
) else (
    echo [OK] Port 4000 [Backend] is not in use.
)

:: 2. Check Port 5173 (Frontend)
set "PID_5173="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":5173 .*LISTENING"') do (
    set "PID_5173=%%a"
)

if defined PID_5173 (
    set "FOUND_ANY=1"
    set "PROC_5173=unknown"
    for /f "tokens=1" %%i in ('tasklist /FI "PID eq !PID_5173!" /NH 2^>nul') do (
        if not "%%i"=="INFO:" set "PROC_5173=%%i"
    )
    echo [FOUND] Port 5173 [Frontend] is occupied by !PROC_5173! [PID: !PID_5173!]
) else (
    echo [OK] Port 5173 [Frontend] is not in use.
)

echo.

if "!FOUND_ANY!"=="0" (
    echo [INFO] Neither port 4000 nor port 5173 is currently occupied.
    echo Nothing to stop.
    goto :check_postgres
)

:: Prompt for confirmation unless -y / --force
if "!FORCE!"=="0" (
    set "CONFIRM=N"
    set /p "CONFIRM=Do you want to terminate these development servers? [y/N, default=N]: "
    if "!CONFIRM!"=="" set "CONFIRM=N"
    if /i not "!CONFIRM!"=="Y" (
        echo [INFO] Operation cancelled. No processes were terminated.
        goto :check_postgres
    )
)

:: Terminate processes
if defined PID_4000 (
    taskkill /F /PID !PID_4000! >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] Backend process !PID_4000! [!PROC_4000!] terminated.
    ) else (
        echo [WARN] Failed to terminate PID !PID_4000!. It may have already exited.
    )
)

if defined PID_5173 (
    taskkill /F /PID !PID_5173! >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] Frontend process !PID_5173! [!PROC_5173!] terminated.
    ) else (
        echo [WARN] Failed to terminate PID !PID_5173!. It may have already exited.
    )
)

:check_postgres
echo.
:: Check if PostgreSQL container is listening on port 5433
set "PG_RUNNING=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":5433 .*LISTENING"') do (
    set "PG_RUNNING=1"
)
if "!PG_RUNNING!"=="1" (
    echo [INFO] PostgreSQL is running on port 5433.
    echo        To also stop the database container, run:
    echo        docker compose down
)

echo.
echo ============================================================
echo [OK] Stop script completed.
echo ============================================================
