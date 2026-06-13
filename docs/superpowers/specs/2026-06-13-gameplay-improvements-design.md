# Gameplay Improvements Design — Dungeons & Deliverables

**Date:** 2026-06-13  
**Scope:** Combat feel · Active class abilities · Two new levels  
**Approach:** Sequential — combat feel first, then abilities, then levels

---

## 1. Combat Feel

### Goal
Make every hit, kill, and damage event feel impactful through screen shake, knockback, visual flash, and death burst effects — without touching visual assets (pixel art incoming separately).

### Screen Shake
Use Phaser's built-in `cameras.main.shake(duration, intensity)` on three events:

| Event | Duration | Intensity |
|---|---|---|
| Player takes damage | 250ms | 0.008 |
| Player lands an attack hit | 80ms | 0.003 |
| Enemy dies | 150ms | 0.005 |

Triggered in `GameScene` at the point each event is already handled.

### Knockback
- **Enemy hit**: apply a short horizontal velocity impulse (`±300 vx` for 100ms) on the enemy's physics body, in the direction away from the player. Implemented by extending `Enemy.takeDamage(amount, attackerX)` with an optional `attackerX` parameter. The impulse is applied as a one-shot velocity; the patrol AI resumes after 120ms via a `delayedCall`.
- **Player hit**: apply `±250 vx` and `-80 vy` on the player's body away from the damage source. Added inside `Player.takeDamage()`. The existing invincibility window (800ms) prevents stacking.

### Hit Flash
- **Enemy**: already flashes red (`setTint(0xff4444)` for 100ms). Extend to also scale-pulse (`setScale(1.15)` → `setScale(1.0)` over 80ms) for extra impact.
- **Player**: during the 800ms invincibility window, pulse alpha between 1.0 and 0.3 every 100ms using a Phaser tween. Already has a static `setAlpha(0.5)` — replace with the pulsing tween, cancelled on iframes expiry.

