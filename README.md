# GEO Dataset Collector

Browser extension for triaging NCBI GEO datasets with persistent review state.

## Install (Firefox)

Self-distributed, Mozilla-signed `.xpi`. Auto-updates after the initial install.

1. Download the latest signed build:
   https://github.com/makman09/GeoDatasetTrackerPlugin/raw/main/releases/xpis/geo_dataset_collector-0.1.2.xpi

   (Or browse [`releases/xpis/`](releases/xpis) for older versions.)

2. In Firefox, open `about:addons`.
3. Click the gear icon (top right) → **Install Add-on From File…**
4. Select the downloaded `.xpi`.
5. Confirm the permissions prompt.

> Already have `0.1.0` installed? That build predates auto-update support — uninstall it first, then install `0.1.2`. From `0.1.3` onward updates are automatic.

### Updates

Firefox polls for updates automatically (roughly every 24h, plus on launch). To check immediately:

`about:addons` → gear icon → **Check for Updates**.

## Install (Chrome)

No signed build — install unpacked:

1. Clone this repo.
2. `cd extension && npm install && npm run build`
3. In Chrome, open `chrome://extensions`.
4. Enable **Developer mode** (top right toggle).
5. Click **Load unpacked** → select `extension/dist/chrome/`.

Chrome unpacked extensions persist across browser restarts.

## Backend (quickstart)

```sh
docker compose up -d
```

This starts the FastAPI backend on `http://localhost:8000`. Data is persisted in `backend/data/geo.db`. Database migrations run automatically on startup.

To rebuild after backend code changes:

```sh
docker compose up -d --build
```

## Extension development

```sh
cd extension
npm install
npm run build          # builds dist/chrome/ and dist/firefox/
npm run test
npm run typecheck
```

## Releasing a new Firefox build (maintainer only)

Requires `extension/.env` with Mozilla AMO credentials:

```
WEB_EXT_API_KEY=user:xxxxxxx:xxx
WEB_EXT_API_SECRET=xxxxxxxxxxxxxxxx
```

Generate credentials at https://addons.mozilla.org/en-US/developers/addon/api/key/

Release flow:

1. Bump `version` in `extension/manifests/firefox.json`.
2. Run:
   ```sh
   cd extension
   npm run release:firefox
   ```
   This builds, signs with AMO (3–10 min), copies the `.xpi` into `releases/xpis/`, and regenerates `releases/updates.json`.
3. Commit and push:
   ```sh
   git add releases/ extension/manifests/firefox.json
   git commit -m "release vX.Y.Z"
   git push
   ```

Installed Firefox instances pick up the new version automatically within ~24h.
