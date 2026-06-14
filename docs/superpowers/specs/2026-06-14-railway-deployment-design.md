# Railway Deployment Design

**Date:** 2026-06-14  
**Scope:** Deploy the Socket.io game server and React/Vite client to Railway using two services from the same GitHub repo.

---

## Overview

The project is a monorepo with a React + Vite frontend (`src/`) and a standalone Node.js Socket.io server (`server/`). Both are deployed to Railway as separate services within a single Railway project.

---

## Architecture

### Two Railway Services

| Service  | Root Directory | Build Command    | Start Command                   |
|----------|---------------|------------------|---------------------------------|
| `server` | `server/`     | *(auto-detected)*| `npm start`                     |
| `client` | `.` (root)    | `npm run build`  | `npx serve -s dist -l $PORT`   |

Railway's Nixpacks builder auto-detects Node.js in both directories. The server uses `tsx` to run TypeScript at runtime (no compile step needed). The client builds the Vite bundle to `dist/` and serves it as a static site via `serve`.

---

## Environment Variables

### `server` service
| Variable        | Value                                         | Purpose                          |
|-----------------|-----------------------------------------------|----------------------------------|
| `CLIENT_ORIGIN` | `https://<client-service>.railway.app`        | Socket.io CORS allowed origin    |
| `PORT`          | *(set automatically by Railway)*             | HTTP server port                 |

### `client` service
| Variable          | Value                                       | Purpose                            |
|-------------------|---------------------------------------------|------------------------------------|
| `VITE_SERVER_URL` | `https://<server-service>.railway.app`      | Socket.io server URL for the client|

> `VITE_SERVER_URL` must be set **before the build** runs, as Vite inlines env vars at build time.

---

## Repository Changes

### Files to add

**`railway.json`** (repo root — client service config):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l $PORT",
    "healthcheckPath": "/"
  }
}
```

**`server/railway.json`** (server service config):
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

### Changes to existing files

**Root `package.json`:** Add `serve` as a devDependency so `npx serve` is available during the client start command.

**`.env.example`:** Document `CLIENT_ORIGIN` for the server env var.

---

## Deploy Order

1. Create a Railway project and add the GitHub repo.
2. Create the **`server`** service, set root directory to `server/`.
3. Deploy the server. Copy its generated Railway URL.
4. Create the **`client`** service, set root directory to `.` (repo root).
5. Set `VITE_SERVER_URL` on the client service to the server's Railway URL.
6. Set `CLIENT_ORIGIN` on the server service to the client's Railway URL.
7. Redeploy both services.

---

## What Does Not Change

- `server/src/index.ts` already reads `PORT` and `CLIENT_ORIGIN` from environment variables.
- `src/game/network/SocketClient.ts` already reads `VITE_SERVER_URL` with a localhost fallback.
- No changes needed to game logic, Phaser scenes, or domain layer.

---

## Out of Scope

- SSL/TLS termination (handled by Railway automatically).
- Custom domains (can be added in Railway UI after initial deployment).
- CI/CD pipeline (Railway auto-deploys on push to the configured branch).
