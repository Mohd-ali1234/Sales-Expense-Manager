# Usage:  .\scripts\release.ps1 1.0.1
# Bumps the app version, commits, tags and pushes. GitHub Actions then builds
# the installer and publishes the release; installed apps will offer the update.
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [string]$Notes = ""
)
# Continue: git prints harmless CRLF warnings on stderr, which "Stop" would treat as errors.
$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version must look like 1.2.3" }
if (git status --porcelain) { throw "You have uncommitted changes. Commit them first (git add -A; git commit -m '...')." }

Push-Location desktop
npm version $Version --no-git-tag-version --allow-same-version | Out-Null
Pop-Location

git add desktop/package.json desktop/package-lock.json
if (git status --porcelain) { git commit -m "Release v$Version" }
git tag -a "v$Version" -m "v$Version`n`n$Notes"
git push origin HEAD
if ($LASTEXITCODE) { throw "git push failed" }
git push origin "v$Version"
if ($LASTEXITCODE) { throw "pushing the tag failed" }
Write-Host "Pushed v$Version. Watch the build: gh run watch  (or the Actions tab on GitHub)"
