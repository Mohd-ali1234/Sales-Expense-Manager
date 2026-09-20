# Paan Ledger — Sales & expense manager

Daily sales / expense ledger and a drag-and-drop monthly calculation builder.

- **Frontend:** React + Vite (`frontend/`)
- **Backend:** FastAPI + SQLite (`backend/`)
- **Desktop app:** Electron (`desktop/`) — bundles the backend, auto-updates from GitHub Releases

## Install (users)

Download **Paan-Ledger-Setup-x.y.z.exe** from the [Releases](../../releases) page and run it.
Your data is stored locally in `%APPDATA%\Paan Ledger\pan_parlour.db` and is kept across updates.

## Run in development

```bash
# backend
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn main:app --reload --port 8010

# frontend (new terminal)
cd frontend
npm install
npm run dev        # http://localhost:5180 (proxies /api to :8010)
```

## Build the desktop app locally

```powershell
cd frontend; npm install; npm run build; cd ..
cd backend; pip install -r requirements.txt pyinstaller; ./build_server.ps1; cd ..
cd desktop; npm install; npm run dist      # installer ends up in desktop/dist
```

## Publish a new version (and have the app show "update available")

1. Commit your code changes (`git add -A; git commit -m "..."`).
2. Run:
   ```powershell
   .\scripts\release.ps1 1.0.1 "What changed in this version"
   ```
   This bumps the version, tags `v1.0.1` and pushes. GitHub Actions
   (`.github/workflows/release.yml`) builds the installer and publishes a GitHub Release.
3. Installed apps check for updates on start (and every 4 hours, or via the
   **Check for updates** button in the top bar). When a newer release exists a green banner
   appears: **Download update -> Restart & update**.

The version number must always go up (`1.0.0` -> `1.0.1`), otherwise the app will not see it as an update.
