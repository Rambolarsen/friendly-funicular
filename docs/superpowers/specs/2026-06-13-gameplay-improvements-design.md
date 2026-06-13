# Gameplay Improvements Design — Dungeons & Deliverables

**Date:** 2026-06-13  
**Scope:** Combat feel · Active class abilities · Two new levels  
**Approach:** Sequential vertical slices — combat feedback first, then active abilities, then level progression/content

---

## 1. Combat Feel

### Goal
Make every hit, kill, and damage event feel more impactful with camera feedback, knockback, stronger hit reactions, and lightweight death particles — while staying inside the existing Phaser 3 scene/entity structure.

### Screen Shake
Use Phaser's built-in `cameras.main.shake(duration, intensity)` at the points where `GameScene` already resolves combat outcomes:

| Event | Duration | Intensity |
|---|---|---|
| Player takes damage | 250ms | 0.008 |
| Player lands an attack hit | 80ms | 0.003 |
| Enemy dies | 150ms | 0.005 |

### Knockback
- **Enemy hit**: extend `Enemy.takeDamage(amount, attackerX?)` so it can apply a short horizontal impulse (`±300 vx`) away from the player before normal patrol resumes.
- **Player hit**: extend `Player.takeDamage(amount, currentStats, time, sourceX?)` so enemy contact and projectile hits can apply `±250 vx` plus `-80 vy` away from the source.
- The existing 800ms invincibility window still prevents repeated player knockback stacking.

### Hit Flash
- **Enemy**: keep the existing red tint flash, and add a brief scale punch (`1.15` → `1.0` over ~80ms).
- **Player**: replace the static `setAlpha(0.5)` invincibility treatment with a looping alpha tween (`1.0` ↔ `0.3`) that starts when damage lands and stops automatically when iframes end or are refreshed.

### Death Burst
Add a small helper in `src/game/effects.ts`:

```ts
export function spawnDeathBurst(scene: Phaser.Scene, x: number, y: number, color: number): void
```

It should spawn 6–8 simple rectangles (no physics bodies) that tween outward radially, fade to zero alpha, and self-destroy. `GameScene.onEnemyDied()` calls it using the enemy's configured tint from `ENEMY_CONFIGS`.

### Attack Box Improvement
Keep the current transient `attackBox` rectangle, but add a short scale-punch tween when it appears so melee attacks feel less flat.

---

## 2. Active Class Abilities

### Goal
Each consultant class gets one active ability on `Q`, with a visible cooldown in the React HUD. Abilities may affect enemies, projectiles, loot, or stats, but the orchestration stays in `GameScene`, which already owns the active groups and event emission.

### Key Binding
Bind `Q` in `GameScene.create()` and check `Phaser.Input.Keyboard.JustDown()` in `GameScene.update()`.

### Ability Definitions

| Class ID | Ability Name | Effect | Cooldown |
|---|---|---|---|
| `architect` | **Draft Architecture** | All active enemies slow to 50% speed for 5s; emit `technicalDebt: -10` | 15s |
| `developer` | **Ship Hotfix** | Deal 60 damage to all enemies within 180px of player; emit `deliveryProgress: +5` | 10s |
| `ux` | **User Research** | Freeze all active enemies for 3s; emit `clientHappiness: +8` | 20s |
| `datascientist` | **Run the Model** | Pulse all active loot tints for 3s; emit `deliveryProgress: +8, complianceRisk: +5` | 12s |
| `pm` | **Call a Meeting** | Reverse all active enemies' patrol direction for 4s; emit `teamMorale: +8` | 18s |
| `security` | **Deploy Firewall** | Destroy all active projectiles; make the player immune to projectiles for 4s; emit `complianceRisk: -10` | 15s |
| `accountmanager` | **Escalate** | Stun the nearest active enemy for 5s; emit `clientHappiness: +5` | 12s |
| `intern` | **Wildcard** | 70% chance: randomly copy one non-intern class effect; 30% chance: apply a random stat delta between `-10` and `+5` on a random stat | 8s |

### Implementation Shape

**Shared data**
- Update `src/constants/classes.ts` so each class's existing `abilityName` copy matches the active ability names above. This keeps the class picker, end screen, and cooldown HUD consistent.
- Add `AbilityUsedPayload` to `src/types/game.ts`:

```ts
export type AbilityUsedPayload = {
  name: string;
  cooldownMs: number;
};
```

**New file: `src/game/abilities.ts`**
- Centralize active ability behavior in a helper instead of pushing full scene-wide logic into `Player`.
- Export a typed `useClassAbility(ctx)` function that receives the scene, current time, player, enemy group, projectile group, and loot group, and returns either `null` (cooldown/not applicable) or:

```ts
type AbilityUseResult = {
  name: string;
  cooldownMs: number;
  statDelta?: Partial<RawStats>;
};
```

**`Player.ts`**
- Add cooldown and projectile-immunity state only:
  - `private abilityCooldownUntil = 0`
  - `private projectileImmunityUntil = 0`
- Add helper methods:
  - `isAbilityReady(time: number): boolean`
  - `startAbilityCooldown(time: number, cooldownMs: number): void`
  - `grantProjectileImmunity(time: number, durationMs: number): void`
  - `isProjectileImmune(time: number): boolean`
- Keep movement, attack, damage, and passive kill bonuses inside `Player`; do **not** move scene-wide ability orchestration there.

