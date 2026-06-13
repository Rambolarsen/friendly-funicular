# Multiplayer Horde Mode Design

**Date:** 2026-06-13  
**Status:** Approved  

---

## Overview

Add co-op networked multiplayer to Dungeons & Deliverables as an **endless horde survival mode**. Players join from separate browsers, each maintain their own stat pool, and fight off continuously spawning enemies together. The game ends when the team gets overrun (too many enemies alive at once). An end screen shows each player's individual stats — everyone wins together, but you can see who pulled their weight. The existing single-player game is fully preserved — a new "Multiplayer" button on the start screen opens the multiplayer path.

---

## Game Mode: Horde Survival

### Arena
- A new compact, non-scrolling dungeon room (`hordeArena.ts`) replaces the two-level progression for multiplayer.
- Dimensions: ~1280×640px — fits in a single viewport, no camera scrolling.
- Dense multi-tier platform layout with a dark dungeon/office aesthetic.
- New tiled background asset replaces the current gradient placeholder.
- The existing level1 and bossLevel remain intact for single-player.

### Spawn Schedule (server-controlled)
| Interval | Enemy | Notes |
|----------|-------|-------|
| Every 3–5s (random) | Regular enemy | Goblin → Wraith → Spectre as time progresses |
| Every 30s | **Brute** | `EnemyType.Troll` with 3× base HP; no new entity needed |
| Every 2 min | **Boss** | Existing Boss entity; trickle pauses while boss is alive |

- Spawn rate accelerates over time: interval shrinks every 2 minutes (floor: 1.5s).
- Max 20 concurrent enemies to prevent total chaos.
- Enemies spawn at the level edges (off-screen left/right).

### Player Stats (Individual)
- Each player maintains their own `RawStats` pool.
- Kills reward **your** stats using your class kill bonus — killing more = better personal stats.
- Taking damage penalizes **your** stats.
- Loot pickups benefit only the player who collects them.
- Stats are **not** a lose condition in multiplayer — they are a personal performance score.

### Lose Condition: Overrun
- The server tracks the count of living enemies at all times.
- If **20 or more enemies** are alive simultaneously → the team is overrun → game over for all.
- Killing enemies fast keeps the team alive. Slow players indirectly hurt the team.

### End Screen: Debrief
- On game over, the server sends each player's final `RawStats` to all clients.
- The end screen shows a side-by-side stat comparison for all players.
- No explicit winner — the debrief is informational and lets players see each other's performance naturally.

### Mid-game Joining
- Players can join an active game at any time.
- New player picks a class on the StartScreen, then joins via the lobby.
- They spawn at the arena's player start position.
- Player display name: auto-generated as `"Player N"` (N = socket join order). No auth required.

---

## Architecture

### Transport
**Socket.io** over WebSockets. Self-hosted Node.js server, deployable to Railway / Fly.io.

### Authority Model
The server is authoritative for all game state:
- Player positions (resolved from client input)
- Enemy positions and AI
- Stat mutations and lose conditions
- Spawn schedule

Clients send input only; they never self-report positions.

### Message Protocol

**Client → Server** (every frame, ~60fps):
```ts
{ type: 'input', move: -1 | 0 | 1, jump: boolean, attack: boolean }
```

**Server → Clients** (every tick, ~20fps):
```ts
{
  type: 'state',
  players: { id: string, x: number, y: number, classId: string, hp: number, stats: RawStats }[],
  enemies: { id: string, type: string, x: number, y: number, hp: number }[],
  enemyCount: number   // current living enemy count (shown in HUD)
}
```

**Server → Clients** (on event):
```ts
{ type: 'player_joined', id: string, classId: string, name: string }
{ type: 'player_left', id: string }
{ type: 'game_over', reason: 'overrun', playerStats: { id: string, name: string, classId: string, stats: RawStats }[] }
{ type: 'boss_spawned' }
{ type: 'boss_defeated' }
```

**Server → All** (lobby, every 3s):
```ts
{ type: 'lobby_update', rooms: { id: string, playerCount: number, timeSurvived: number }[] }
```

### Client-side Interpolation
Clients interpolate remote player and enemy positions between 20fps server ticks to achieve smooth 60fps visuals.

---

## Server Structure

```
server/
  index.ts          # Express + Socket.io bootstrap
  GameRoom.ts       # Authoritative state for one room: players, enemies, stats, timers
  HordeSpawner.ts   # Trickle + brute + boss spawn logic and escalation
  LobbyManager.ts   # Tracks all active GameRoom instances; emits lobby_update
  types.ts          # Shared message types (imported by client too)
```

- Each room runs its own game loop (`setInterval` at 20fps).
- `GameRoom` owns all physics resolution for players and enemies (simple AABB or server-mirrored Phaser-free logic).
- When all players disconnect, the room is kept alive for 60s then cleaned up.

---

## Client Changes

### New Files
| File | Purpose |
|------|---------|
| `src/screens/LobbyScreen.tsx` | Public lobby list: shows active games with player count and time survived. Refreshed via socket `lobby_update` events. |
| `src/game/network/SocketClient.ts` | Thin wrapper around `socket.io-client`. Exposes typed `send()` and `on()` methods. Singleton per session. |
| `src/game/entities/RemotePlayer.ts` | Phaser sprite for other players. Position driven by interpolated network state, not keyboard input. |
| `src/game/levels/hordeArena.ts` | New compact arena layout (platforms + spawn edge markers). No exit, no loots array (loots spawn dynamically from server). |

### Modified Files
| File | Change |
|------|--------|
| `src/screens/StartScreen.tsx` | Add **"▶ Play Solo"** and **"🌐 Multiplayer"** buttons after class selection. Solo follows existing flow. Multiplayer sets phase to `'lobby'`. |
| `src/App.tsx` | Add `'lobby'` to `GamePhase` (also update `src/types/game.ts`). Render `LobbyScreen` during lobby phase. Pass `SocketClient` instance and `roomId` to `PhaserGame` for multiplayer games. |
| `src/game/scenes/GameScene.ts` | In multiplayer mode: load `hordeArena`, spawn `RemotePlayer` sprites from server state, delegate enemy spawning to server events, remove exit trigger. |
| `src/game/entities/Player.ts` | In multiplayer mode: send input events via `SocketClient` each frame instead of resolving movement locally. Position is updated from server state. |
| `src/game/PhaserGame.tsx` | Accept optional `socket` and `roomId` props. In multiplayer mode, listen to server `state` events to update remote players. Show player name tags above sprites. HUD shows your own stats + a live enemy count. |
| `src/screens/EndScreen.tsx` | In multiplayer mode, show side-by-side `RawStats` debrief for all players instead of the single-player win/lose screen. |
| `src/game/scenes/BootScene.ts` | Preload new dungeon background tileset/image. |

### Removed Files
| File | Reason |
|------|--------|
| `src/game/levels/bossLevel.ts` | Boss now spawns inline in the horde arena on a timer. |

`Boss.ts` is **kept** — reused for the 2-minute interval boss spawn in horde mode.

---

## UI Flow

```
StartScreen (pick class)
  ├─ [▶ Play Solo]     → playing (existing single-player flow, unchanged)
  └─ [🌐 Multiplayer]  → lobby
                            ├─ [JOIN existing game] → playing (multiplayer)
                            └─ [＋ New game]         → playing (multiplayer)
```

---

## Out of Scope
- Reconnection handling beyond basic socket reconnect
- Player authentication / persistent usernames
- Spectator mode
- Mobile / gamepad input
- Chat
