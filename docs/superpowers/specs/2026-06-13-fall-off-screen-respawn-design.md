# Fall-Off-Screen Respawn — Design

**Date:** 2026-06-13

## Problem

When the player falls below the visible world, the game continues unaffected. There is no detection, no consequence, and no recovery.

## Solution

Detect when the player's Y position exceeds the world floor and respawn them at the level's start position with a stat penalty.

## Detection

In `GameScene.update()`, after calling `this.player.update(time)`:

```
if (player.y > currentLevel.height + 50) → trigger fall respawn
```

The `+ 50` buffer prevents false positives at the exact world boundary.

## Respawn Behaviour

- Reposition player to `currentLevel.playerStart` (x, y)
- Reset player velocity to zero
- Apply stat penalty: `-10 budget`, `-10 teamMorale`
- Grant invincibility: set `player.lastHitTime = time.now` so the existing 1-second iframes kick in and prevent immediate contact damage on landing

## Stat Penalty Rationale

| Stat | Delta | Thematic reason |
|---|---|---|
| `budget` | -10 | Emergency helicopter extraction invoice |
| `teamMorale` | -10 | The team watched you fall into the pit |

Repeated falls naturally drain stats toward a lose condition without a hard instant-death rule.

## Files Changed

- `src/game/scenes/GameScene.ts` — add fall detection + respawn logic in `update()`

## Out of Scope

- Death animation or screen flash (can be added later)
- Per-level custom penalties
- Fall counter tracking