### Death Burst
On enemy death, spawn 6–8 small rectangles (8×8px, enemy's colour) that fly outward radially using `scene.tweens.add` with random angle, distance 40–80px, duration 300ms, alpha fade to 0. Pure tween — no physics bodies.

New file: `src/game/effects.ts`

```ts
export function spawnDeathBurst(scene: Phaser.Scene, x: number, y: number, color: number): void
```

Called from `GameScene.onEnemyDied()`. The enemy's tint colour is already available via `ENEMY_CONFIGS[type].color`.

### Attack Box Improvement
The existing `attackBox` rectangle gets a scale-punch tween: `scaleX/Y: 1.3` over 60ms then back to `1.0`, alongside the existing destroy timer. Implemented inside `Player.showAttackBox()`.

---

## 2. Active Class Abilities

### Goal
Each consultant class has a unique active ability on a cooldown, pressed with `Q`. Abilities change enemy state and/or emit stat changes. The HUD shows the ability name and cooldown state.

### Key Binding
`Q` key — `Phaser.Input.Keyboard.JustDown` checked in `GameScene.update()`. When fired, call `this.player.activateAbility(time, scene, enemies, projectiles)`.

### Ability Definitions

| Class ID | Ability Name | Effect | Cooldown |
|---|---|---|---|
| `architect` | **Draft Architecture** | All active enemies slow to 50% speed for 5s; emit `technicalDebt: -10` | 15s |
| `developer` | **Ship Hotfix** | Deal 60 damage to all enemies within 180px of player; emit `deliveryProgress: +5` | 10s |
| `ux` | **User Research** | Freeze all active enemies for 3s (velocity = 0, AI paused); emit `clientHappiness: +8` | 20s |
| `datascientist` | **Run the Model** | Cycle all loot tint between `0xffff00` and `0xffffff` every 200ms for 3s (Phaser tween repeat); emit `deliveryProgress: +8, complianceRisk: +5` | 12s |
| `pm` | **Call a Meeting** | Reverse all active enemies' patrol direction for 4s (they flee); emit `teamMorale: +8` | 18s |
| `security` | **Deploy Firewall** | Destroy all active projectiles; make player immune to projectiles for 4s (flag on Player); emit `complianceRisk: -10` | 15s |
| `accountmanager` | **Escalate** | Stun the nearest enemy for 5s (freeze + yellow tint); emit `clientHappiness: +5` | 12s |
| `intern` | **Wildcard** | 70% chance: randomly pick one of the above class effects (equal weight); 30% chance: bad variant — apply random stat delta between -10 and +5 on a random stat | 8s |

### Implementation

**`Player.ts`**
- Add `private abilityCooldownTimer = 0` and `private projectileImmunityUntil = 0`
- Add `activateAbility(time: number, scene: Phaser.Scene, enemies: Group, projectiles: Group): Partial<GameStats> | null` — returns stat delta or null if on cooldown
- Per-class logic in a `switch(this.classId)` block; each case is ≤10 lines
- For complex abilities (slow, freeze, flee), add temporary state flags on each `Enemy` instance via `enemy.setData('slowed', true)` and check in `Enemy.preUpdate()`
- `isProjectileImmune(time: number): boolean` — used in `GameScene` overlap handler

**`Enemy.ts`**
- `preUpdate`: check `getData('frozen')`, `getData('slowed')`, `getData('fleeing')` flags and override velocity/patrol accordingly
- `clearAbilityEffects()` — called via `delayedCall` when effect expires

**`GameScene.ts`**
- Bind `Q` key in `create()`
- In `update()`: on `JustDown(qKey)`, call `activateAbility()`, apply returned stat delta, emit stats
- Projectile overlap: check `this.player.isProjectileImmune(time)` before applying damage

**`PhaserGame.tsx` HUD**
- On `ABILITY_USED` event, store `{ name: string; activatedAt: number; cooldownMs: number }` in React state
- A `useEffect` with a 100ms `setInterval` derives `cooldownPct = Math.min(1, (Date.now() - activatedAt) / cooldownMs)` and updates state; interval clears when `cooldownPct >= 1`
- Render a small ability row below the stat bars: ability name + a thin cooldown progress bar (grey fill → purple fill as cooldown completes)

**New event key:** `ABILITY_USED` — payload `{ name: string; cooldownMs: number }` — added to `eventKeys.ts`

---

## 3. Two New Levels

### Goal
Add Level 2 and Level 3 between the current Level 1 and the Boss Level, with increasing difficulty and a new loot type.

### New Loot Type: `compliance`
- Stat effect: `complianceRisk: -15`
- Texture key: `loot-compliance` — generated in `BootScene` alongside existing loot textures
- Added to `LOOT_STATS` in `GameScene`: `compliance: { complianceRisk: -15 }`

### Level 2 — "The Open Plan Office"
- **Width:** 4000px · **Theme:** bureaucracy, distractions
- **Difficulty:** moderate-hard — more spectres and wraiths (annoying, ranged/fast), first grouped spawns (2 enemies close together)
- **Platforms:** higher density, more vertical layering to reward skilled jumpers
- **Loots:** 5 pickups including first `compliance` loot
- **Transition:** reaches `exitX` → starts Level 3

### Level 3 — "The Architecture Review"
- **Width:** 3600px · **Theme:** technical death march
- **Difficulty:** hard — troll-heavy, multiple spectres at elevation, tighter gaps
- **Platforms:** longer jumps, loot placed on harder-to-reach elevated platforms
- **Loots:** 5 pickups, mix of all 4 types
- **Transition:** reaches `exitX` → starts Boss Level

### Level Progression Chain
`Level 1 → Level 2 → Level 3 → Boss Level`

`GameScene` stores the current level index in `game.registry` as `'levelIndex'` (0-based: 0=Level1, 1=Level2, 2=Level3, 3=BossLevel). The `isBossLevel` flag becomes `levelIndex === 3`. `onLevelComplete()` reads the current index, increments it, sets it in registry, then calls `this.scene.start('GameScene', { levelIndex })`. The `init(data)` method reads `levelIndex` from data.

**New files:**
- `src/game/levels/level2.ts`
- `src/game/levels/level3.ts`

No changes to `LevelData` type or `types.ts`.

---

## Affected Files Summary

| File | Change Type |
|---|---|
| `src/game/effects.ts` | **New** — `spawnDeathBurst` helper |
| `src/game/scenes/BootScene.ts` | Add `loot-compliance` texture generation |
| `src/game/scenes/GameScene.ts` | Screen shake, Q binding, ability dispatch, level index chain, compliance loot |
| `src/game/entities/Player.ts` | Knockback on damage, ability method, projectile immunity flag, attack box punch |
| `src/game/entities/Enemy.ts` | Knockback impulse, ability effect flags (`frozen`, `slowed`, `fleeing`), `clearAbilityEffects` |
| `src/game/eventKeys.ts` | Add `ABILITY_USED` constant |
| `src/game/PhaserGame.tsx` | Ability HUD row (name + cooldown bar) |
| `src/game/levels/level2.ts` | **New** — Level 2 layout |
| `src/game/levels/level3.ts` | **New** — Level 3 layout |

---

## Out of Scope
- Audio (deferred)
- Visual sprite/art replacement (external contributor)
- High score / replayability loop
- Between-level shop
- New enemy types
