# Design: PhaserGame React Component (Issue #4)

**Date:** 2026-06-13  
**Status:** Approved

---

## Summary

Create the React component that bridges the Phaser 3 game engine and the React shell. This component owns the `Phaser.Game` instance lifecycle and React stat state. It is the communication hub between the Phaser scene world and the React UI.

---

## Files

| File | Role |
|------|------|
| `src/game/eventKeys.ts` | Named constants for all Phaser game event names (avoids magic strings in scenes and the component) |
| `src/game/config.ts` | Factory function that returns a `Phaser.Types.Core.GameConfig`; accepts the canvas parent `HTMLElement` and `ConsultantClass`; scenes array starts empty (populated in issues #5–9) |
| `src/game/PhaserGame.tsx` | React component: owns `Phaser.Game` lifecycle, React stat state, and event subscriptions |

---

## Component Interface

```ts
interface PhaserGameProps {
  selectedClass: ConsultantClass;
  onGameOver: (outcome: 'win' | 'lose', stats: GameStats, reason: string | null) => void;
}
```

---

## Event Protocol

All events travel on `game.events` (Phaser's top-level `EventEmitter`), emitted from scenes and consumed by `PhaserGame`.

| Event key constant | Direction | Payload |
|--------------------|-----------|---------|
| `STATS_CHANGED` | Scene → React | `GameStats` |
| `GAME_OVER` | Scene → React | `{ outcome: 'win' \| 'lose'; stats: GameStats; reason: string \| null }` |

Scenes emit via:
```ts
this.game.events.emit(STATS_CHANGED, newStats);
this.game.events.emit(GAME_OVER, { outcome, stats, reason });
```

---

## Data Sharing: React → Phaser

`selectedClass` and `INITIAL_STATS` are written into `game.registry` (Phaser's key-value store) during config so scenes can read class modifiers without prop-drilling:

```ts
// in createGameConfig:
callbacks: {
  preBoot: (game) => {
    game.registry.set('selectedClass', selectedClass);
    game.registry.set('stats', INITIAL_STATS);
  }
}
```

---

## Component Lifecycle

### Mount
1. Create `<div ref={containerRef}>` as the canvas parent.
2. Instantiate `Phaser.Game` via `createGameConfig(containerRef.current!, selectedClass)`.
3. Subscribe: `game.events.on(STATS_CHANGED, setStats)`.
4. Subscribe: `game.events.on(GAME_OVER, handler)` — calls `props.onGameOver`.

### Unmount
5. `game.events.off(STATS_CHANGED)`.
6. `game.events.off(GAME_OVER)`.
7. `game.destroy(true)`.

---

## Render Structure

```tsx
<div className="relative w-full h-full">
  <div ref={containerRef} />   {/* Phaser canvas mounts here */}
  {/* HUD overlay — populated in issue #10 */}
</div>
```

The `stats` state is held in `PhaserGame` so that the HUD overlay (issue #10) can consume it as a prop when it is added.

---

## `config.ts` Shape

```ts
export function createGameConfig(
  parent: HTMLElement,
  selectedClass: ConsultantClass,
): Phaser.Types.Core.GameConfig
```

- `type: Phaser.AUTO`
- `width: 960, height: 540`
- `physics: { default: 'arcade', arcade: { gravity: { y: 600 }, debug: false } }`
- `scene: []` — empty until scenes are created in issues #5–9
- `parent` — the container `HTMLElement`
- `preBoot` callback to populate `game.registry`

---

## Constraints

- No external event bus library — Phaser's built-in `EventEmitter` only.
- `PhaserGame` must not import from scene files (scenes are lazily discovered at runtime via the config scenes array).
- `stats` lives in React state; Phaser scenes must not hold their own authoritative copy — they emit changes and the React component is the source of truth for the HUD.
