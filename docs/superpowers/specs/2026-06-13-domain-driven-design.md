# Design: Domain-Driven Design Layer (GamePlay Bounded Context)

**Date:** 2026-06-13  
**Status:** Approved

---

## Summary

Introduce a lightweight DDD domain layer (`src/domain/`) that models the GamePlay bounded context using plain TypeScript — Entities, Value Objects, Domain Events, and Rules. The Phaser rendering layer reads and writes domain types via `game.registry` but imports nothing from Phaser inside `src/domain/`. The existing `src/engine/gameEngine.ts` is deleted; its logic migrates into `src/domain/rules/`.

---

## Folder Structure

```
src/
  domain/                         ← New; 100% Phaser-free
    valueObjects/
      GameStats.ts                ← Immutable VO; clamp/apply logic lives here
      Health.ts                   ← Immutable VO for HP (current, max)
    entities/
      Player.ts                   ← Entity: classId identity, Health VO, class modifiers
      Enemy.ts                    ← Entity: type, Health VO, stat-drop payload on defeat
      Boss.ts                     ← Extends Enemy; higher HP, charged attack data
    events/
      DomainEvent.ts              ← Base interface { type: string }
      StatChanged.ts              ← before/after RawStats + reason
      EnemyDefeated.ts            ← enemyType + statChanges applied
      BossDefeated.ts             ← stats at time of defeat
      GameOver.ts                 ← outcome, stats, reason

    rules/
      statRules.ts                ← clampStat, clampStatChange, applyStatChanges
      progressionRules.ts         ← checkWinLose

  engine/                         ← REMOVED (merged into domain/rules/)
  types/game.ts                   ← Keeps ConsultantClass, GamePhase, GameOverPayload.
                                     GameStats renamed to RawStats (plain object type).
```

---

## Bounded Context

**GamePlay** — one bounded context covering the entire game session: combat, stats, progression, win/lose. No sub-contexts.

---

## Value Objects

### `GameStats`

Immutable class wrapping the 6 stats. The authoritative home for clamping and applying stat changes.

```ts
export class GameStats {
  readonly budget: number;
  readonly clientHappiness: number;
  readonly technicalDebt: number;
  readonly teamMorale: number;
  readonly deliveryProgress: number;
  readonly complianceRisk: number;

  private constructor(raw: RawStats) { /* assign all fields */ }

  static initial(): GameStats               // returns INITIAL_STATS values
  static from(raw: RawStats): GameStats     // validates + clamps all values to [0,100]

  apply(changes: Partial<RawStats>): GameStats  // clamps deltas to ±20, clamps result to [0,100]; returns new instance
  toPlain(): RawStats                           // plain object — for Phaser registry and serialisation
}
```

`RawStats` replaces the `GameStats` type currently in `src/types/game.ts` as the plain 6-field object type.

### `Health`

Immutable HP tracking for entities.

```ts
export class Health {
  readonly current: number;
  readonly max: number;

  static of(max: number): Health        // creates at full health
  take(damage: number): Health          // returns new Health, floored at 0
  isDead(): boolean                     // current <= 0
}
```

---

## Entities

### `Player`

Identity: `classId`. Carries a `Health` VO and the class-specific stat modifier.

```ts
export class Player {
  readonly classId: string;
  readonly health: Health;
  readonly classModifiers: Partial<RawStats>;  // bonus deltas applied on enemy kill

  static create(cls: ConsultantClass): Player
  takeDamage(amount: number): Player            // returns new Player (immutable)
  isAlive(): boolean
  killBonusFor(enemy: Enemy): Partial<RawStats> // merges classModifiers with enemy.statDropOnDefeat
}
```

Class modifiers (e.g. architect reduces technicalDebt on kill, developer boosts deliveryProgress) are defined in `src/constants/classes.ts` as an exported `CLASS_MODIFIERS` map of type `Record<string, Partial<RawStats>>`, keyed by `classId`. `Player.create` looks up the modifier from that map. If no modifier is found for a classId, an empty object `{}` is used (no bonus).

### `Enemy`

Identity: `instanceId` (UUID generated at spawn). Type determines HP and stat drops.

