# Basic Attack Ability Design

**Date:** 2026-06-13  
**Status:** Approved (autopilot — user unavailable, decision made autonomously)

---

## Problem

The player's melee attack (Z/X keys) already works mechanically — it creates a hitbox and deals 25 damage on hit with a 400ms cooldown. However:

- Every class deals identical 25 damage, making classes feel the same in combat
- There is no HUD indicator — players have no visual cue the attack exists, its keybind, or when it's ready
- The Q ability button is the only visible action in the HUD

## Goal

Make the basic attack a first-class feature:
1. **Class-specific attack damage** — each consultant class deals different damage, reinforcing their identity
2. **HUD Z button** — a visible attack button with cooldown ring and tooltip, consistent with the existing Q ability button

---

## Architecture

### New constant: `CLASS_ATTACK_DAMAGE` in `src/constants/classes.ts`

Per-class base damage values. Intern uses `null` to signal random (10–40).

| Class           | Damage | Rationale                                  |
|-----------------|--------|--------------------------------------------|
| architect       | 20     | Methodical, not a brawler                  |
| developer       | 30     | Ships fast, hits hard                      |
| ux              | 20     | Empathetic but not aggressive              |
| datascientist   | 25     | Analytical baseline                        |
| pm              | 15     | Weakest fighter; compensates with abilities|
| security        | 35     | Strongest — threat response is assertive   |
| accountmanager  | 25     | Balanced, smooth                           |
| intern          | null   | Random 10–40 per swing (wildcard theme)    |

### New event: `ATTACK_USED` in `src/game/eventKeys.ts`

Emitted by `Player` when an attack fires. Payload: `{ cooldownMs: number }`. Follows the same pattern as `ABILITY_USED`.

### Player changes (`src/game/entities/Player.ts`)

- Export `ATTACK_COOLDOWN` so it can be used in React for display
- Add `getAttackDamage(): number` — returns class-specific damage (random 10–40 for intern)
- Emit `ATTACK_USED` via `this.scene.game.events` when attack fires

### GameScene changes (`src/game/scenes/GameScene.ts`)

- Remove `PLAYER_ATTACK_DAMAGE` constant
- Use `this.player.getAttackDamage()` per swing

### PhaserGame changes (`src/game/PhaserGame.tsx`)

- Listen to `ATTACK_USED` event, track `attackCooldown` state (same shape as ability cooldown)
- Render a "Z" button at `left-56` (to the left of the Q button)
- Cooldown ring uses white/gray color (neutral, since attack is universal)
- Tooltip: "Z · Basic Attack", damage value or range, cooldown duration

---

## Data Flow

```
Player.update() → attackPressed → showAttackBox()
                               → game.events.emit(ATTACK_USED, { cooldownMs })

GameScene.update() → player.isAttackHitting(enemy)
                   → enemy.takeDamage(player.getAttackDamage())

PhaserGame ← ATTACK_USED → setAttackCooldown → renders Z button ring
```

---

## Out of Scope

- Attack animations (separate concern)
- Class-specific attack sound effects
- Class-specific attack VFX colors (attack box already shows white flash)
