# Builds backend/dist/paan-ledger-server.exe (FastAPI + the built React app in one file).
# Run `npm run build` in ../frontend first.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ..\frontend\dist\index.html)) { throw "Build the frontend first (cd frontend; npm run build)" }

python -m PyInstaller --noconfirm --clean --onefile --name paan-ledger-server `
    --add-data "..\frontend\dist;static" `
    --collect-submodules uvicorn `
    run_server.py
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }
