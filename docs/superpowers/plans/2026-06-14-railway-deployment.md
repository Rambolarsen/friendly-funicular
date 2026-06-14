# Railway Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Socket.io server and React/Vite client as two separate Railway services from the same GitHub repository.

**Architecture:** Two `railway.json` config files (one in `server/`, one at repo root) tell Railway how to build and start each service. The server already reads `PORT` and `CLIENT_ORIGIN` from env; the client already reads `VITE_SERVER_URL` from env — no game logic changes needed.

**Tech Stack:** Railway (Nixpacks builder), Node.js, Express + Socket.io, Vite, `serve` (static file server)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `server/railway.json` | Railway config for the server service |
| Create | `railway.json` | Railway config for the client service |
| Modify | `package.json` | Add `serve` devDependency + `start` script |
| Modify | `.env.example` | Document `CLIENT_ORIGIN` env var for server |

---

### Task 1: Add Railway config for the server service

**Files:**
- Create: `server/railway.json`

- [ ] **Step 1: Create `server/railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/"
  }
}
```

`npm start` in `server/` runs `tsx src/index.ts`. Railway auto-injects `PORT`; the server already reads it via `process.env.PORT`.

- [ ] **Step 2: Commit**

```bash
git add server/railway.json
git commit -m "chore: add Railway config for server service"
```

---

### Task 2: Add Railway config for the client service

**Files:**
- Create: `railway.json` (repo root)
- Modify: `package.json` (add `serve` devDependency + `start` script)

- [ ] **Step 1: Add `serve` to root devDependencies**

In `package.json`, add `"serve": "^14.2.4"` to `devDependencies`:

```json
"devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^25.9.3",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "autoprefixer": "^10.5.0",
    "concurrently": "^9.2.1",
    "eslint": "^10.5.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "postcss": "^8.5.15",
    "serve": "^14.2.4",
    "tailwindcss": "^3.4.17",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.61.0",
    "vite": "^8.0.12"
}
```

- [ ] **Step 2: Add `start` script to root `package.json`**

Add `"start": "serve -s dist -l $PORT"` to the `scripts` block:

```json
"scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "start": "serve -s dist -l $PORT",
    "server": "cd server && npm run dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run server\""
}
```

- [ ] **Step 3: Install the new dependency**

```bash
npm install
```

Expected: `package-lock.json` updated, `serve` appears in `node_modules/.bin/serve`.

- [ ] **Step 4: Create `railway.json` at repo root**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/"
  }
}
```

`npm run build` runs `tsc && vite build` → output in `dist/`. `npm start` runs `serve -s dist -l $PORT` using the devDep installed during build.

- [ ] **Step 5: Verify the build still succeeds**

```bash
npm run build
```

Expected: No TypeScript or Vite errors; `dist/` directory is created/updated.

- [ ] **Step 6: Commit**

```bash
git add railway.json package.json package-lock.json
git commit -m "chore: add Railway config for client service and serve devDep"
```

---

### Task 3: Document environment variables in `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example`**

Replace the current content with:

```env
# Server environment variables (set in Railway server service)
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

# Client environment variables (set in Railway client service, used at BUILD TIME by Vite)
VITE_SERVER_URL=http://localhost:3001
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document CLIENT_ORIGIN and VITE_SERVER_URL in .env.example"
```

---

### Task 4: Railway project setup (manual steps)

These steps are performed in the Railway dashboard — no code changes.

- [ ] **Step 1: Create a new Railway project**

  Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → select `Rambolarsen/friendly-funicular`.

- [ ] **Step 2: Configure the server service**

  In the service settings:
  - **Root Directory:** `server`
  - **Build Command:** *(leave empty — Nixpacks auto-detects)*
  - **Start Command:** `npm start`

  In the service's **Variables** tab, add:
  - `CLIENT_ORIGIN` = *(leave blank for now — fill in after client is deployed)*

- [ ] **Step 3: Deploy the server service**

  Click **Deploy**. Wait for it to go green. Copy the generated Railway URL (e.g. `https://server-production-xxxx.railway.app`).

- [ ] **Step 4: Add a second service for the client**

  In the same Railway project → **New Service** → GitHub repo (same repo).

  In the service settings:
  - **Root Directory:** *(leave empty — repo root)*
  - **Build Command:** `npm run build`
  - **Start Command:** `npm start`

  In the service's **Variables** tab, add:
  - `VITE_SERVER_URL` = `https://<server-url-from-step-3>`

  > **Important:** `VITE_SERVER_URL` must be set **before** the build runs because Vite inlines env vars at build time. If you update it later, you must trigger a redeploy.

- [ ] **Step 5: Deploy the client service**

  Click **Deploy**. Wait for it to go green. Copy the generated client Railway URL (e.g. `https://client-production-xxxx.railway.app`).

- [ ] **Step 6: Set `CLIENT_ORIGIN` on the server service**

  Go back to the server service → **Variables** → set:
  - `CLIENT_ORIGIN` = `https://<client-url-from-step-5>`

  Railway will automatically redeploy the server. The server's Socket.io CORS will now allow connections from the deployed client.

- [ ] **Step 7: Smoke test**

  Open the client URL in a browser. Navigate to multiplayer mode, create a room. Verify the lobby screen loads and the socket connects (no CORS errors in browser devtools).
