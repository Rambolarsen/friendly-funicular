# Multiplayer Horde Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add co-op networked horde survival mode where players fight endless enemy waves together, each tracking their own stats, losing when 20+ enemies are alive simultaneously.

**Architecture:** Socket.io server (Node.js) manages enemy spawning, overrun detection, and relays player positions. Clients run Phaser physics locally and send position/stat updates to the server every 50ms. Enemies are server-owned: server moves them, clients render them as `RemoteEnemy` sprites. The existing single-player game is fully preserved — a Solo/Multiplayer split is added to `StartScreen`.

**Tech Stack:** socket.io 4, socket.io-client 4, express 4, tsx (dev server), React + Phaser 4 (existing), TypeScript

---

## File Map

**New — server:**
- `server/package.json` — server dependencies
- `server/tsconfig.json` — server TypeScript config
- `server/src/types.ts` — all socket event payload types (shared with client via relative import)
- `server/src/HordeSpawner.ts` — trickle/brute/boss spawn timer logic
- `server/src/GameRoom.ts` — per-room authoritative state + 20fps game loop
- `server/src/LobbyManager.ts` — registry of all active rooms
- `server/src/index.ts` — Express + Socket.io bootstrap

**New — client:**
- `src/game/network/SocketClient.ts` — typed socket.io-client wrapper (singleton)
- `src/game/entities/RemotePlayer.ts` — Phaser sprite driven by network position
- `src/game/entities/RemoteEnemy.ts` — Phaser sprite for server-owned enemies
- `src/game/levels/hordeArena.ts` — compact 1280×640 dungeon arena layout
- `src/screens/LobbyScreen.tsx` — public lobby list + join/create UI

**Modified — client:**
- `package.json` — add `socket.io-client`
- `src/types/game.ts` — add `'lobby'` to `GamePhase`
- `src/screens/StartScreen.tsx` — add Solo / Multiplayer buttons
- `src/App.tsx` — add lobby phase, multiplayer game-over path
- `src/game/PhaserGame.tsx` — accept optional `socket` + `roomId` props; enemy count HUD
- `src/game/scenes/GameScene.ts` — multiplayer mode: skip local enemies, send position, relay attacks, handle RemoteEnemy
- `src/game/entities/Player.ts` — `emitPosition()` method for multiplayer
- `src/screens/EndScreen.tsx` — multiplayer debrief panel
- `src/game/scenes/BootScene.ts` — programmatic dungeon background texture

---

## Task 1: Server package setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "gamez-server",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "~5.3.3"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Install server dependencies**

```bash
cd server && npm install
```

Expected: `node_modules` folder created, no errors.

- [ ] **Step 4: Add `server` script to root `package.json`**

In `package.json`, add to `"scripts"`:
```json
"server": "cd server && npm run dev",
"dev:all": "concurrently \"npm run dev\" \"npm run server\""
```

Also add `concurrently` to root devDependencies and install:
```bash
npm install --save-dev concurrently
```

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json package.json package-lock.json
git commit -m "chore: add server package and concurrently"
```

---

## Task 2: Shared socket event types

**Files:**
- Create: `server/src/types.ts`

- [ ] **Step 1: Create `server/src/types.ts`**

```typescript
// Inline RawStats to avoid cross-package import complexity
export interface RawStats {
  budget: number;
  clientHappiness: number;
  technicalDebt: number;
  teamMorale: number;
  deliveryProgress: number;
  complianceRisk: number;
}

export interface PlayerState {
  id: string;
  name: string;
  classId: string;
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: RawStats;
}

export type EnemyType = 'goblin' | 'wraith' | 'troll' | 'spectre' | 'brute' | 'boss';

export interface EnemyState {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  direction: 1 | -1;
  hp: number;
  maxHp: number;
}

export interface RoomInfo {
  id: string;
  playerCount: number;
  timeSurvived: number; // seconds
}

// ── Client → Server payloads ──────────────────────────────────────────────────

export interface JoinRoomPayload {
  roomId: string | null; // null = create new room
  classId: string;
  name: string;
}

export interface PlayerUpdatePayload {
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: RawStats;
}

export interface AttackEnemyPayload {
  enemyId: string;
  damage: number;
}

// ── Server → Client payloads ──────────────────────────────────────────────────

export interface StatePayload {
  players: PlayerState[];
  enemies: EnemyState[];
  enemyCount: number;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
  state: StatePayload;
}

export interface GameOverPayload {
  reason: 'overrun';
  playerStats: { id: string; name: string; classId: string; stats: RawStats }[];
}

export interface LobbyUpdatePayload {
  rooms: RoomInfo[];
}

export interface EnemyDiedPayload {
  enemyId: string;
  killerId: string;
}
```

- [ ] **Step 2: Create `src/types/multiplayer.ts` — client-side copy of socket types**

This avoids cross-package TypeScript import issues. Keep in sync with `server/src/types.ts`.

```typescript
// Mirror of server/src/types.ts for client-side use.
// Update both files together when the protocol changes.

export interface MultiplayerRawStats {
  budget: number;
  clientHappiness: number;
  technicalDebt: number;
  teamMorale: number;
  deliveryProgress: number;
  complianceRisk: number;
}

export interface MultiplayerPlayerState {
  id: string;
  name: string;
  classId: string;
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: MultiplayerRawStats;
}

export type MultiplayerEnemyType = 'goblin' | 'wraith' | 'troll' | 'spectre' | 'brute' | 'boss';

export interface MultiplayerEnemyState {
  id: string;
  type: MultiplayerEnemyType;
  x: number;
  y: number;
  direction: 1 | -1;
  hp: number;
  maxHp: number;
}

export interface MultiplayerRoomInfo {
  id: string;
  playerCount: number;
  timeSurvived: number;
}

export interface JoinRoomPayload {
  roomId: string | null;
  classId: string;
  name: string;
}

export interface PlayerUpdatePayload {
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: MultiplayerRawStats;
}

export interface AttackEnemyPayload {
  enemyId: string;
  damage: number;
}

export interface StatePayload {
  players: MultiplayerPlayerState[];
  enemies: MultiplayerEnemyState[];
  enemyCount: number;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
  state: StatePayload;
}

export interface MultiplayerGameOverPayload {
  reason: 'overrun';
  playerStats: { id: string; name: string; classId: string; stats: MultiplayerRawStats }[];
}

export interface LobbyUpdatePayload {
  rooms: MultiplayerRoomInfo[];
}

