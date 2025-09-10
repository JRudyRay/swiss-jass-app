Swiss Jass App
===============

This repository contains a Swiss Jass (Schieber) web client and a backend.

How to publish the `web` app to GitHub Pages (quick steps for Windows PowerShell)

1. In the `web` folder, install dependencies:

```powershell
cd web
npm install
```

2. Build and deploy (uses `gh-pages`):

```powershell
# from repo/web
npm run deploy
```

This runs `npm run build` then publishes the `dist` folder to the `gh-pages` branch.

If you don't have `gh` or `gh-pages` installed globally, the `gh-pages` npm package is used by the `deploy` script.

Notes
- The Vite base is set to `./` so the site works when served from a repo subpath on GitHub Pages.
- If you prefer GitHub Actions for automated deployment, create a workflow to run `npm ci` and `npm run build` and push `dist` to `gh-pages`.