```ts
export type EnemyType =
  | 'scopeCreepGoblin'
  | 'jiraWraith'
  | 'procurementTroll'
  | 'gdprSpectre';

export class Enemy {
  readonly instanceId: string;
  readonly type: EnemyType;
  readonly health: Health;
  readonly statDropOnDefeat: Partial<RawStats>;  // e.g. deliveryProgress +8, budget −5

  static spawn(type: EnemyType): Enemy
  takeDamage(amount: number): Enemy
  isAlive(): boolean
}
```

Stat drops per enemy type (from PLAN.md):

| Enemy | Drops |
|-------|-------|
| scopeCreepGoblin | budget −5, deliveryProgress +8 |
| jiraWraith | teamMorale −3, deliveryProgress +6 |
| procurementTroll | budget −10, deliveryProgress +12 |
| gdprSpectre | complianceRisk −15 |

### `Boss`

Extends `Enemy` with higher HP and a `chargedAttackDamage` property.

```ts
export class Boss extends Enemy {
  readonly chargedAttackDamage: number;
  static spawnBoss(): Boss
}
```

---

## Domain Events

Plain typed interfaces — no class hierarchy required.

```ts
// DomainEvent.ts
export interface DomainEvent { readonly type: string; }

// StatChanged.ts
export interface StatChanged extends DomainEvent {
  type: 'StatChanged';
  before: RawStats;
  after: RawStats;
  reason: string;
}

// EnemyDefeated.ts
export interface EnemyDefeated extends DomainEvent {
  type: 'EnemyDefeated';
  enemyType: EnemyType;
  statChanges: Partial<RawStats>;
}

// BossDefeated.ts
export interface BossDefeated extends DomainEvent {
  type: 'BossDefeated';
  stats: RawStats;
}

// GameOver.ts
export interface GameOver extends DomainEvent {
  type: 'GameOver';
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
}
```

Domain events map 1:1 to the Phaser event key constants in `src/game/eventKeys.ts`. Scenes emit these payloads on `game.events` using those keys. No Phaser types leak into `src/domain/`.

---

## Rules

### `statRules.ts`

Migrated from `src/engine/gameEngine.ts`:

- `clampStat(value: number): number` — clamps to [0, 100]
- `clampStatChange(change: number): number` — clamps to [−20, +20]
- `applyStatChanges(current: RawStats, changes: Partial<RawStats>): RawStats`

`GameStats.apply()` delegates to these functions.

### `progressionRules.ts`

Migrated from `src/engine/gameEngine.ts`:

- `checkWinLose(stats: RawStats, isBossDefeated: boolean): { outcome: 'win' | 'lose' | null; reason: string | null }`

Win/lose thresholds are unchanged (budget ≤ 0, teamMorale ≤ 0, technicalDebt ≥ 100, complianceRisk ≥ 100; win = boss defeated + deliveryProgress ≥ 70).

---

## Migration: `src/types/game.ts`

- `GameStats` → renamed to `RawStats` (plain 6-field object type; re-exported as `RawStats`)
- `ConsultantClass`, `GamePhase`, `GameOverPayload` — unchanged
- `src/engine/gameEngine.ts` and `src/engine/` folder — deleted after rules are migrated

All existing imports of `GameStats` (in `App.tsx`, `PhaserGame.tsx`, `config.ts`, `initialState.ts`, `screens/`) are updated to import `RawStats` from `src/types/game.ts` or `GameStats` class from `src/domain/valueObjects/GameStats.ts` as appropriate.

---

## Phaser Registry Contract

Scenes read and write stats as plain objects (`RawStats`) via `game.registry`:

```ts
// Reading + applying changes inside a scene:
const current = GameStats.from(this.registry.get('stats') as RawStats);
const next = current.apply(statChanges);
this.registry.set('stats', next.toPlain());

// Emitting domain event:
const event: StatChanged = { type: 'StatChanged', before: current.toPlain(), after: next.toPlain(), reason };
this.game.events.emit(STATS_CHANGED, event);
```

The domain layer (`src/domain/`) never imports from Phaser. Scenes import from `src/domain/` to create and update entities.

---

## Constraints

- `src/domain/` must contain zero Phaser imports.
- Domain events are plain interfaces, not classes; no event bus library is introduced.
- `RawStats` (plain object) is the serialisation format; `GameStats` (class) is used for operations.
- Class modifiers continue to live in `src/constants/classes.ts`; `Player.create` reads from that map.
- No changes to `StartScreen`, `EndScreen`, or `StatBar` — they are unaffected by this layer.
