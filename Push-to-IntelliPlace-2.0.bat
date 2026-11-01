@echo off
setlocal EnableExtensions

REM Push all Git-trackable changes from IntelliPlace 2.0 to GitHub.
set "PROJECT_DIR=D:\S7 Project 2.0\intelliplace"
set "REMOTE_URL=https://github.com/Sanin1024/IntelliPlace-2.0.git"
set "BRANCH=main"

title IntelliPlace 2.0 - GitHub Push
 echo.
echo ============================================================
echo              INTELLIPLACE 2.0 - GITHUB PUSH
echo ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git was not found. Install Git for Windows and try again.
    goto :fail
)

if not exist "%PROJECT_DIR%\" (
    echo ERROR: Project directory not found:
    echo %PROJECT_DIR%
    goto :fail
)

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
    echo ERROR: Could not open the project directory.
    goto :fail
)

REM Initialize Git if this folder is not already a repository.
if not exist ".git\" (
    echo Initializing Git repository...
    git init -b %BRANCH%
    if errorlevel 1 goto :gitfail
)

REM Add or correct the GitHub remote named origin.
set "CURRENT_REMOTE="
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "CURRENT_REMOTE=%%R"

if not defined CURRENT_REMOTE (
    echo Adding GitHub remote...
    git remote add origin "%REMOTE_URL%"
    if errorlevel 1 goto :gitfail
) else if /I not "%CURRENT_REMOTE%"=="%REMOTE_URL%" (
    echo Updating origin remote URL...
    git remote set-url origin "%REMOTE_URL%"
    if errorlevel 1 goto :gitfail
)

echo.
echo Staging all non-ignored project files...
git add -A
if errorlevel 1 goto :gitfail

echo.
echo Files staged for commit:
git status --short

echo.
echo IMPORTANT: Check the list above for secrets such as .env files,
echo API keys, passwords, database credentials, or private certificates.
echo Git will not add files excluded by .gitignore, but already-tracked
echo files can still be included.
echo.
choice /C YN /N /M "Continue with commit and push? [Y/N] "
if errorlevel 2 (
    echo.
    echo Cancelled. Your changes remain staged locally; nothing was pushed.
    goto :end
)

REM Commit only when there are staged changes.
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Update IntelliPlace 2.0"
    if errorlevel 1 (
        echo.
        echo ERROR: Commit failed. Check your Git user.name and user.email settings.
        goto :fail
    )
) else (
    echo.
    echo No new staged changes to commit.
)

REM Ensure the local branch is named main.
git branch -M %BRANCH%
if errorlevel 1 goto :gitfail

echo.
echo Pushing branch %BRANCH% to GitHub...
git push -u origin %BRANCH%
if errorlevel 1 (
    echo.
    echo PUSH FAILED.
    echo Possible causes: authentication is required, the remote has
    echo commits not present locally, or network access is unavailable.
    echo No force push was attempted, so remote history was not overwritten.
    goto :fail
)

echo.
echo ============================================================
echo SUCCESS: IntelliPlace 2.0 has been pushed to GitHub.
echo Repository: %REMOTE_URL%
echo Branch:     %BRANCH%
echo ============================================================
goto :end

:gitfail
echo.
echo ERROR: A Git operation failed. Review the message above.
goto :fail

:fail
echo.
pause
exit /b 1

:end
echo.
pause
exit /b 0
