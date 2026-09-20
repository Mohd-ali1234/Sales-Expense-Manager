# Usage:  .\scripts\release.ps1 1.0.1
# Bumps the app version, commits, tags and pushes. GitHub Actions then builds
# the installer and publishes the release; installed apps will offer the update.
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version must look like 1.2.3" }
if (git status --porcelain) { throw "You have uncommitted changes. Commit them first (git add -A; git commit -m '...')." }

Push-Location desktop
npm version $Version --no-git-tag-version --allow-same-version | Out-Null
Pop-Location

git add desktop/package.json desktop/package-lock.json
if (git status --porcelain) { git commit -m "Release v$Version" }
git tag "v$Version"
git push origin HEAD
git push origin "v$Version"
Write-Host "Pushed v$Version. Watch the build: gh run watch  (or the Actions tab on GitHub)"