**`Enemy.ts`**
- Add typed temporary-effect state instead of `setData()` flags:
  - `slowUntil`
  - `freezeUntil`
  - `fleeUntil`
  - `stunUntil`
- Add methods such as `applySlow(until)`, `applyFreeze(until)`, `applyFlee(until)`, `applyStun(until)`, and `clearExpiredEffects(time)`.
- `preUpdate()` should derive effective movement from those fields before calling/overriding patrol behavior.

**`GameScene.ts`**
- Bind `Q` in `create()`.
- In `update()`, when `Q` is pressed, call `useClassAbility(...)`.
- If an ability succeeds:
  1. apply `statDelta` with `applyStatChanges`
  2. emit `STATS_CHANGED`
  3. emit `ABILITY_USED`
- In the projectile overlap handler, check `this.player.isProjectileImmune(time)` before applying damage.

**`PhaserGame.tsx`**
- Listen for `ABILITY_USED`.
- Store `{ name, activatedAt, cooldownMs }` in React state.
- Render a small HUD row below the stat bars: ability name plus a thin progress bar that fills as cooldown elapses.

**New event key**
- Add `ABILITY_USED` to `src/game/eventKeys.ts`.

---

## 3. Two New Levels

### Goal
Insert Level 2 and Level 3 between the existing Level 1 and Boss Level, reusing the current `LevelData` pattern and scene restart flow.

### New Loot Type: `compliance`
- Stat effect: `complianceRisk: -15`
- Asset path: `public/assets/sprites/loot-compliance.png`
- Preload key: `loot-compliance` in `BootScene.preload()`
- Add to `LOOT_STATS` in `GameScene`:

```ts
compliance: { complianceRisk: -15 }
```

### Level 2 — "The Open Plan Office"
- **Width:** 4000px
- **Theme:** bureaucracy, distractions, ranged pressure
- **Difficulty:** moderate-hard — more wraiths/spectres, first grouped spawns
- **Platforms:** denser vertical layering than Level 1
- **Loot:** 5 pickups including the first `compliance` loot
- **Transition:** reaching `exitX` starts Level 3

### Level 3 — "The Architecture Review"
- **Width:** 3600px
- **Theme:** technical death march
- **Difficulty:** hard — troll-heavy, multiple elevated spectres, tighter spacing
- **Platforms:** longer jumps and more punished misses
- **Loot:** 5 pickups mixing all 4 loot types
- **Transition:** reaching `exitX` starts Boss Level

### Level Progression Chain
`Level 1 → Level 2 → Level 3 → Boss Level`

To fit the current scene setup:
- Seed `game.registry.set('levelIndex', 0)` in `createGameConfig()`.
- Change `GameScene.init()` to read `levelIndex` from scene data first, then registry.
- Build `currentLevel` from a local array: `[level1, level2, level3, bossLevel]`.
- Derive `isBossLevel` from the final array index instead of a boolean `bossLevel` flag.
- Update `setupHUD()` so the label reflects `LEVEL 1`, `LEVEL 2`, `LEVEL 3`, or `⚠ BOSS LEVEL`.
- Update `onLevelComplete()` so it increments `levelIndex`, writes it back to the registry, and restarts `GameScene` with `{ levelIndex: nextIndex }`.

### Type Change Required
The current `LootData` type only allows `'budget' | 'morale' | 'debt'`, so `src/game/levels/types.ts` must change. Extract a shared union and extend it:

```ts
export type LootType = 'budget' | 'morale' | 'debt' | 'compliance';
export type LootData = { type: LootType; x: number; y: number };
```

**New files**
- `src/game/levels/level2.ts`
- `src/game/levels/level3.ts`

---

## Affected Files Summary

| File | Change Type |
|---|---|
| `docs/superpowers/plans/2026-06-13-gameplay-improvements.md` | **New** — implementation-ready plan |
| `public/assets/sprites/loot-compliance.png` | **New** — temporary compliance loot sprite |
| `src/constants/classes.ts` | Rename displayed ability names to match active abilities |
| `src/game/abilities.ts` | **New** — typed active-ability executor |
| `src/game/config.ts` | Seed `levelIndex` in registry |
| `src/game/effects.ts` | **New** — `spawnDeathBurst` helper |
| `src/game/entities/Enemy.ts` | Knockback + typed temporary status effects |
| `src/game/entities/Player.ts` | Knockback on damage, invincibility tween, ability cooldown helpers, projectile immunity |
| `src/game/eventKeys.ts` | Add `ABILITY_USED` constant |
| `src/game/levels/level2.ts` | **New** — Level 2 layout |
| `src/game/levels/level3.ts` | **New** — Level 3 layout |
| `src/game/levels/types.ts` | Add `LootType` and extend `LootData` |
| `src/game/PhaserGame.tsx` | Ability cooldown HUD row |
| `src/game/scenes/BootScene.ts` | Preload `loot-compliance` sprite |
| `src/game/scenes/GameScene.ts` | Combat feedback, ability dispatch, projectile immunity, multi-level progression, compliance loot |
| `src/types/game.ts` | Add `AbilityUsedPayload` |

---

## Out of Scope
- Audio
- Sprite/art replacement beyond the temporary compliance loot icon
- High score / replayability loop
- Between-level shop
- New enemy types
