# AGENTS.md — Dungeons & Deliverables

A browser-based side-scrolling platformer where the player is an IT consultant navigating a corporate dungeon. Built with React + Phaser 4. Supports solo play and **co-op multiplayer horde mode** via Socket.io.

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
npm run server       # Start multiplayer Socket.io server (port 3001) — requires cd server && npm install first
npm run dev:all      # Start both client and server concurrently
```

No test suite exists.

## Architecture

```
src/
  App.tsx               # Root: routes between start / lobby / playing / end phases
  screens/              # StartScreen (class + mode select), LobbyScreen, EndScreen
  components/           # Pure UI: ClassCard, StatBar
  constants/            # classes.ts, initialState.ts
  types/
    game.ts             # Shared types (RawStats, ConsultantClass, GamePhase, GameOverPayload)
    multiplayer.ts      # Client-side mirror of server socket event types
  domain/               # Phaser-free domain layer (DDD)
    valueObjects/       # GameStats (VO class), Health
    entities/           # Player, Enemy, Boss (pure TS, no Phaser)
    events/             # DomainEvent, StatChanged, EnemyDefeated, BossDefeated, GameOver
    rules/              # statRules, progressionRules
  game/
    config.ts           # Phaser.Game config factory — registers BootScene + GameScene
    PhaserGame.tsx      # React component: mounts/destroys Phaser instance, HUD overlay
    eventKeys.ts        # STATS_CHANGED, GAME_OVER event key constants
    network/
      SocketClient.ts   # Singleton Socket.io-client wrapper (multiplayer only)
    scenes/
      BootScene.ts      # Generates textures + animations, then starts GameScene
      GameScene.ts      # Main platformer: platforms, enemies, camera, stat events, win/lose;
                        # also handles multiplayer horde mode (RemotePlayer/Enemy sync)
    entities/
      Player.ts         # Arcade physics sprite, keyboard input, attack hitbox, class kill modifiers
      Enemy.ts          # Patrol AI sprite; SpectreEnemy subclass fires projectiles
      Boss.ts           # Boss enemy — charge attacks, higher HP
      RemotePlayer.ts   # Interpolated sprite for other players in multiplayer
      RemoteEnemy.ts    # Interpolated sprite for server-owned enemies in multiplayer
    abilities.ts        # Active class ability executor used by GameScene on Q
    effects.ts          # Lightweight combat VFX helpers such as enemy death bursts
    levels/
      types.ts          # LevelData, PlatformData, EnemySpawnData, LootData, EnemyType
      level1.ts         # Level 1 platform + enemy layout
      level2.ts         # Level 2: Open Plan Office
      level3.ts         # Level 3: Architecture Review
      bossLevel.ts      # Boss room layout
      hordeArena.ts     # Compact 1280×640 non-scrolling arena for multiplayer horde mode
server/
  package.json          # Standalone Node.js server package (commonjs, tsx)
  tsconfig.json         # Server TypeScript config
  src/
    index.ts            # Express + Socket.io entry point (port 3001)
    types.ts            # Server-side socket event types
    LobbyManager.ts     # Manages game rooms; public lobby broadcast
    GameRoom.ts         # 20fps game loop: enemy movement, spawning, overrun detection
    HordeSpawner.ts     # Timed enemy wave schedule (trickle + brute/boss intervals)
