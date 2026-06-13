# Plan: Convert to Side-Scrolling Platformer

## Summary

Replace the text-based dungeon crawler UI with a Phaser 3 2D platformer. The Express/OpenAI backend is removed entirely. The corporate dungeon theme, consultant classes, and 6-stat system carry over into platformer mechanics. React is kept as the shell for the start/end screens; Phaser mounts inside a React div during gameplay.

---

## What is removed

- `server/` directory (entire Express + OpenAI backend)
- `src/services/aiService.ts`
- `src/constants/fallbackRooms.ts`
- `src/hooks/useGameState.ts` (replaced by Phaser scene logic)
- `src/screens/GameScreen.tsx` (replaced by Phaser canvas)
- `src/components/ActionCard.tsx`, `NarrationLog.tsx`
- npm deps: `express`, `cors`, `dotenv`, `concurrently`, `nodemon`, `ts-node`, `@types/express`, `@types/cors`
- `npm run dev:server` script

## What is kept / adapted

- `src/screens/StartScreen.tsx` — class selection stays in React
- `src/screens/EndScreen.tsx` — win/lose screen stays in React
- `src/components/StatBar.tsx` — reused in HUD overlay
- `src/types/game.ts` — `ConsultantClass`, `GameStats`, `GamePhase`; `Room`, `Action`, `Resolution`, `LogEntry` removed
- `src/constants/classes.ts` — all 8 consultant classes unchanged
- `src/constants/initialState.ts` — `INITIAL_STATS` kept
- `src/engine/gameEngine.ts` — `applyStatChanges`, `checkWinLose`, `clampStat` kept
- `src/App.tsx` — phase routing updated to mount Phaser scene

---

## New structure

```
src/
  game/
    config.ts           # Phaser.Game config (canvas size, physics, scenes)
    PhaserGame.tsx      # React component that mounts/destroys the Phaser instance
    scenes/
      BootScene.ts      # Preload assets (placeholder colored rects initially)
      GameScene.ts      # Main platformer: platforms, enemies, camera, win/lose triggers
      HUDScene.ts       # Parallel scene rendered on top — shows 6 stat bars
    entities/
      Player.ts         # Arcade physics body, keyboard input, class modifiers applied
      Enemy.ts          # Patrol AI, contact damage, drops stat changes on defeat
      Boss.ts           # Boss enemy — more HP, charged attacks
    levels/
      level1.ts         # Hardcoded platform/enemy layout for level 1
      bossLevel.ts      # Final boss room layout
```

---

## Gameplay design

### Player mechanics
- Arrow keys / WASD: move left/right
- Space / Up: jump (single jump)
- Z / X: attack (melee swing with hitbox)
- Each consultant class gets a passive stat modifier applied on enemy kill (mirrors existing `classModifiers` logic)

### Enemies (corporate themed)
- **Scope Creep Goblin** — slow patrol, contact damage, drops Budget −5 on defeat → DeliveryProgress +8
- **JIRA Wraith** — fast, erratic movement, drops TeamMorale −3 → DeliveryProgress +6
- **Procurement Troll** — tanky, slow, drops Budget −10 → DeliveryProgress +12
- **GDPR Spectre** — ranged (throws compliance paperwork), drops ComplianceRisk −15

### Stats wired to game events
| Event | Stat change |
|-------|------------|
| Player takes damage | TeamMorale −5, Budget −3 |
| Enemy defeated | DeliveryProgress +varies per enemy |
| Reach end of level | DeliveryProgress +10 |
| Boss defeated | DeliveryProgress +20 |
| Collect loot item | varies (budget pack, morale boost, debt reducer) |

### Win / Lose
- Same thresholds as before (`checkWinLose` in `gameEngine.ts`)
- Checked after every stat-change event in `GameScene`
- On lose: emit event to React, show `EndScreen` with `outcome: 'lose'`
- On boss defeat + `deliveryProgress >= 70`: emit event, show `EndScreen` with `outcome: 'win'`

### Levels
- 2 levels for initial implementation: Level 1 (3 enemy types) + Boss Level
- Platforms are hardcoded tilemaps (plain colored rectangles as placeholders — no sprite art required to start)
- Camera follows player horizontally

---

## Implementation todos

1. **Remove server and AI dependencies** — delete `server/`, `aiService.ts`, `fallbackRooms.ts`; uninstall backend npm deps; update scripts
2. **Install Phaser 3** — `npm install phaser`
3. **Adapt types and engine** — strip unused types from `game.ts`, keep stat/engine logic
4. **Create `PhaserGame.tsx`** — React component that instantiates `Phaser.Game` on mount, destroys on unmount, forwards stat-change and game-over events to React via callbacks
5. **Create `BootScene.ts`** — preload placeholder graphic assets (colored rectangles via graphics API)
6. **Create `Player.ts`** — arcade physics, keyboard input, attack hitbox, class stat modifiers
7. **Create `Enemy.ts` and `Boss.ts`** — patrol AI, HP, stat-change payloads on defeat
8. **Create `GameScene.ts`** — platform layout, spawn enemies, camera, stat event bus, win/lose detection
9. **Create HUD overlay** — React DOM overlay (absolute positioned over canvas) reusing `StatBar.tsx`
10. **Wire `App.tsx`** — `playing` phase renders `<PhaserGame>`, passes `selectedClass` in, receives game-over events out
11. **Create level layouts** — `level1.ts`, `bossLevel.ts` with platform/enemy data
12. **Update `AGENTS.md`** — reflect removed backend, new Phaser structure

---

## Open decisions / constraints

- **No sprite art**: placeholder graphics only (Phaser `graphics` API, colored rects) — easy to swap for real sprites later
- **HUD approach**: React DOM overlay (absolute positioned over the canvas) reusing `StatBar.tsx`, rather than a second Phaser scene — simpler React state sync
- **No tilemap format** (Tiled/JSON) for initial version — platform data as plain TS arrays
