# AGENTS.md — Dungeons & Deliverables

A browser-based side-scrolling platformer where the player is an IT consultant navigating a corporate dungeon. Built with React + Phaser 3. No backend or AI required — fully self-contained.

## Skills

Always invoke the `using-superpowers` skill at the start of any development work. This ensures the correct workflow skills (brainstorming, TDD, debugging, etc.) are applied before taking action.

Project-specific skills live in `skills/`. Each skill has its own subdirectory with a `SKILL.md` file. Load relevant skills before starting work in their domain.

## Issue Board

https://github.com/Rambolarsen/friendly-funicular/issues

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # tsc + vite build
npm run lint         # eslint
```

No test suite exists.

## Architecture

```
src/
  App.tsx               # Root: routes between start / playing / end phases
  screens/              # StartScreen (class selection), EndScreen (win/lose)
  components/           # Pure UI: ClassCard, StatBar
  engine/gameEngine.ts  # Pure functions: applyStatChanges, checkWinLose, clampStat
  constants/            # classes.ts, initialState.ts
  types/game.ts         # All shared types (GameStats, ConsultantClass, GamePhase, GameOverPayload)
  game/
    config.ts           # Phaser.Game config factory — registers BootScene + GameScene
    PhaserGame.tsx      # React component: mounts/destroys Phaser instance, HUD overlay
    eventKeys.ts        # STATS_CHANGED, GAME_OVER event key constants
    scenes/
      BootScene.ts      # Generates all placeholder textures, then starts GameScene
      GameScene.ts      # Main platformer: platforms, enemies, camera, stat events, win/lose
    entities/
      Player.ts         # Arcade physics sprite, keyboard input, attack hitbox, class kill modifiers
      Enemy.ts          # Patrol AI sprite; SpectreEnemy subclass fires projectiles
      Boss.ts           # Boss enemy — charge attacks, higher HP
    levels/
      types.ts          # LevelData, PlatformData, EnemySpawnData, LootData, EnemyType
      level1.ts         # Level 1 platform + enemy layout
      bossLevel.ts      # Boss room layout
```

Phaser runs inside the `<PhaserGame>` React component during the `playing` phase. The React HUD overlay (StatBar components) sits absolutely positioned over the canvas and is updated via `game.events.on(STATS_CHANGED, ...)`.

## Key Conventions

### Stat system
- All 6 stats (`budget`, `clientHappiness`, `technicalDebt`, `teamMorale`, `deliveryProgress`, `complianceRisk`) are integers 0–100.
- `applyStatChanges` clamps each incoming delta to ±20, then clamps the result to [0, 100].
- Win condition: boss defeated AND `deliveryProgress >= 70`.
- Lose conditions: `budget <= 0`, `teamMorale <= 0`, `technicalDebt >= 100`, `complianceRisk >= 100`.

### Game progression
- Two levels: Level 1 → Boss Level.
- Level 1 ends when the player reaches `exitX`; emits `deliveryProgress +10` then starts Boss Level.
- Boss Level ends when the Boss enemy is defeated.
- `GamePhase` cycles: `start` → `playing` → `end`.

### Phaser ↔ React bridge
- `GameScene` emits `STATS_CHANGED` (payload: `GameStats`) and `GAME_OVER` (payload: `GameOverPayload`) on `game.events`.
- `PhaserGame.tsx` listens for these events and updates React state / calls `onGameOver`.
- Stats are also written to `game.registry` so scene restarts can read the latest values.

### Enemy stat drops on kill
Each enemy type drops fixed stat changes when defeated. The player's consultant class adds a passive kill bonus on top (defined in `Player.ts` as `CLASS_KILL_BONUSES`). The `intern` class uses a random stat/value each kill.

### Types live in `src/types/game.ts`
All shared types (`GameStats`, `ConsultantClass`, `GamePhase`, `GameOverPayload`) are defined there. Level-specific types live in `src/game/levels/types.ts`.

### Class IDs
The canonical class IDs used in `CLASS_KILL_BONUSES` (passive kill stat bonuses): `architect`, `developer`, `ux`, `datascientist`, `pm`, `security`, `accountmanager`, `intern`. The `intern` class uses fully random stat changes.

### Placeholder graphics
No external sprite assets. All textures are generated in `BootScene.create()` using `this.make.graphics()` + `generateTexture()`. Easy to replace with real sprites later by adding a `preload()` step.

## Keeping This File Updated

When making changes to the project, update this file if any of the following change:

- **Commands** — new or renamed npm scripts
- **Architecture** — new files/directories with a distinct role, removed layers
- **Stat system** — win/lose thresholds, stat names, clamping rules
- **Game progression** — level count, boss trigger logic, phase names
- **Phaser ↔ React bridge** — event keys, payload shapes
- **Type locations** — if shared types move
- **Class IDs** — additions, removals, or renamed consultant classes
