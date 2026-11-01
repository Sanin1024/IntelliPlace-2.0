Write-Host "=== GIT STATUS ==="
git status

Write-Host "=== GIT LS-FILES (SECRET / UPLOADS / GENERATED CHECK) ==="
git ls-files | findstr /i "\.env uploads generated"

Write-Host "=== CONFIRMATION ==="
$envFiles = git ls-files | Select-String -Pattern "(^|/)\.env$"
$uploadFiles = git ls-files | Select-String -Pattern "(^|/)uploads/"
$genFiles = git ls-files | Select-String -Pattern "(^|/)generated/"

if ($null -eq $envFiles -and $null -eq $uploadFiles -and $null -eq $genFiles) {
    Write-Host "CONFIRMED: Zero .env secret files, zero uploads directories, and zero generated clients are tracked in git."
} else {
    Write-Host "WARNING: Unwanted files detected!"
}

Write-Host "=== GIT COMMIT ==="
git commit -m "Initial baseline commit: IntelliPlace verification baseline"

Write-Host "=== GIT LOG ==="
git log --oneline -n 5