export interface EnemyDiedPayload {
  enemyId: string;
  killerId: string;
}
```

- [ ] **Step 3: Update `src/types/game.ts` — add optional `multiplayerResult` to `GameOverPayload`**

In `src/types/game.ts`, change `GameOverPayload`:

```typescript
import type { MultiplayerGameOverPayload } from './multiplayer';

export type GameOverPayload = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
  multiplayerResult?: MultiplayerGameOverPayload;
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/types.ts src/types/multiplayer.ts src/types/game.ts
git commit -m "feat(server): add shared socket event types and client-side mirror"
```

---

## Task 3: HordeSpawner

**Files:**
- Create: `server/src/HordeSpawner.ts`

- [ ] **Step 1: Create `server/src/HordeSpawner.ts`**

```typescript
export type SpawnType = 'regular' | 'brute' | 'boss';

export class HordeSpawner {
  private trickleTimer = 0;
  private bruteTimer = 0;
  private bossTimer = 0;
  private accelerateTimer = 0;
  private baseInterval = 4000; // ms between regular spawns
  private readonly minInterval = 1500;

  /** Call once per game loop tick with elapsed ms. Calls onSpawn for each enemy to spawn. */
  tick(delta: number, bossAlive: boolean, onSpawn: (type: SpawnType) => void): void {
    this.accelerateTimer += delta;
    if (this.accelerateTimer >= 120_000) {
      this.accelerateTimer = 0;
      this.baseInterval = Math.max(this.minInterval, this.baseInterval - 500);
    }

    this.bruteTimer += delta;
    this.bossTimer += delta;

    // Trickle pauses while boss is alive
    if (!bossAlive) {
      this.trickleTimer += delta;
      const jitter = Math.random() * 2000 - 1000; // ±1s
      if (this.trickleTimer >= this.baseInterval + jitter) {
        this.trickleTimer = 0;
        onSpawn('regular');
      }
    }

    if (this.bruteTimer >= 30_000) {
      this.bruteTimer = 0;
      onSpawn('brute');
    }

    if (this.bossTimer >= 120_000) {
      this.bossTimer = 0;
      onSpawn('boss');
    }
  }

