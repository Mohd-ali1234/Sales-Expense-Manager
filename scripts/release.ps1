# Usage:  .\scripts\release.ps1 1.0.1
# Builds the installer on this PC, tags the version and uploads it to a GitHub Release.
# Installed apps then show "New version available" inside the app.
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version must look like 1.2.3" }
if (git status --porcelain) { throw "You have uncommitted changes. Commit them first (git add -A; git commit -m '...')." }
if (git tag --list "v$Version") { throw "Tag v$Version already exists - use a higher version number." }
gh auth status | Out-Null

Write-Host "==> Bumping version to $Version"
Push-Location desktop
npm version $Version --no-git-tag-version --allow-same-version | Out-Null
Pop-Location

Write-Host "==> Building frontend"
Push-Location frontend; npm install --silent; npm run build; if ($LASTEXITCODE) { throw "frontend build failed" }; Pop-Location

Write-Host "==> Building backend exe"
$venvPy = Join-Path $root "backend\.venv\Scripts"
if (Test-Path $venvPy) { $env:PATH = "$venvPy;$env:PATH" }
Push-Location backend; ./build_server.ps1; Pop-Location

Write-Host "==> Building installer"
Push-Location desktop
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm install --silent
npx electron-builder --win --publish never
if ($LASTEXITCODE) { throw "electron-builder failed" }
Pop-Location

Write-Host "==> Committing and tagging"
git add desktop/package.json desktop/package-lock.json
if (git status --porcelain) { git commit -m "Release v$Version" }
git tag "v$Version"
git push origin HEAD
git push origin "v$Version"

Write-Host "==> Publishing GitHub release"
$dist = Join-Path $root "desktop\dist"
$assets = @("Paan-Ledger-Setup-$Version.exe", "Paan-Ledger-Setup-$Version.exe.blockmap", "latest.yml") | ForEach-Object { Join-Path $dist $_ }
gh release create "v$Version" @assets --title "Paan Ledger v$Version" --generate-notes
Write-Host "Done. Release v$Version is live."
