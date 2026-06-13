# AGENTS.md — Dungeons & Deliverables

A browser-based dungeon crawler where the player is an IT consultant navigating a corporate dungeon, with an Express backend that proxies OpenAI calls as the Dungeon Master.

## Commands

```bash
npm run dev          # Start both client (port 5173) and server (port 3001) concurrently
npm run dev:client   # Vite frontend only
npm run dev:server   # Express backend only (ts-node)
npm run build        # tsc + vite build
npm run lint         # eslint
```

No test suite exists.

## Architecture

```
src/                    # React + TypeScript frontend (Vite)
  App.tsx               # Root: routes between screens based on GameState.phase
  screens/              # StartScreen, GameScreen, EndScreen
  components/           # Pure UI: ActionCard, ClassCard, NarrationLog, StatBar
  hooks/useGameState.ts # All game logic — the single source of truth
  engine/gameEngine.ts  # Pure functions: stat clamping, win/lose checks, log helpers
  services/aiService.ts # fetch calls to /api/* with null-return on failure
  constants/            # classes.ts, fallbackRooms.ts, initialState.ts
  types/game.ts         # All shared types

server/
  index.ts              # Express app with 3 POST endpoints, proxied by Vite in dev
```

Vite proxies `/api/*` → `http://localhost:3001` in development. In production, the Express server must be run separately.

## Key Conventions

### Dual-path AI fallback pattern
Every AI call returns `null` on any failure — `aiService.ts` catches all errors and returns `null`. The hook (`useGameState.ts`) always checks for null and falls back to deterministic content (`FALLBACK_ROOMS` for rooms, `buildFallbackResolution()` for action resolution). The game must always be fully playable without an API key.

### `stateRef` for async safety
`useGameState` maintains both `useState` and a `useRef` (`stateRef`) that mirrors state. Because `loadRoom` and `chooseAction` are async and call `updateState` after awaits, `stateRef.current` is read (not the stale closure value) when a fresh snapshot is needed mid-async-flow.

### Stat system
- All 6 stats (`budget`, `clientHappiness`, `technicalDebt`, `teamMorale`, `deliveryProgress`, `complianceRisk`) are integers 0–100.
- `applyStatChanges` clamps each incoming delta to ±20, then clamps the result to [0, 100].
- Win condition: boss defeated AND `deliveryProgress >= 70`.
- Lose conditions: `budget <= 0`, `teamMorale <= 0`, `technicalDebt >= 100`, `complianceRisk >= 100`.

### Game progression
- Rooms are numbered 1–N; room 8+ triggers the boss (`isBoss = true`).
- `floor = Math.ceil(roomNumber / 2)`.
- `GamePhase` cycles: `start` → `playing` → `resolving` → `playing` (repeat) → `end`.

### Fallback resolution seeding
`buildFallbackResolution` in `useGameState.ts` uses a deterministic `hashString` seed derived from `room.id + action.id + customAction + classId + roomCount` so fallback outcomes are stable (same action in same room always produces the same result).

### OpenAI server conventions
- Model defaults to `gpt-4o-mini`; override via `OPENAI_MODEL` env var.
- All AI endpoints use `responseFormat: 'json_object'` except `/api/final-report` (plain text).
- Prompts always specify exact JSON response shapes inline.
- `callOpenAI` throws on HTTP error; callers wrap in try/catch and return 500.

### Types live in `src/types/game.ts`
All shared types (`GameState`, `GameStats`, `Room`, `Action`, `Resolution`, `ConsultantClass`, etc.) are defined there. Don't define game types elsewhere.

### Class IDs
The canonical class IDs used in `classModifiers` (fallback stat bonuses) are: `architect`, `developer`, `ux`, `datascientist`, `pm`, `security`, `accountmanager`, `intern`. The `intern` class uses fully random stat changes.

## Keeping This File Updated

When making changes to the project, update this file if any of the following change:

- **Commands** — new or renamed npm scripts
- **Architecture** — new files/directories with a distinct role, removed layers, or changes to the Vite proxy or server setup
- **Stat system** — win/lose thresholds, stat names, clamping rules
- **Game progression** — room count, boss trigger logic, phase names
- **AI endpoints** — new routes, changed request/response shapes, model defaults
- **Fallback behaviour** — changes to how rooms or resolutions fall back when AI is unavailable
- **Type locations** — if shared types move out of `src/types/game.ts`
- **Class IDs** — additions, removals, or renamed consultant classes