  reset(): void {
    this.trickleTimer = 0;
    this.bruteTimer = 0;
    this.bossTimer = 0;
    this.accelerateTimer = 0;
    this.baseInterval = 4000;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/HordeSpawner.ts
git commit -m "feat(server): add HordeSpawner"
```

---

## Task 4: GameRoom

**Files:**
- Create: `server/src/GameRoom.ts`

- [ ] **Step 1: Create `server/src/GameRoom.ts`**

```typescript
import { v4 as uuid } from 'uuid';
import {
  EnemyState, EnemyType, PlayerState, PlayerUpdatePayload,
  RawStats, StatePayload, GameOverPayload, EnemyDiedPayload,
} from './types';
import { HordeSpawner, SpawnType } from './HordeSpawner';

const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 640;
const GROUND_Y = 560;
const ENEMY_SPEED_PX_PER_S = 80;
const OVERRUN_THRESHOLD = 20;
const TICK_MS = 50; // 20fps

const INITIAL_STATS: RawStats = {
  budget: 50, clientHappiness: 50, technicalDebt: 30,
  teamMorale: 50, deliveryProgress: 0, complianceRisk: 20,
};

function enemyHp(type: SpawnType): number {
  if (type === 'boss') return 300;
  if (type === 'brute') return 120;
  return 40;
}

function regularEnemyType(ageMs: number): EnemyType {
  if (ageMs > 120_000) return 'spectre';
  if (ageMs > 60_000) return 'wraith';
  return 'goblin';
}

export class GameRoom {
  readonly id: string;
  players = new Map<string, PlayerState>();
  enemies = new Map<string, EnemyState>();
  readonly createdAt = Date.now();

  private spawner = new HordeSpawner();
  private bossAlive = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private gameOver = false;

  private onTick: (payload: StatePayload) => void;
  private onGameOver: (payload: GameOverPayload) => void;
  private onEnemyDied: (payload: EnemyDiedPayload) => void;

  constructor(
    id: string,
    onTick: (p: StatePayload) => void,
    onGameOver: (p: GameOverPayload) => void,
    onEnemyDied: (p: EnemyDiedPayload) => void,
  ) {
    this.id = id;
    this.onTick = onTick;
    this.onGameOver = onGameOver;
    this.onEnemyDied = onEnemyDied;
  }

  addPlayer(socketId: string, name: string, classId: string): void {
    this.players.set(socketId, {
      id: socketId, name, classId,
      x: 100, y: GROUND_Y, flipX: false, animKey: 'player-idle',
      hp: 100, stats: { ...INITIAL_STATS },
    });
    if (!this.tickInterval && !this.gameOver) this.startLoop();
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    if (this.players.size === 0) this.stopLoop();
  }

  updatePlayer(socketId: string, data: PlayerUpdatePayload): void {
    const p = this.players.get(socketId);
    if (p) Object.assign(p, data);
  }

  /** Returns true if enemy was killed. */
  hitEnemy(enemyId: string, damage: number, killerId: string): boolean {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return false;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      if (enemy.type === 'boss') this.bossAlive = false;
      this.enemies.delete(enemyId);
      this.onEnemyDied({ enemyId, killerId });
      return true;
    }
    return false;
  }

  getTimeSurvived(): number {
    return Math.floor((Date.now() - this.createdAt) / 1000);
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  private startLoop(): void {
    this.lastTick = Date.now();
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private stopLoop(): void {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  private tick(): void {
    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    this.moveEnemies(delta);
    this.spawner.tick(delta, this.bossAlive, (type) => this.spawnEnemy(type));

    if (this.enemies.size >= OVERRUN_THRESHOLD) {
      this.stopLoop();
      this.gameOver = true;
      this.onGameOver({
        reason: 'overrun',
        playerStats: Array.from(this.players.values()).map(p => ({
          id: p.id, name: p.name, classId: p.classId, stats: p.stats,
        })),
      });
      return;
    }

    this.onTick({
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      enemyCount: this.enemies.size,
    });
  }

  private moveEnemies(delta: number): void {
    const playerList = Array.from(this.players.values());
    if (playerList.length === 0) return;

    for (const enemy of this.enemies.values()) {
      const nearest = playerList.reduce((a, b) =>
        Math.abs(a.x - enemy.x) < Math.abs(b.x - enemy.x) ? a : b,
      );
      const dir: 1 | -1 = nearest.x > enemy.x ? 1 : -1;
      enemy.direction = dir;
      enemy.x += dir * ENEMY_SPEED_PX_PER_S * (delta / 1000);
      enemy.x = Math.max(0, Math.min(ARENA_WIDTH, enemy.x));
    }
  }

  private spawnEnemy(type: SpawnType): void {
    if (this.enemies.size >= OVERRUN_THRESHOLD) return;

    const side = Math.random() > 0.5;
    const x = side ? ARENA_WIDTH + 20 : -20;
    const direction: 1 | -1 = side ? -1 : 1;
    const hp = enemyHp(type);
    const enemyType: EnemyType =
      type === 'boss' ? 'boss' :
      type === 'brute' ? 'troll' :
      regularEnemyType(Date.now() - this.createdAt);

    if (type === 'boss') this.bossAlive = true;

    const id = uuid();
    this.enemies.set(id, {
      id, type: enemyType, x, y: GROUND_Y,
      direction, hp, maxHp: hp,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/GameRoom.ts
git commit -m "feat(server): add GameRoom with 20fps game loop and overrun detection"
```

---

## Task 5: LobbyManager + server index

**Files:**
- Create: `server/src/LobbyManager.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/LobbyManager.ts`**

```typescript
import { v4 as uuid } from 'uuid';
import { GameRoom } from './GameRoom';
import { EnemyDiedPayload, GameOverPayload, RoomInfo, StatePayload } from './types';
import type { Server } from 'socket.io';

export class LobbyManager {
  private rooms = new Map<string, GameRoom>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(): GameRoom {
    const id = uuid().slice(0, 8);
    const room = new GameRoom(
      id,
      (state: StatePayload) => this.io.to(id).emit('state', state),
      (payload: GameOverPayload) => this.io.to(id).emit('game_over', payload),
      (payload: EnemyDiedPayload) => this.io.to(id).emit('enemy_died', payload),
    );
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  getOrCreate(id: string | null): GameRoom {
    if (id && this.rooms.has(id)) return this.rooms.get(id)!;
    return this.createRoom();
  }

  removePlayerFromAllRooms(socketId: string): void {
    for (const [id, room] of this.rooms) {
      if (room.players.has(socketId)) {
        room.removePlayer(socketId);
        this.io.to(id).emit('player_left', { id: socketId });
        if (room.isEmpty()) {
          setTimeout(() => {
            if (room.isEmpty()) this.rooms.delete(id);
          }, 60_000);
        }
      }
    }
  }

  getLobbyInfo(): RoomInfo[] {
    return Array.from(this.rooms.values())
      .filter(r => !r.isEmpty())
      .map(r => ({
        id: r.id,
        playerCount: r.players.size,
        timeSurvived: r.getTimeSurvived(),
      }));
  }
}
```

- [ ] **Step 2: Create `server/src/index.ts`**

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { LobbyManager } from './LobbyManager';
import { AttackEnemyPayload, JoinRoomPayload, PlayerUpdatePayload } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

const lobby = new LobbyManager(io);

// Broadcast lobby list every 3 seconds
setInterval(() => {
  io.emit('lobby_update', { rooms: lobby.getLobbyInfo() });
}, 3000);

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // Client wants the current lobby list immediately on connect
  socket.emit('lobby_update', { rooms: lobby.getLobbyInfo() });

  socket.on('join_room', (payload: JoinRoomPayload) => {
    const { roomId, classId, name } = payload;
    const room = lobby.getOrCreate(roomId);

    room.addPlayer(socket.id, name, classId);
    socket.join(room.id);

    // Tell everyone else in the room about the new player
    socket.to(room.id).emit('player_joined', {
      id: socket.id, classId, name,
    });

    // Send the joiner their room + current state
    socket.emit('room_joined', {
      roomId: room.id,
      playerId: socket.id,
      state: {
        players: Array.from(room.players.values()),
        enemies: Array.from(room.enemies.values()),
        enemyCount: room.enemies.size,
      },
    });
  });

  socket.on('player_update', (payload: PlayerUpdatePayload) => {
    for (const room of [...io.sockets.adapter.rooms.keys()]) {
      const r = lobby.getRoom(room);
      if (r?.players.has(socket.id)) {
        r.updatePlayer(socket.id, payload);
        break;
      }
    }
  });

  socket.on('attack_enemy', (payload: AttackEnemyPayload) => {
    for (const room of [...io.sockets.adapter.rooms.keys()]) {
      const r = lobby.getRoom(room);
      if (r?.players.has(socket.id)) {
        r.hitEnemy(payload.enemyId, payload.damage, socket.id);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);
    lobby.removePlayerFromAllRooms(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Start the server and verify it runs**

```bash
cd server && npm run dev
```

Expected output:
```
Server running on http://localhost:3001
```

- [ ] **Step 4: Commit**

```bash
git add server/src/LobbyManager.ts server/src/index.ts
git commit -m "feat(server): add LobbyManager and Socket.io entry point"
```

---

## Task 6: Client — install socket.io-client + SocketClient wrapper

**Files:**
- Modify: `package.json` (root)
- Create: `src/game/network/SocketClient.ts`

- [ ] **Step 1: Install socket.io-client**

```bash
npm install socket.io-client
```

- [ ] **Step 2: Create `src/game/network/SocketClient.ts`**

```typescript
import { io, Socket } from 'socket.io-client';
import type {
  AttackEnemyPayload, MultiplayerGameOverPayload, JoinRoomPayload,
  LobbyUpdatePayload, PlayerUpdatePayload, RoomJoinedPayload, StatePayload,
} from '../../types/multiplayer';

export type { RoomJoinedPayload, StatePayload, MultiplayerGameOverPayload as GameOverPayload, LobbyUpdatePayload };

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let instance: SocketClient | null = null;

export class SocketClient {
  private socket: Socket;

  private constructor() {
    this.socket = io(SERVER_URL, { autoConnect: true });
  }

  static getInstance(): SocketClient {
    if (!instance) instance = new SocketClient();
    return instance;
  }

  static reset(): void {
    instance?.socket.disconnect();
    instance = null;
  }

  joinRoom(payload: JoinRoomPayload): void {
    this.socket.emit('join_room', payload);
  }

  sendPlayerUpdate(payload: PlayerUpdatePayload): void {
    this.socket.emit('player_update', payload);
  }

  attackEnemy(payload: AttackEnemyPayload): void {
    this.socket.emit('attack_enemy', payload);
  }

  onLobbyUpdate(cb: (p: LobbyUpdatePayload) => void): () => void {
    this.socket.on('lobby_update', cb);
    return () => this.socket.off('lobby_update', cb);
  }

  onRoomJoined(cb: (p: RoomJoinedPayload) => void): () => void {
    this.socket.on('room_joined', cb);
    return () => this.socket.off('room_joined', cb);
  }

  onState(cb: (p: StatePayload) => void): () => void {
    this.socket.on('state', cb);
    return () => this.socket.off('state', cb);
  }

  onGameOver(cb: (p: MultiplayerGameOverPayload) => void): () => void {
    this.socket.on('game_over', cb);
    return () => this.socket.off('game_over', cb);
  }

  onPlayerJoined(cb: (p: { id: string; classId: string; name: string }) => void): () => void {
    this.socket.on('player_joined', cb);
    return () => this.socket.off('player_joined', cb);
  }

  onPlayerLeft(cb: (p: { id: string }) => void): () => void {
    this.socket.on('player_left', cb);
    return () => this.socket.off('player_left', cb);
  }

  onEnemyDied(cb: (p: { enemyId: string; killerId: string }) => void): () => void {
    this.socket.on('enemy_died', cb);
    return () => this.socket.off('enemy_died', cb);
  }

  get id(): string {
    return this.socket.id ?? '';
  }
}
```

- [ ] **Step 3: Add `VITE_SERVER_URL` to `.env.example`**

Append to `.env.example`:
```
VITE_SERVER_URL=http://localhost:3001
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/game/network/SocketClient.ts .env.example
git commit -m "feat(client): add SocketClient wrapper for socket.io-client"
```

---

## Task 7: Horde arena level

**Files:**
- Create: `src/game/levels/hordeArena.ts`

- [ ] **Step 1: Create `src/game/levels/hordeArena.ts`**

```typescript
import { LevelData } from './types';

// Compact 1280×640 non-scrolling dungeon arena.
// No exit (horde mode). No enemies (server spawns them dynamically).
export const hordeArena: LevelData = {
  width: 1280,
  height: 640,
  playerStart: { x: 640, y: 520 },
  exitX: 99999, // never reached
  platforms: [
    // Ground — full width with two narrow gaps
    { x: 0,    y: 590, w: 420, h: 20 },
    { x: 460,  y: 590, w: 360, h: 20 },
    { x: 860,  y: 590, w: 420, h: 20 },

    // Mid tier — left cluster
    { x: 60,   y: 460, w: 180, h: 16 },
    { x: 300,  y: 430, w: 160, h: 16 },

    // Mid tier — centre
    { x: 530,  y: 400, w: 220, h: 16 },

    // Mid tier — right cluster
    { x: 820,  y: 430, w: 160, h: 16 },
    { x: 1040, y: 460, w: 180, h: 16 },

    // High tier — left
    { x: 100,  y: 290, w: 140, h: 16 },
    { x: 310,  y: 270, w: 130, h: 16 },

    // High tier — centre
    { x: 560,  y: 250, w: 160, h: 16 },

    // High tier — right
    { x: 840,  y: 270, w: 130, h: 16 },
    { x: 1040, y: 290, w: 140, h: 16 },

    // Ceiling ledges (extra vertical reach)
    { x: 200,  y: 150, w: 100, h: 16 },
    { x: 590,  y: 130, w: 100, h: 16 },
    { x: 980,  y: 150, w: 100, h: 16 },
  ],
  enemies: [],  // server-managed in multiplayer
  loots: [],    // server-managed in multiplayer
};
```

- [ ] **Step 2: Commit**

```bash
git add src/game/levels/hordeArena.ts
git commit -m "feat: add compact horde arena level layout"
```

---

## Task 8: RemotePlayer and RemoteEnemy entities

**Files:**
- Create: `src/game/entities/RemotePlayer.ts`
- Create: `src/game/entities/RemoteEnemy.ts`

- [ ] **Step 1: Create `src/game/entities/RemotePlayer.ts`**

```typescript
import Phaser from 'phaser';
import type { MultiplayerPlayerState } from '../../types/multiplayer';

/** Sprite for a player controlled by another browser. Interpolates position. */
export class RemotePlayer extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private targetX = 0;
  private targetY = 0;

  constructor(scene: Phaser.Scene, state: MultiplayerPlayerState) {
    super(scene, state.x, state.y);

    this.sprite = scene.add.sprite(0, 0, 'chars', 0);
    this.sprite.setDisplaySize(28, 28);
    this.sprite.setFlipX(state.flipX);

    this.nameTag = scene.add.text(0, -22, state.name, {
      fontSize: '9px',
      color: '#facc15',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);
    this.setDepth(9);

    this.targetX = state.x;
    this.targetY = state.y;
  }

  applyState(state: MultiplayerPlayerState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.sprite.setFlipX(state.flipX);
    if (state.animKey) this.sprite.play(state.animKey, true);
  }

  preUpdate(): void {
    // Lerp toward target for smooth visuals between 20fps ticks
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.3);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.3);
  }
}
```

- [ ] **Step 2: Create `src/game/entities/RemoteEnemy.ts`**

```typescript
import Phaser from 'phaser';
import type { MultiplayerEnemyState } from '../../types/multiplayer';

const ANIM_MAP: Record<string, string> = {
  goblin: 'goblin-walk',
  wraith: 'wraith-walk',
  troll: 'troll-walk',
  brute: 'troll-walk',
  spectre: 'spectre-idle',
  boss: 'boss-walk',
};

const DISPLAY_SIZE: Record<string, [number, number]> = {
  goblin: [24, 24], wraith: [24, 24], troll: [28, 28],
  brute: [36, 36], spectre: [24, 24], boss: [48, 48],
};

/** Sprite for a server-owned enemy. Used in multiplayer mode. */
export class RemoteEnemy extends Phaser.GameObjects.Sprite {
  readonly enemyId: string;
  private targetX: number;
  private targetY: number;

  constructor(scene: Phaser.Scene, state: MultiplayerEnemyState) {
    super(scene, state.x, state.y, 'chars', 0);
    this.enemyId = state.id;
    this.targetX = state.x;
    this.targetY = state.y;

    const [w, h] = DISPLAY_SIZE[state.type] ?? [24, 24];
    this.setDisplaySize(w, h);
    this.setDepth(8);
    scene.add.existing(this);

    const anim = ANIM_MAP[state.type] ?? 'goblin-walk';
    this.play(anim, true);
  }

  applyState(state: MultiplayerEnemyState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.setFlipX(state.direction === -1);
  }

  preUpdate(): void {
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.25);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.25);
  }

  /** Axis-aligned bounding rect for attack overlap checks. */
  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      this.displayWidth,
      this.displayHeight,
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/entities/RemotePlayer.ts src/game/entities/RemoteEnemy.ts
git commit -m "feat: add RemotePlayer and RemoteEnemy sprites for multiplayer"
```

---

## Task 9: GameScene — multiplayer mode

**Files:**
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Add multiplayer state fields and imports**

At the top of `GameScene.ts`, add these imports after the existing ones:

```typescript
import { SocketClient } from '../network/SocketClient';
import { RemotePlayer } from '../entities/RemotePlayer';
import { RemoteEnemy } from '../entities/RemoteEnemy';
import { hordeArena } from '../levels/hordeArena';
import type { StatePayload, MultiplayerGameOverPayload } from '../../types/multiplayer';
```

Inside the `GameScene` class, add these fields after the existing private fields:

```typescript
// Multiplayer
private isMultiplayer = false;
private socketClient: SocketClient | null = null;
private roomId: string | null = null;
private remotePlayers = new Map<string, RemotePlayer>();
private remoteEnemies = new Map<string, RemoteEnemy>();
private enemyCountText: Phaser.GameObjects.Text | null = null;
private positionUpdateTimer = 0;
private readonly POSITION_UPDATE_INTERVAL = 50; // ms
private socketCleanups: Array<() => void> = [];
```

- [ ] **Step 2: Update `init()` to accept multiplayer data**

Replace the existing `init` method:

```typescript
init(data?: { bossLevel?: boolean; multiplayer?: boolean; socketClient?: SocketClient; roomId?: string }) {
  this.isBossLevel = data?.bossLevel ?? false;
  this.bossDefeated = false;
  this.levelComplete = false;
  this.isMultiplayer = data?.multiplayer ?? false;
  this.socketClient = data?.socketClient ?? null;
  this.roomId = data?.roomId ?? null;
  this.remotePlayers.clear();
  this.remoteEnemies.clear();
  this.socketCleanups = [];
}
```

- [ ] **Step 3: Update `create()` to load horde arena in multiplayer mode**

Inside `create()`, replace the level selection line:
```typescript
// Before:
this.currentLevel = this.isBossLevel ? bossLevel : level1;

// After:
this.currentLevel = this.isMultiplayer ? hordeArena : (this.isBossLevel ? bossLevel : level1);
```

Add this at the **end** of `create()`, just before the closing brace:
```typescript
if (this.isMultiplayer) {
  this.setupMultiplayer();
}
```

- [ ] **Step 4: Add `setupMultiplayer()` method**

Add this private method to `GameScene`:

```typescript
private setupMultiplayer(): void {
  const sc = this.socketClient!;

  // Enemy count HUD
  this.enemyCountText = this.add.text(this.scale.width / 2, 10,
    'Enemies: 0 / 20',
    { fontSize: '13px', color: '#f87171', backgroundColor: '#00000088', padding: { x: 6, y: 3 } },
  ).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);

  // Apply server state tick
  const offState = sc.onState((payload: StatePayload) => {
    this.applyServerState(payload);
  });

  // Remote player joins
  const offJoined = sc.onPlayerJoined(({ id, classId, name }) => {
    if (!this.remotePlayers.has(id)) {
      const rp = new RemotePlayer(this, { id, name, classId, x: 100, y: 500, flipX: false, animKey: 'player-idle', hp: 100, stats: {} as never });
      this.remotePlayers.set(id, rp);
    }
  });

  // Remote player leaves
  const offLeft = sc.onPlayerLeft(({ id }) => {
    this.remotePlayers.get(id)?.destroy();
    this.remotePlayers.delete(id);
  });

  // Enemy killed confirmation
  const offEnemyDied = sc.onEnemyDied(({ enemyId }) => {
    this.remoteEnemies.get(enemyId)?.destroy();
    this.remoteEnemies.delete(enemyId);
  });

  // Game over
  const offGameOver = sc.onGameOver((payload: MultiplayerGameOverPayload) => {
    this.game.events.emit(GAME_OVER, {
      outcome: 'lose',
      stats: this.stats,
      reason: 'The team was overrun. 20 enemies on site.',
      multiplayerResult: payload,
    });
  });

  this.socketCleanups = [offState, offJoined, offLeft, offEnemyDied, offGameOver];
}
```

- [ ] **Step 5: Add `applyServerState()` method**

```typescript
private applyServerState(payload: StatePayload): void {
  const sc = this.socketClient!;

  // Update enemy count HUD
  this.enemyCountText?.setText(`Enemies: ${payload.enemyCount} / 20`);

  // Sync remote players (skip own socket id)
  const myId = sc.id;
  for (const ps of payload.players) {
    if (ps.id === myId) continue;
    let rp = this.remotePlayers.get(ps.id);
    if (!rp) {
      rp = new RemotePlayer(this, ps);
      this.remotePlayers.set(ps.id, rp);
    }
    rp.applyState(ps);
  }

  // Sync remote enemies
  const seen = new Set<string>();
  for (const es of payload.enemies) {
    seen.add(es.id);
    let re = this.remoteEnemies.get(es.id);
    if (!re) {
      re = new RemoteEnemy(this, es);
      this.remoteEnemies.set(es.id, re);
    }
    re.applyState(es);
  }
  // Remove enemies no longer in server state
  for (const [id, re] of this.remoteEnemies) {
    if (!seen.has(id)) { re.destroy(); this.remoteEnemies.delete(id); }
  }
}
```

- [ ] **Step 6: Update `update()` to send position and check RemoteEnemy attacks**

Add this block **inside the `update()` method**, right after `this.player.update(time)`:

```typescript
if (this.isMultiplayer) {
  // Send position to server
  this.positionUpdateTimer += this.sys.game.loop.delta;
  if (this.positionUpdateTimer >= this.POSITION_UPDATE_INTERVAL) {
    this.positionUpdateTimer = 0;
    this.socketClient!.sendPlayerUpdate({
      x: this.player.x,
      y: this.player.y,
      flipX: this.player.flipX,
      animKey: (this.player as unknown as { currentAnimKey?: string }).currentAnimKey ?? 'player-idle',
      hp: this.player.hp,
      stats: this.stats,
    });
  }

  // Attack against RemoteEnemies
  for (const [enemyId, re] of this.remoteEnemies) {
    if (this.player.isAttackHitting(re.getBounds())) {
      this.socketClient!.attackEnemy({ enemyId, damage: PLAYER_ATTACK_DAMAGE });
    }
  }
  return; // skip local enemy logic in multiplayer
}
```

- [ ] **Step 7: Clean up sockets on scene shutdown**

Add to the `GameScene` class (override `shutdown` lifecycle):

```typescript
shutdown(): void {
  this.socketCleanups.forEach(fn => fn());
  this.socketCleanups = [];
}
```

- [ ] **Step 8: Verify the game still loads in solo mode**

```bash
npm run dev
```

Open http://localhost:5173, play a few seconds of solo game. Confirm it still works normally.

- [ ] **Step 9: Commit**

```bash
git add src/game/scenes/GameScene.ts
git commit -m "feat: multiplayer mode in GameScene — RemotePlayer/Enemy sync, position emit, attack relay"
```

---

## Task 10: Player — expose current animation key + `emitPosition`

**Files:**
- Modify: `src/game/entities/Player.ts`

- [ ] **Step 1: Add `currentAnimKey` public field**

In `Player.ts`, add this field after `private attackKeys`:

```typescript
currentAnimKey = 'player-idle';
```

- [ ] **Step 2: Set `currentAnimKey` when animations play**

Find every call to `this.play(...)` in `Player.ts` and add an assignment before each. The update loop in Player.ts sets the animation based on movement. In the `update()` method, after setting the animation key (calls like `this.play('player-walk', true)`), add:

```typescript
// Example — find the actual play calls and mirror them:
// Before: this.play('player-walk', true);
// After:
this.currentAnimKey = 'player-walk';
this.play('player-walk', true);
```

Search for all `this.play(` calls in `Player.ts` and add the corresponding `this.currentAnimKey = '...'` line before each.

- [ ] **Step 3: Verify solo game still plays animations correctly**

```bash
npm run dev
```

Open http://localhost:5173 and play — confirm player walks and jumps with correct animations.

- [ ] **Step 4: Commit**

```bash
git add src/game/entities/Player.ts
git commit -m "feat: expose currentAnimKey on Player for multiplayer position sync"
```

---

## Task 11: PhaserGame — multiplayer props + enemy count HUD

**Files:**
- Modify: `src/game/PhaserGame.tsx`

- [ ] **Step 1: Add optional multiplayer props**

Replace the `PhaserGameProps` interface:

```typescript
interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: RawStats, reason: string | null, multiplayerResult?: MultiplayerResult) => void;
  socket?: SocketClient;
  roomId?: string;
}
```

Add the import and type at the top:

```typescript
import { SocketClient } from './network/SocketClient';
import type { MultiplayerGameOverPayload } from '../types/multiplayer';

export type MultiplayerResult = MultiplayerGameOverPayload;
```

- [ ] **Step 2: Pass socket + roomId to Phaser registry + scene init**

Inside the `useEffect` in `PhaserGame`, after `const game = new Phaser.Game(...)`, add:

```typescript
if (socket && roomId) {
  game.registry.set('multiplayerSocket', socket);
  game.registry.set('multiplayerRoomId', roomId);
}
```

Also update the `GAME_OVER` handler to pass `multiplayerResult`:

```typescript
const onGameOverEvent = ({ outcome, stats: finalStats, reason, multiplayerResult }: GameOverPayload & { multiplayerResult?: MultiplayerResult }) => {
  onGameOverRef.current(outcome, finalStats, reason, multiplayerResult);
};
```

- [ ] **Step 3: Pass socket/roomId through to `PhaserGame` invocation in `App.tsx` (done in Task 13)**

This step is a reminder — `App.tsx` will pass the props; this task is just the interface change.

- [ ] **Step 4: Commit**

```bash
git add src/game/PhaserGame.tsx
git commit -m "feat: PhaserGame accepts optional socket + roomId for multiplayer"
```

---

## Task 12: GameScene config — read socket from registry

**Files:**
- Modify: `src/game/config.ts`
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Read socket from registry in `GameScene.create()`**

In `GameScene.create()`, after the existing `this.classId = ...` line, add:

```typescript
const multiSocket = this.registry.get('multiplayerSocket') as SocketClient | undefined;
const multiRoomId = this.registry.get('multiplayerRoomId') as string | undefined;
if (multiSocket && multiRoomId) {
  this.isMultiplayer = true;
  this.socketClient = multiSocket;
  this.roomId = multiRoomId;
}
```

This makes the scene pick up the socket even when started fresh (e.g. after scene restart), since `init()` data may not be passed on every restart.

- [ ] **Step 2: Verify the registry read doesn't break solo mode**

```bash
npm run dev
```

Open http://localhost:5173, play solo. Confirm the registry returns `undefined` for multiplayer fields and the game runs normally.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/GameScene.ts
git commit -m "feat: GameScene reads socket from registry for multiplayer mode"
```

---

## Task 13: GamePhase type + StartScreen Solo/Multiplayer buttons

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/screens/StartScreen.tsx`

- [ ] **Step 1: Add `'lobby'` to `GamePhase`**

In `src/types/game.ts`, change:

```typescript
// Before:
export type GamePhase = 'start' | 'playing' | 'end';

// After:
export type GamePhase = 'start' | 'lobby' | 'playing' | 'end';
```

- [ ] **Step 2: Update `StartScreen` to accept `onMultiplayer` callback**

Replace the `Props` type and component in `src/screens/StartScreen.tsx`:

```typescript
type Props = {
  onStart: (cls: ConsultantClass) => void;
  onMultiplayer: (cls: ConsultantClass) => void;
};

export function StartScreen({ onStart, onMultiplayer }: Props) {
  const [selected, setSelected] = useState<ConsultantClass | null>(null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start overflow-y-auto bg-gray-950 p-6 text-gray-100">
      {/* ... keep all existing JSX above the button unchanged ... */}

      {/* Replace the single button with two buttons: */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => selected && onStart(selected)}
          disabled={!selected}
          className={`rounded-xl px-10 py-4 text-lg font-bold tracking-widest transition-all duration-200 ${
            selected
              ? 'cursor-pointer bg-purple-700 text-white shadow-lg shadow-purple-900/50 hover:bg-purple-600 active:scale-95'
              : 'cursor-not-allowed bg-gray-800 text-gray-600'
          }`}
        >
          {selected ? `▶ SOLO — ${selected.name.toUpperCase()}` : 'SELECT A CLASS TO BEGIN'}
        </button>
        <button
          onClick={() => selected && onMultiplayer(selected)}
          disabled={!selected}
          className={`rounded-xl px-10 py-3 text-base font-bold tracking-widest transition-all duration-200 ${
            selected
              ? 'cursor-pointer bg-blue-800 text-white hover:bg-blue-700 active:scale-95'
              : 'cursor-not-allowed bg-gray-800 text-gray-600'
          }`}
        >
          🌐 MULTIPLAYER
        </button>
      </div>
    </div>
  );
}
```

**Important:** Keep all existing JSX between the header and the button section — only the final `<div className="text-center">` block changes to the two-button layout above.

- [ ] **Step 3: Verify StartScreen renders two buttons when a class is selected**

```bash
npm run dev
```

Open http://localhost:5173, select a class — confirm two buttons appear. Click "Solo" — confirm game starts normally.

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts src/screens/StartScreen.tsx
git commit -m "feat: add 'lobby' phase and Solo/Multiplayer buttons to StartScreen"
```

---

## Task 14: LobbyScreen

**Files:**
- Create: `src/screens/LobbyScreen.tsx`

- [ ] **Step 1: Create `src/screens/LobbyScreen.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { SocketClient } from '../game/network/SocketClient';
import { ConsultantClass } from '../types/game';
import type { LobbyUpdatePayload, RoomJoinedPayload } from '../types/multiplayer';

type Props = {
  selectedClass: ConsultantClass;
  onJoined: (socket: SocketClient, roomId: string) => void;
  onBack: () => void;
};

interface RoomInfo {
  id: string;
  playerCount: number;
  timeSurvived: number;
}

export function LobbyScreen({ selectedClass, onJoined, onBack }: Props) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const sc = SocketClient.getInstance();

    const offLobby = sc.onLobbyUpdate((p: LobbyUpdatePayload) => {
      setRooms(p.rooms);
    });

    const offJoined = sc.onRoomJoined((p: RoomJoinedPayload) => {
      onJoined(sc, p.roomId);
    });

    return () => { offLobby(); offJoined(); };
  }, [onJoined]);

  const join = (roomId: string | null) => {
    if (joining) return;
    setJoining(true);
    const sc = SocketClient.getInstance();
    sc.joinRoom({
      roomId,
      classId: selectedClass.id,
      name: `${selectedClass.emoji} ${selectedClass.name}`,
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start overflow-y-auto bg-gray-950 p-6 text-gray-100">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🌐</div>
          <h1 className="text-2xl font-black tracking-widest text-purple-300"
            style={{ fontFamily: 'Cinzel Decorative, serif' }}>
            MULTIPLAYER LOBBY
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Playing as {selectedClass.emoji} {selectedClass.name}
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-xs font-bold tracking-widest text-purple-300">⚔️ ACTIVE GAMES</h2>
          {rooms.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No games running. Start one below!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rooms.map(r => (
                <div key={r.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-2">
                  <div>
                    <span className="text-sm font-bold text-green-400">🟢 Game #{r.id}</span>
                    <span className="ml-3 text-xs text-gray-400">
                      {r.playerCount} player{r.playerCount !== 1 ? 's' : ''} — {r.timeSurvived}s survived
                    </span>
                  </div>
                  <button
                    onClick={() => join(r.id)}
                    disabled={joining}
                    className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    JOIN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => join(null)}
            disabled={joining}
            className="flex-1 rounded-xl bg-purple-700 px-6 py-3 font-bold tracking-widest text-white hover:bg-purple-600 disabled:opacity-50"
          >
            ＋ NEW GAME
          </button>
          <button
            onClick={onBack}
            className="rounded-xl border border-gray-700 px-6 py-3 font-bold text-gray-400 hover:bg-gray-800"
          >
            ← BACK
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/LobbyScreen.tsx
git commit -m "feat: add LobbyScreen with live game list and join/create"
```

---

## Task 15: App.tsx — lobby phase + multiplayer game flow

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `App.tsx` entirely**

```typescript
import { useState } from 'react';
import { EndScreen } from './screens/EndScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { StartScreen } from './screens/StartScreen';
import { ConsultantClass, GamePhase, RawStats } from './types/game';
import { PhaserGame, MultiplayerResult } from './game/PhaserGame';
import { SocketClient } from './game/network/SocketClient';

type GameResult = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  loseReason: string | null;
  selectedClass: ConsultantClass;
  multiplayerResult?: MultiplayerResult;
};

function App() {
  const [phase, setPhase] = useState<GamePhase>('start');
  const [selectedClass, setSelectedClass] = useState<ConsultantClass | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  if (phase === 'start') {
    return (
      <StartScreen
        onStart={(cls) => {
          setSelectedClass(cls);
          setSocket(null);
          setRoomId(null);
          setPhase('playing');
        }}
        onMultiplayer={(cls) => {
          setSelectedClass(cls);
          setPhase('lobby');
        }}
      />
    );
  }

  if (phase === 'lobby' && selectedClass) {
    return (
      <LobbyScreen
        selectedClass={selectedClass}
        onJoined={(sc, rid) => {
          setSocket(sc);
          setRoomId(rid);
          setPhase('playing');
        }}
        onBack={() => setPhase('start')}
      />
    );
  }

  if (phase === 'end' && result) {
    return (
      <EndScreen
        outcome={result.outcome}
        stats={result.stats}
        loseReason={result.loseReason}
        selectedClass={result.selectedClass}
        multiplayerResult={result.multiplayerResult}
        onRestart={() => {
          SocketClient.reset();
          setSocket(null);
          setRoomId(null);
          setResult(null);
          setPhase('start');
        }}
      />
    );
  }

  // 'playing' phase
  return (
    <div className="w-screen h-screen bg-gray-950">
      <PhaserGame
        selectedClass={selectedClass!}
        socket={socket ?? undefined}
        roomId={roomId ?? undefined}
        onGameOver={(outcome, stats, reason, multiplayerResult) => {
          setResult({ outcome, stats, loseReason: reason, selectedClass: selectedClass!, multiplayerResult });
          setPhase('end');
        }}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify solo flow still works**

```bash
npm run dev
```

Open http://localhost:5173, play solo game to completion. Confirm end screen shows.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: App.tsx adds lobby phase and multiplayer game-over path"
```

---

## Task 16: EndScreen — multiplayer debrief panel

**Files:**
- Modify: `src/screens/EndScreen.tsx`

- [ ] **Step 1: Add `multiplayerResult` prop and debrief panel**

Replace the `Props` type:

```typescript
import type { MultiplayerResult } from '../game/PhaserGame';

type Props = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  loseReason: string | null;
  selectedClass: ConsultantClass | null;
  multiplayerResult?: MultiplayerResult;
  onRestart: () => void;
};
```

In the component body, before the existing `return`, add:

```typescript
const isMultiplayer = !!multiplayerResult;
```

Change the title/outcome text when multiplayer:

```typescript
// Replace the outcome heading JSX with:
<h1 className={`mb-2 text-3xl font-black tracking-widest ${isMultiplayer ? 'text-red-400' : (isWin ? 'text-green-400' : 'text-red-400')}`}
  style={{ fontFamily: 'Cinzel Decorative, serif' }}>
  {isMultiplayer ? 'OVERRUN' : (isWin ? 'PROJECT DELIVERED' : 'PROJECT CANCELLED')}
</h1>
```

After the existing `FINAL PROJECT METRICS` section div, add:

```typescript
{isMultiplayer && multiplayerResult && (
  <div className="mb-6 rounded-xl border border-blue-800 bg-blue-900/10 p-4">
    <h2 className="mb-4 text-xs font-bold tracking-widest text-blue-300">👥 TEAM DEBRIEF</h2>
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(multiplayerResult.playerStats.length, 2)}, 1fr)` }}>
      {multiplayerResult.playerStats.map((ps) => (
        <div key={ps.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
          <p className="mb-2 text-xs font-bold text-purple-300">{ps.name}</p>
          <StatBar label="Budget"      value={ps.stats.budget}           emoji="💰" />
          <StatBar label="Happiness"   value={ps.stats.clientHappiness}  emoji="😊" />
          <StatBar label="Morale"      value={ps.stats.teamMorale}       emoji="💪" />
          <StatBar label="Delivery"    value={ps.stats.deliveryProgress} emoji="🚀" />
          <StatBar label="Tech Debt"   value={ps.stats.technicalDebt}    emoji="🕷️" inverted />
          <StatBar label="Compliance"  value={ps.stats.complianceRisk}   emoji="⚖️" inverted />
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify solo end screen unchanged**

```bash
npm run dev
```

Finish a solo game, check the end screen looks the same as before.

- [ ] **Step 3: Commit**

```bash
git add src/screens/EndScreen.tsx
git commit -m "feat: EndScreen shows multiplayer team debrief when multiplayerResult present"
```

---

## Task 17: BootScene — dungeon background texture

**Files:**
- Modify: `src/game/scenes/BootScene.ts`

- [ ] **Step 1: Add `createDungeonBg` texture generation in `BootScene.create()`**

In `BootScene.ts`, add this method to the class:

```typescript
private createDungeonBg(): void {
  const W = 1280, H = 640;
  const gfx = this.make.graphics({ x: 0, y: 0 });

  // Dark stone base
  gfx.fillStyle(0x0d0d1a);
  gfx.fillRect(0, 0, W, H);

  // Stone brick rows
  gfx.lineStyle(1, 0x2a2a3a, 0.6);
  for (let y = 0; y < H; y += 32) {
    const offset = (Math.floor(y / 32) % 2) * 48;
    for (let x = -offset; x < W; x += 96) {
      gfx.strokeRect(x, y, 96, 32);
    }
  }

  // Dungeon floor darker stripe
  gfx.fillStyle(0x080810, 0.5);
  gfx.fillRect(0, H - 80, W, 80);

  // Torch glow spots (left, centre, right)
  for (const tx of [80, 640, 1200]) {
    gfx.fillStyle(0xf97316, 0.12);
    gfx.fillCircle(tx, 60, 120);
    gfx.fillStyle(0xfbbf24, 0.08);
    gfx.fillCircle(tx, 60, 60);
  }

  gfx.generateTexture('dungeon-bg', W, H);
  gfx.destroy();
}
```

In `create()`, call `this.createDungeonBg()` before `this.scene.start('GameScene')`.

- [ ] **Step 2: Use the texture in `GameScene.buildBackground()`**

In `GameScene.ts`, replace `buildBackground()`:

```typescript
private buildBackground(): void {
  const { width, height } = this.currentLevel;
  if (this.textures.exists('dungeon-bg') && this.isMultiplayer) {
    // Tile the dungeon background for the compact arena
    this.add.image(width / 2, height / 2, 'dungeon-bg').setDepth(0);
  } else {
    // Existing gradient background for solo levels
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(0);
    const stripe = this.isBossLevel ? 0x2d1b3d : 0x16213e;
    for (let x = 0; x < width; x += 160) {
      this.add.rectangle(x, height / 2, 80, height, stripe, 0.3).setDepth(0);
    }
  }
}
```

- [ ] **Step 3: Verify the dungeon background appears in multiplayer arena**

With server running (`npm run server`), open two browser tabs at http://localhost:5173. Both pick a class and click Multiplayer → New Game / Join. Confirm the dark stone brick background appears in the arena.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/BootScene.ts src/game/scenes/GameScene.ts
git commit -m "feat: programmatic dungeon brick background for horde arena"
```

---

## Task 18: Wire up + smoke test end-to-end

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Start everything**

In two terminals:
```bash
# Terminal 1 — client
npm run dev

# Terminal 2 — server
npm run server
```

- [ ] **Step 2: Smoke test solo flow**

1. Open http://localhost:5173
2. Pick a class → click "▶ SOLO"
3. Play to win or lose
4. Confirm end screen shows correctly
5. Click "NEW ENGAGEMENT" → returns to start screen

- [ ] **Step 3: Smoke test multiplayer flow**

1. Open two browser tabs at http://localhost:5173
2. Tab A: pick Architect → click 🌐 MULTIPLAYER → click "＋ NEW GAME"
3. Tab B: pick Developer → click 🌐 MULTIPLAYER → click JOIN on the game Tab A created
4. Confirm both tabs show the horde arena with dungeon background
5. Move Tab A's player — confirm Tab B sees the remote sprite move
6. Enemies appear and move toward players
7. Attack enemies — confirm they disappear for both players
8. Confirm enemy count HUD updates

- [ ] **Step 4: Update AGENTS.md**

Update the `## Commands` section in `AGENTS.md`:

```markdown
## Commands

\`\`\`bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # tsc + vite build
npm run lint         # eslint
npm run server       # Start multiplayer Socket.io server (port 3001) — requires cd server && npm install first
npm run dev:all      # Start both client and server concurrently
\`\`\`
```

Update the `## Architecture` section to add the new files and the `server/` directory.

Update `## Game progression` to describe the horde mode.

- [ ] **Step 5: Final commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for multiplayer horde mode"
```

---

## Post-Implementation Notes

- **CORS in production:** Set `CLIENT_ORIGIN` env var on the server to match the deployed client URL.
- **Server deploy:** `cd server && npm start` — no build step needed with `tsx`. For Railway/Fly.io, set `PORT` env var.
- **`bossLevel.ts` retained:** The boss level is kept for single-player mode. The boss now also spawns in horde mode via `HordeSpawner` every 2 minutes.
- **No test suite:** Verification is manual (smoke tests in Task 18). Consider adding Vitest for domain logic if the project grows.
