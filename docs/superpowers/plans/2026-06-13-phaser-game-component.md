# PhaserGame Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the React/Phaser bridge component (`PhaserGame.tsx`) that mounts and destroys the Phaser 4 game engine, forwards stat-change events to React state, and signals game-over to the parent.

**Architecture:** Three focused files: `eventKeys.ts` (string constants), `config.ts` (Phaser game config factory), and `PhaserGame.tsx` (React component owning the Phaser instance lifecycle and `GameStats` React state). Scenes will be added in later issues — the config starts with an empty scene array.

**Tech Stack:** React 19, TypeScript, Phaser 4 (`phaser` npm package), Tailwind CSS, Vite

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/game/eventKeys.ts` | Named string constants for all game events |
| Create | `src/game/config.ts` | `createGameConfig(parent, selectedClass)` — returns `Phaser.Types.Core.GameConfig` |
| Create | `src/game/PhaserGame.tsx` | React component: lifecycle, stat state, event subscriptions |
| Modify | `src/App.tsx` | Replace placeholder `playing` branch with `<PhaserGame>` |

---

## Task 1: Create `eventKeys.ts`

**Files:**
- Create: `src/game/eventKeys.ts`

- [ ] **Step 1: Create the file**

```ts
// src/game/eventKeys.ts

/** Emitted by scenes when stats change. Payload: GameStats */
export const STATS_CHANGED = 'stats-changed';

/** Emitted by scenes when the game ends. Payload: { outcome, stats, reason } */
export const GAME_OVER = 'game-over';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors, none from `eventKeys.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/game/eventKeys.ts
git commit -m "feat: add game event key constants (#4)"
```

---

## Task 2: Create `config.ts`

**Files:**
- Create: `src/game/config.ts`

- [ ] **Step 1: Create the file**

```ts
// src/game/config.ts
import Phaser from 'phaser';
import { INITIAL_STATS } from '../constants/initialState';
import { ConsultantClass } from '../types/game';

export function createGameConfig(
  parent: HTMLElement,
  selectedClass: ConsultantClass,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 600 }, debug: false },
    },
    scene: [],
    callbacks: {
      preBoot: (game: Phaser.Game) => {
        game.registry.set('selectedClass', selectedClass);
        game.registry.set('stats', { ...INITIAL_STATS });
      },
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/config.ts
git commit -m "feat: add Phaser game config factory (#4)"
```

---

## Task 3: Create `PhaserGame.tsx`

**Files:**
- Create: `src/game/PhaserGame.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/game/PhaserGame.tsx
import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { INITIAL_STATS } from '../constants/initialState';
import { ConsultantClass, GameStats } from '../types/game';
import { createGameConfig } from './config';
import { GAME_OVER, STATS_CHANGED } from './eventKeys';

interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: GameStats, reason: string | null) => void;
}

interface GameOverPayload {
  outcome: 'win' | 'lose';
  stats: GameStats;
  reason: string | null;
}

export function PhaserGame({ selectedClass, onGameOver }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [stats, setStats] = useState<GameStats>({ ...INITIAL_STATS });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game(createGameConfig(containerRef.current, selectedClass));
    gameRef.current = game;

    const onStatsChanged = (newStats: GameStats) => {
      setStats({ ...newStats });
    };

    const onGameOverEvent = ({ outcome, stats: finalStats, reason }: GameOverPayload) => {
      onGameOver(outcome, finalStats, reason);
    };

    game.events.on(STATS_CHANGED, onStatsChanged);
    game.events.on(GAME_OVER, onGameOverEvent);

    return () => {
      game.events.off(STATS_CHANGED, onStatsChanged);
      game.events.off(GAME_OVER, onGameOverEvent);
      game.destroy(true);
      gameRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} />
      {/* HUD overlay mounts here in issue #10; stats={stats} available */}
    </div>
  );
}
```

> Note: `selectedClass` and `onGameOver` are intentionally excluded from the dependency array. The Phaser instance is created once on mount; re-creating it on every prop change would destroy and restart the game. `selectedClass` is captured at mount time via `game.registry`; `onGameOver` is called once (game over is terminal). The eslint-disable comment suppresses the exhaustive-deps warning for this intentional pattern.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/PhaserGame.tsx
git commit -m "feat: add PhaserGame React component (#4)"
```

---

## Task 4: Wire `App.tsx`

**Files:**
- Modify: `src/App.tsx`

Replace the placeholder `playing` branch with `<PhaserGame>`.

- [ ] **Step 1: Update the `playing` branch in `App.tsx`**

Replace these lines in `src/App.tsx`:
```tsx
  // 'playing' phase — PhaserGame component mounts here (Issue #4)
  // Placeholder: simulate a quick loss so the flow is testable
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 text-gray-100">
      <p className="text-lg font-bold tracking-widest text-purple-300">🎮 Loading game engine...</p>
      <button
        onClick={() => {
          setResult({
            outcome: 'lose',
            stats: { ...INITIAL_STATS },
            loseReason: 'The game engine has not been wired up yet.',
            selectedClass: selectedClass!,
          });
          setPhase('end');
        }}
        className="rounded-xl bg-red-800 px-6 py-3 text-sm font-bold tracking-widest text-white hover:bg-red-700"
      >
        Simulate game over
      </button>
    </div>
  );
```

With:
```tsx
  return (
    <div className="w-screen h-screen bg-gray-950">
      <PhaserGame
        selectedClass={selectedClass!}
        onGameOver={(outcome, stats, reason) => {
          setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass! });
          setPhase('end');
        }}
      />
    </div>
  );
```

- [ ] **Step 2: Add the import at the top of `App.tsx`**

Add after the existing imports:
```tsx
import { PhaserGame } from './game/PhaserGame';
```

Also remove the now-unused `INITIAL_STATS` import if it was only used by the placeholder:
```tsx
// Remove this line if INITIAL_STATS is no longer referenced:
import { INITIAL_STATS } from './constants/initialState';
```

- [ ] **Step 3: Verify TypeScript compiles and lint passes**

```bash
npm run build 2>&1 | tail -30
npm run lint 2>&1 | tail -20
```

Expected: build and lint pass with no new errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

1. Open `http://localhost:5173`
2. Select a class → click Start
3. A black/dark-blue 960×540 canvas should render (empty — no scenes yet)
4. No console errors
5. Browser back / refresh should cleanly destroy and re-create the Phaser instance

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire PhaserGame into App.tsx playing phase (#4)

Closes #4

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Self-Review Notes

- All spec requirements covered: lifecycle (mount/destroy), event subscriptions (STATS_CHANGED, GAME_OVER), registry seeding (selectedClass, stats), render structure (container div + HUD slot), props interface.
- No placeholders or TBDs.
- Type consistency: `GameStats`, `ConsultantClass` from `src/types/game.ts` used consistently across all tasks.
- `stats` state in `PhaserGame` is ready for the HUD overlay (issue #10) to consume without refactor.