```

`src/game/` contains Phaser-specific scene and entity logic that depends on the physics engine. `src/domain/` is a pure TypeScript layer with no Phaser imports—it encapsulates game rules and domain concepts for easier testing and reusability.

Phaser runs inside the `<PhaserGame>` React component during the `playing` phase. The React HUD overlay (StatBar components) sits absolutely positioned over the canvas and is updated via `game.events.on(STATS_CHANGED, ...)`.

## Key Conventions

### Stat system
- All 6 stats (`budget`, `clientHappiness`, `technicalDebt`, `teamMorale`, `deliveryProgress`, `complianceRisk`) are integers 0–100.
- `RawStats` (plain 6-field object type) is in `src/types/game.ts`.
- `GameStats` is an immutable value object class in `src/domain/valueObjects/GameStats.ts`.
- Stat clamping and application logic is in `src/domain/rules/statRules.ts`.
- Win condition: boss defeated AND `deliveryProgress >= 70`.
- Lose conditions: `budget <= 0`, `teamMorale <= 0`, `technicalDebt >= 100`, `complianceRisk >= 100`.

### Game progression
- **Solo mode:** Four levels: `Level 1 → Level 2 → Level 3 → Boss Level`. Any non-boss level ends when the player reaches `exitX`; emits `deliveryProgress +10`, increments `levelIndex`, and restarts `GameScene` on the next level. Boss Level ends when the Boss enemy is defeated.
- **Multiplayer horde mode:** Players fight in the compact `hordeArena`. Enemies spawn continuously from the server (trickle every 3–5s; brute every 30s; boss every 2 min). Lose condition: 20 enemies alive simultaneously (overrun). No win condition — survival until overrun.
- `GamePhase` cycles: `start` → `lobby` (multiplayer only) → `playing` → `end`.

### Phaser ↔ React bridge
- `GameScene` emits `STATS_CHANGED` (payload: `RawStats`) and `GAME_OVER` (payload: `GameOverPayload`) on `game.events`.
- `GameScene` also emits `ABILITY_USED` (payload: `AbilityUsedPayload`) when an active class ability fires.
- `PhaserGame.tsx` listens for these events and updates React state / calls `onGameOver`.
- Stats are also written to `game.registry` so scene restarts can read the latest values.
- In multiplayer, `PhaserGame.tsx` writes `multiplayerSocket` and `multiplayerRoomId` to the Phaser registry; `GameScene` reads them in `create()` to activate horde mode.

### Multiplayer architecture
- **Hybrid position-sharing**: clients run Phaser physics locally and send position every 50ms. Server owns all enemies (simple x-axis patrol AI toward nearest player).
- **Socket events**: client → server: `join_room`, `player_update`, `attack_enemy`. Server → client: `room_joined`, `state` (20fps tick), `enemy_died`, `game_over`, `lobby_update`.
- **Type sync**: `server/src/types.ts` is the source of truth. `src/types/multiplayer.ts` is a manually-maintained client mirror — keep them in sync.
- **CORS**: set `CLIENT_ORIGIN` env var on server for production. Default: `http://localhost:5173`.

### Enemy stat drops on kill
Each enemy type drops fixed stat changes when defeated. The player's consultant class adds a passive kill bonus on top (defined in `Player.ts` as `CLASS_KILL_BONUSES`). The `intern` class uses a random stat/value each kill.

### Types live in `src/types/game.ts`
Plain data types (`RawStats`, `ConsultantClass`, `GamePhase`, `GameOverPayload`) are in `src/types/game.ts`. Domain value objects and entities are in `src/domain/` (e.g., `GameStats` VO in `src/domain/valueObjects/GameStats.ts`). Level-specific types live in `src/game/levels/types.ts`.

### Class IDs
The canonical class IDs used in `CLASS_KILL_BONUSES` (passive kill stat bonuses): `architect`, `developer`, `ux`, `datascientist`, `pm`, `security`, `accountmanager`, `intern`. The `intern` class uses fully random stat changes.

### Sprite assets
Real pixel art sprites from the [Kenney Pixel Platformer](https://kenney.nl/assets/pixel-platformer) pack (CC0 public domain) live in `public/assets/sprites/`:
- `chars.png` — 9×3 character spritesheet (24×24 px frames, 1px gap); used for player, all enemies, and boss
- `platform.png` — 18×18 grass-top tile; tiled across platforms via `add.tileSprite`
- `loot-budget.png`, `loot-morale.png`, `loot-debt.png` — loot item tiles (18×18)
- `loot-compliance.png` — temporary compliance loot tile (18×18)

`BootScene.preload()` loads all sprites; `BootScene.create()` defines 8 named animations (`player-walk`, `player-idle`, `player-jump`, `goblin-walk`, `wraith-walk`, `troll-walk`, `spectre-idle`, `boss-walk`). Player and enemies play these animations in their `update()`/`preUpdate()` loops.

## Session Hygiene

When a task is complete, **start a new Copilot CLI session** before beginning the next one. This keeps the context window small and focused, which improves reasoning quality and reduces token costs.

> ✅ Task done → close session → open new session → start next task.

## Keeping This File Updated

When making changes to the project, update this file if any of the following change:

- **Commands** — new or renamed npm scripts
- **Architecture** — new files/directories with a distinct role, removed layers
- **Stat system** — win/lose thresholds, stat names, clamping rules
- **Game progression** — level count, boss trigger logic, phase names
- **Phaser ↔ React bridge** — event keys, payload shapes
- **Type locations** — if shared types move
- **Class IDs** — additions, removals, or renamed consultant classes
