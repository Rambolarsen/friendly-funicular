# Domain-Driven Design Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a Phaser-free `src/domain/` layer (Value Objects, Entities, Domain Events, Rules) for the GamePlay bounded context, and rename the `GameStats` plain-object type to `RawStats` across the codebase.

**Architecture:** Pure TypeScript domain objects live in `src/domain/` with zero Phaser imports. The Phaser layer (`src/game/`) continues to own rendering/physics but delegates stat logic to the domain layer. `src/engine/gameEngine.ts` is deleted after its logic migrates into `src/domain/rules/`.

**Tech Stack:** TypeScript, Vite/React frontend, Phaser 3 game layer. No test suite — verify with `npm run build` after each task.

---

## File Map

**Create:**
- `src/domain/rules/statRules.ts` — `clampStat`, `clampStatChange`, `applyStatChanges`
- `src/domain/rules/progressionRules.ts` — `checkWinLose`
- `src/domain/valueObjects/Health.ts` — immutable HP VO
- `src/domain/valueObjects/GameStats.ts` — immutable stat VO class wrapping `RawStats`
- `src/domain/events/DomainEvent.ts` — base event interface
- `src/domain/events/StatChanged.ts`
- `src/domain/events/EnemyDefeated.ts`
- `src/domain/events/BossDefeated.ts`
- `src/domain/events/GameOver.ts`
- `src/domain/entities/Enemy.ts` — Phaser-free domain Enemy
- `src/domain/entities/Boss.ts` — extends domain Enemy
- `src/domain/entities/Player.ts` — Phaser-free domain Player

**Modify:**
- `src/types/game.ts` — rename `GameStats` → `RawStats`; keep `GameOverPayload.stats` typed as `RawStats`
- `src/constants/classes.ts` — add `CLASS_MODIFIERS` export
- `src/constants/initialState.ts` — update import `GameStats` → `RawStats`
- `src/engine/gameEngine.ts` — update import `GameStats` → `RawStats` (keeping it alive until Task 9)
- `src/game/entities/Player.ts` — update import `GameStats` → `RawStats`
- `src/game/scenes/GameScene.ts` — update import `GameStats` → `RawStats`; use domain `GameStats` class for registry operations
- `src/App.tsx` — update import `GameStats` → `RawStats`
- `src/game/PhaserGame.tsx` — update import `GameStats` → `RawStats`
- `src/screens/EndScreen.tsx` — update import `GameStats` → `RawStats`
- `src/game/eventKeys.ts` — update comment to reference `RawStats`

**Delete:**
- `src/engine/gameEngine.ts` (Task 9)
- `src/engine/` directory (Task 9)

---

## Task 1: Rename `GameStats` type → `RawStats`

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Rename the type and add a deprecated alias**

Replace `src/types/game.ts` entirely:

```ts
export type RawStats = {
  budget: number;
  clientHappiness: number;
  technicalDebt: number;
  teamMorale: number;
  deliveryProgress: number;
  complianceRisk: number;
};

/** @deprecated Use RawStats */
export type GameStats = RawStats;

export type ConsultantClass = {
  id: string;
  name: string;
  emoji: string;
  abilityName: string;
  description: string;
  flavor: string;
};

export type GamePhase = 'start' | 'playing' | 'end';

export type GameOverPayload = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
};
```

> Keeping `GameStats` as a deprecated alias lets the build stay green during migration.

- [ ] **Step 2: Verify build passes**

```
npm run build
```

Expected: Build succeeds (no errors).

- [ ] **Step 3: Commit**

```
git add src/types/game.ts
git commit -m "refactor: rename GameStats type to RawStats, keep deprecated alias"
```

---

## Task 2: Add `CLASS_MODIFIERS` to constants

**Files:**
- Modify: `src/constants/classes.ts`

- [ ] **Step 1: Add the `CLASS_MODIFIERS` map**

Add after the `CONSULTANT_CLASSES` array in `src/constants/classes.ts`:

```ts
import { RawStats } from '../types/game';

// Add at the top, replacing the existing ConsultantClass import line:
import { ConsultantClass, RawStats } from '../types/game';
```

Then at the bottom of the file, before the closing, add:

```ts
/** Passive stat bonuses applied when this class kills an enemy. */
export const CLASS_MODIFIERS: Record<string, Partial<RawStats>> = {
  architect:      { technicalDebt: -4 },
  developer:      { deliveryProgress: 3 },
  ux:             { clientHappiness: 4 },
  datascientist:  { deliveryProgress: 4, complianceRisk: 2 },
  pm:             { teamMorale: 3 },
  security:       { complianceRisk: -5 },
  accountmanager: { clientHappiness: 3 },
  intern:         {},
};
```

Full resulting file:

```ts
import { ConsultantClass, RawStats } from '../types/game';

export const CONSULTANT_CLASSES: ConsultantClass[] = [
  {
    id: 'architect',
    name: 'Architect',
    emoji: '🏛️',
    abilityName: 'Draw Boxes and Arrows',
    description: 'Master of diagrams and abstractions. Reduces technical debt but clients grow impatient.',
    flavor: '"Have you considered a microservices approach?"',
  },
  {
    id: 'developer',
    name: 'Developer',
    emoji: '💻',
    abilityName: 'Ship MVP',
    description: 'Gets things done fast. Delivery progress surges but technical debt may follow.',
    flavor: '"It works on my machine."',
  },
  {
    id: 'ux',
    name: 'UX Designer',
    emoji: '🎨',
    abilityName: 'Talk to Users',
    description: 'Clarifies requirements and boosts client happiness. Enemies hate being understood.',
    flavor: '"But did you test it with actual users?"',
  },
  {
    id: 'datascientist',
    name: 'Data Scientist',
    emoji: '📊',
    abilityName: 'Train Model Anyway',
    description: 'Devastating in AI rooms. Powerful but risky — compliance risk may spike.',
    flavor: '"The model is 94% accurate. On training data."',
  },
  {
    id: 'pm',
    name: 'Project Manager',
    emoji: '📋',
    abilityName: 'Rebaseline Timeline',
    description: 'Restores budget and morale. May frustrate stakeholders with new slide decks.',
    flavor: '"According to my updated Gantt chart…"',
  },
  {
    id: 'security',
    name: 'Security Consultant',
    emoji: '🔒',
    abilityName: 'Threat Model',
    description: 'Slays compliance threats. Slows delivery but keeps the regulators away.',
    flavor: '"That feature is a GDPR violation waiting to happen."',
  },
  {
    id: 'accountmanager',
    name: 'Account Manager',
    emoji: '🤝',
    abilityName: 'Relationship Shield',
    description: 'Prevents client happiness from dropping once per encounter. Smooth talker.',
    flavor: '"I\'ll set up a call."',
  },
  {
    id: 'intern',
    name: 'Intern',
    emoji: '🎲',
    abilityName: 'Wild Vibe Code',
    description: 'Total wildcard. Massive upside or catastrophic disaster. No in-between.',
    flavor: '"I used ChatGPT for the whole backend, is that okay?"',
  },
];

/** Passive stat bonuses applied when this class kills an enemy. */
export const CLASS_MODIFIERS: Record<string, Partial<RawStats>> = {
  architect:      { technicalDebt: -4 },
  developer:      { deliveryProgress: 3 },
  ux:             { clientHappiness: 4 },
  datascientist:  { deliveryProgress: 4, complianceRisk: 2 },
  pm:             { teamMorale: 3 },
  security:       { complianceRisk: -5 },
  accountmanager: { clientHappiness: 3 },
  intern:         {},
};
```

- [ ] **Step 2: Verify build passes**

```
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```
git add src/constants/classes.ts
git commit -m "feat: add CLASS_MODIFIERS export to constants/classes"
```

---

## Task 3: Create domain rules

**Files:**
- Create: `src/domain/rules/statRules.ts`
- Create: `src/domain/rules/progressionRules.ts`

- [ ] **Step 1: Create `src/domain/rules/statRules.ts`**

```ts
import { RawStats } from '../../types/game';

export function clampStat(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function clampStatChange(change: number): number {
  return Math.max(-20, Math.min(20, change));
}

export function applyStatChanges(current: RawStats, changes: Partial<RawStats>): RawStats {
  const next = { ...current };
  for (const key of Object.keys(changes) as (keyof RawStats)[]) {
    const clamped = clampStatChange(changes[key] ?? 0);
    next[key] = clampStat(current[key] + clamped);
  }
  return next;
}
```

- [ ] **Step 2: Create `src/domain/rules/progressionRules.ts`**

```ts
import { RawStats } from '../../types/game';

export function checkWinLose(
  stats: RawStats,
  isBossDefeated: boolean,
): { outcome: 'win' | 'lose' | null; reason: string | null } {
  if (stats.budget <= 0)
    return { outcome: 'lose', reason: 'The project ran out of budget. The CFO has spoken.' };
  if (stats.teamMorale <= 0)
    return { outcome: 'lose', reason: 'The team quit. Every last one of them. Even the intern.' };
  if (stats.technicalDebt >= 100)
    return { outcome: 'lose', reason: 'Technical debt consumed the system. Production is down. It will never come back.' };
  if (stats.complianceRisk >= 100)
    return { outcome: 'lose', reason: 'A regulator arrived. The project — and three careers — are over.' };
  if (isBossDefeated && stats.deliveryProgress >= 70)
    return { outcome: 'win', reason: null };
  return { outcome: null, reason: null };
}
```

- [ ] **Step 3: Verify build passes**

```
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```
git add src/domain/rules/
git commit -m "feat: add domain rules (statRules, progressionRules)"
```

---

## Task 4: Create `Health` value object

**Files:**
- Create: `src/domain/valueObjects/Health.ts`

- [ ] **Step 1: Create the file**

```ts
export class Health {
  readonly current: number;
  readonly max: number;

  private constructor(current: number, max: number) {
    this.current = current;
    this.max = max;
  }

  static of(max: number): Health {
    return new Health(max, max);
  }

  take(damage: number): Health {
    return new Health(Math.max(0, this.current - damage), this.max);
  }

  isDead(): boolean {
    return this.current <= 0;
  }
}
```

- [ ] **Step 2: Verify build passes**

```
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```
git add src/domain/valueObjects/Health.ts
git commit -m "feat: add Health value object"
```

---

## Task 5: Create `GameStats` value object class

**Files:**
- Create: `src/domain/valueObjects/GameStats.ts`

- [ ] **Step 1: Create the file**

```ts
import { RawStats } from '../../types/game';
import { clampStat, clampStatChange } from '../rules/statRules';

const INITIAL: RawStats = {
  budget: 100,
  clientHappiness: 50,
  technicalDebt: 0,
  teamMorale: 70,
  deliveryProgress: 0,
  complianceRisk: 20,
};

export class GameStats {
  readonly budget: number;
  readonly clientHappiness: number;
  readonly technicalDebt: number;
  readonly teamMorale: number;
  readonly deliveryProgress: number;
  readonly complianceRisk: number;

  private constructor(raw: RawStats) {
    this.budget = raw.budget;
    this.clientHappiness = raw.clientHappiness;
    this.technicalDebt = raw.technicalDebt;
    this.teamMorale = raw.teamMorale;
    this.deliveryProgress = raw.deliveryProgress;
    this.complianceRisk = raw.complianceRisk;
  }

  static initial(): GameStats {
    return new GameStats(INITIAL);
  }

  static from(raw: RawStats): GameStats {
    return new GameStats({
      budget: clampStat(raw.budget),
      clientHappiness: clampStat(raw.clientHappiness),
      technicalDebt: clampStat(raw.technicalDebt),
      teamMorale: clampStat(raw.teamMorale),
      deliveryProgress: clampStat(raw.deliveryProgress),
      complianceRisk: clampStat(raw.complianceRisk),
    });
  }

  apply(changes: Partial<RawStats>): GameStats {
    const next: RawStats = {
      budget: clampStat(this.budget + clampStatChange(changes.budget ?? 0)),
      clientHappiness: clampStat(this.clientHappiness + clampStatChange(changes.clientHappiness ?? 0)),
      technicalDebt: clampStat(this.technicalDebt + clampStatChange(changes.technicalDebt ?? 0)),
      teamMorale: clampStat(this.teamMorale + clampStatChange(changes.teamMorale ?? 0)),
      deliveryProgress: clampStat(this.deliveryProgress + clampStatChange(changes.deliveryProgress ?? 0)),
      complianceRisk: clampStat(this.complianceRisk + clampStatChange(changes.complianceRisk ?? 0)),
    };
    return new GameStats(next);
  }

  toPlain(): RawStats {
    return {
      budget: this.budget,
      clientHappiness: this.clientHappiness,
      technicalDebt: this.technicalDebt,
      teamMorale: this.teamMorale,
      deliveryProgress: this.deliveryProgress,
      complianceRisk: this.complianceRisk,
    };
  }
}
```

- [ ] **Step 2: Verify build passes**

```
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```
git add src/domain/valueObjects/GameStats.ts
git commit -m "feat: add GameStats value object class"
```

---

## Task 6: Create domain events

**Files:**
- Create: `src/domain/events/DomainEvent.ts`
- Create: `src/domain/events/StatChanged.ts`
- Create: `src/domain/events/EnemyDefeated.ts`
- Create: `src/domain/events/BossDefeated.ts`
- Create: `src/domain/events/GameOver.ts`

- [ ] **Step 1: Create `DomainEvent.ts`**

```ts
export interface DomainEvent {
  readonly type: string;
}
```

- [ ] **Step 2: Create `StatChanged.ts`**

```ts
import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';

export interface StatChanged extends DomainEvent {
  type: 'StatChanged';
  before: RawStats;
  after: RawStats;
  reason: string;
}
```

- [ ] **Step 3: Create `EnemyDefeated.ts`**

```ts
import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';
import { EnemyType } from '../entities/Enemy';

export interface EnemyDefeated extends DomainEvent {
  type: 'EnemyDefeated';
  enemyType: EnemyType;
  statChanges: Partial<RawStats>;
}
```

- [ ] **Step 4: Create `BossDefeated.ts`**

```ts
import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';

export interface BossDefeated extends DomainEvent {
  type: 'BossDefeated';
  stats: RawStats;
}
```

- [ ] **Step 5: Create `GameOver.ts`**

```ts
import { RawStats } from '../../types/game';
import { DomainEvent } from './DomainEvent';

export interface GameOver extends DomainEvent {
  type: 'GameOver';
  outcome: 'win' | 'lose';
  stats: RawStats;
  reason: string | null;
}
```

> Note: `EnemyDefeated.ts` imports `EnemyType` from `../entities/Enemy` — that file is created in Task 7. Build will fail until Task 7 is complete. That's fine; commit after Task 7 instead.

- [ ] **Step 6: Commit (after Task 7)**

```
git add src/domain/events/
git commit -m "feat: add domain events (StatChanged, EnemyDefeated, BossDefeated, GameOver)"
```

---

## Task 7: Create domain `Enemy` and `Boss` entities

**Files:**
- Create: `src/domain/entities/Enemy.ts`
- Create: `src/domain/entities/Boss.ts`

- [ ] **Step 1: Create `src/domain/entities/Enemy.ts`**

```ts
import { RawStats } from '../../types/game';
import { Health } from '../valueObjects/Health';

export type EnemyType =
  | 'scopeCreepGoblin'
  | 'jiraWraith'
  | 'procurementTroll'
  | 'gdprSpectre';

interface EnemyConfig {
  hp: number;
  statDropOnDefeat: Partial<RawStats>;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  scopeCreepGoblin:  { hp: 30, statDropOnDefeat: { budget: -5, deliveryProgress: 8 } },
  jiraWraith:        { hp: 20, statDropOnDefeat: { teamMorale: -3, deliveryProgress: 6 } },
  procurementTroll:  { hp: 60, statDropOnDefeat: { budget: -10, deliveryProgress: 12 } },
  gdprSpectre:       { hp: 25, statDropOnDefeat: { complianceRisk: -15 } },
};

export class Enemy {
  readonly instanceId: string;
  readonly type: EnemyType;
  readonly health: Health;
  readonly statDropOnDefeat: Partial<RawStats>;

  protected constructor(instanceId: string, type: EnemyType, health: Health, statDropOnDefeat: Partial<RawStats>) {
    this.instanceId = instanceId;
    this.type = type;
    this.health = health;
    this.statDropOnDefeat = statDropOnDefeat;
  }

  static spawn(type: EnemyType): Enemy {
    const cfg = ENEMY_CONFIGS[type];
    return new Enemy(crypto.randomUUID(), type, Health.of(cfg.hp), cfg.statDropOnDefeat);
  }

  takeDamage(amount: number): Enemy {
    return new Enemy(this.instanceId, this.type, this.health.take(amount), this.statDropOnDefeat);
  }

  isAlive(): boolean {
    return !this.health.isDead();
  }
}
```

- [ ] **Step 2: Create `src/domain/entities/Boss.ts`**

```ts
import { RawStats } from '../../types/game';
import { Health } from '../valueObjects/Health';
import { Enemy } from './Enemy';

const BOSS_HP = 300;
const BOSS_CHARGED_ATTACK_DAMAGE = 20;
const BOSS_STAT_DROP: Partial<RawStats> = { deliveryProgress: 20, clientHappiness: 10 };

export class Boss extends Enemy {
  readonly chargedAttackDamage: number;

  private constructor(instanceId: string, health: Health, chargedAttackDamage: number) {
    super(instanceId, 'procurementTroll', health, BOSS_STAT_DROP);
    this.chargedAttackDamage = chargedAttackDamage;
  }

  static spawnBoss(): Boss {
    return new Boss(crypto.randomUUID(), Health.of(BOSS_HP), BOSS_CHARGED_ATTACK_DAMAGE);
  }

  takeDamage(amount: number): Boss {
    return new Boss(this.instanceId, this.health.take(amount), this.chargedAttackDamage);
  }
}
```

- [ ] **Step 3: Verify build passes**

```
npm run build
```

Expected: Build succeeds (domain events from Task 6 now resolve too).

- [ ] **Step 4: Commit**

```
git add src/domain/entities/ src/domain/events/
git commit -m "feat: add domain Enemy, Boss entities and domain events"
```

---

## Task 8: Create domain `Player` entity

**Files:**
- Create: `src/domain/entities/Player.ts`

- [ ] **Step 1: Create `src/domain/entities/Player.ts`**

```ts
import { RawStats, ConsultantClass } from '../../types/game';
import { CLASS_MODIFIERS } from '../../constants/classes';
import { Health } from '../valueObjects/Health';
import { Enemy } from './Enemy';

const PLAYER_MAX_HP = 100;

export class Player {
  readonly classId: string;
  readonly health: Health;
  readonly classModifiers: Partial<RawStats>;

  private constructor(classId: string, health: Health, classModifiers: Partial<RawStats>) {
    this.classId = classId;
    this.health = health;
    this.classModifiers = classModifiers;
  }

  static create(cls: ConsultantClass): Player {
    const modifiers = CLASS_MODIFIERS[cls.id] ?? {};
    return new Player(cls.id, Health.of(PLAYER_MAX_HP), modifiers);
  }

  takeDamage(amount: number): Player {
    return new Player(this.classId, this.health.take(amount), this.classModifiers);
  }

  isAlive(): boolean {
    return !this.health.isDead();
  }

  killBonusFor(enemy: Enemy): Partial<RawStats> {
    if (this.classId === 'intern') {
      return this.randomInternBonus();
    }
    return mergePartialStats(enemy.statDropOnDefeat, this.classModifiers);
  }

  private randomInternBonus(): Partial<RawStats> {
    const keys: (keyof RawStats)[] = [
      'budget', 'clientHappiness', 'technicalDebt', 'teamMorale',
      'deliveryProgress', 'complianceRisk',
    ];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const value = Math.floor(Math.random() * 20) - 8;
    return { [key]: value };
  }
}

function mergePartialStats(a: Partial<RawStats>, b: Partial<RawStats>): Partial<RawStats> {
  const result: Partial<RawStats> = { ...a };
  for (const k of Object.keys(b) as (keyof RawStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}
```

- [ ] **Step 2: Verify build passes**

```
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```
git add src/domain/entities/Player.ts
git commit -m "feat: add domain Player entity"
```

---

## Task 9: Migrate Phaser layer to domain rules; delete old engine

**Files:**
- Modify: `src/constants/initialState.ts`
- Modify: `src/game/entities/Player.ts`
- Modify: `src/game/scenes/GameScene.ts`
- Modify: `src/App.tsx`
- Modify: `src/game/PhaserGame.tsx`
- Modify: `src/screens/EndScreen.tsx`
- Modify: `src/game/eventKeys.ts`
- Delete: `src/engine/gameEngine.ts` + `src/engine/` directory

- [ ] **Step 1: Update `src/constants/initialState.ts`**

```ts
import { RawStats } from '../types/game';

export const INITIAL_STATS: RawStats = {
  budget: 100,
  clientHappiness: 50,
  technicalDebt: 0,
  teamMorale: 70,
  deliveryProgress: 0,
  complianceRisk: 20,
};
```

- [ ] **Step 2: Update `src/game/eventKeys.ts`**

```ts
/** Emitted by scenes when stats change. Payload: RawStats */
export const STATS_CHANGED = 'stats-changed';

/** Emitted by scenes when the game ends. Payload: GameOverPayload */
export const GAME_OVER = 'game-over';
```

- [ ] **Step 3: Update `src/App.tsx`**

Change line 4 from:
```ts
import { ConsultantClass, GamePhase, GameStats } from './types/game';
```
to:
```ts
import { ConsultantClass, GamePhase, RawStats } from './types/game';
```

Change line 8 from:
```ts
  stats: GameStats;
```
to:
```ts
  stats: RawStats;
```

- [ ] **Step 4: Update `src/game/PhaserGame.tsx`**

Change line 4 from:
```ts
import { ConsultantClass, GameOverPayload, GameStats } from '../types/game';
```
to:
```ts
import { ConsultantClass, GameOverPayload, RawStats } from '../types/game';
```

Change line 11:
```ts
  onGameOver: (outcome: 'win' | 'lose', stats: RawStats, reason: string | null) => void;
```

Change line 18:
```ts
  const [stats, setStats] = useState<RawStats>({ ...INITIAL_STATS });
```

Change line 30:
```ts
    const onStatsChanged = (newStats: RawStats) => {
```

- [ ] **Step 5: Update `src/screens/EndScreen.tsx`**

Change line 2 from:
```ts
import { ConsultantClass, GameStats } from '../types/game';
```
to:
```ts
import { ConsultantClass, RawStats } from '../types/game';
```

Change the `stats` prop type from `GameStats` to `RawStats`:
```ts
type Props = {
  outcome: 'win' | 'lose';
  stats: RawStats;
  loseReason: string | null;
  selectedClass: ConsultantClass | null;
  onRestart: () => void;
};
```

- [ ] **Step 6: Update `src/game/entities/Player.ts`**

Replace the two imports at the top (lines 1–3):
```ts
import Phaser from 'phaser';
import { RawStats } from '../../types/game';
import { applyStatChanges, checkWinLose } from '../../domain/rules/statRules';
import { checkWinLose } from '../../domain/rules/progressionRules';
import { EnemyType } from '../levels/types';
```

Correct full import block:
```ts
import Phaser from 'phaser';
import { RawStats } from '../../types/game';
import { applyStatChanges } from '../../domain/rules/statRules';
import { checkWinLose } from '../../domain/rules/progressionRules';
import { EnemyType } from '../levels/types';
```

Replace the `CLASS_KILL_BONUSES` definition and its type annotation:
```ts
const CLASS_KILL_BONUSES: Record<string, Partial<RawStats>> = {
  architect:      { technicalDebt: -4 },
  developer:      { deliveryProgress: 3 },
  ux:             { clientHappiness: 4 },
  datascientist:  { deliveryProgress: 4, complianceRisk: 2 },
  pm:             { teamMorale: 3 },
  security:       { complianceRisk: -5 },
  accountmanager: { clientHappiness: 3 },
  intern:         {},
};
```

Update `takeDamage` signature (line ~133):
```ts
  takeDamage(
    amount: number,
    currentStats: RawStats,
    time: number,
  ): { newStats: RawStats; died: boolean } {
```

Update `getKillBonus` signature (line ~149):
```ts
  getKillBonus(enemyType: EnemyType, classId: string): Partial<RawStats> {
```

Update `BASE` map type inside `getKillBonus`:
```ts
    const BASE: Record<EnemyType, Partial<RawStats>> = {
```

Update `randomInternBonus` return type:
```ts
  private randomInternBonus(): Partial<RawStats> {
    const keys: (keyof RawStats)[] = [
```

Update `mergePartialStats` function at bottom of file:
```ts
function mergePartialStats(a: Partial<RawStats>, b: Partial<RawStats>): Partial<RawStats> {
  const result = { ...a };
  for (const k of Object.keys(b) as (keyof RawStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}
```

- [ ] **Step 7: Update `src/game/scenes/GameScene.ts`**

Replace imports at top of file:
```ts
import Phaser from 'phaser';
import { RawStats } from '../../types/game';
import { GameStats as GameStatsVO } from '../../domain/valueObjects/GameStats';
import { applyStatChanges } from '../../domain/rules/statRules';
import { checkWinLose } from '../../domain/rules/progressionRules';
import { GAME_OVER, STATS_CHANGED } from '../eventKeys';
import { Player } from '../entities/Player';
import { Enemy, SpectreEnemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { EnemyType, LevelData } from '../levels/types';
import { level1 } from '../levels/level1';
import { bossLevel } from '../levels/bossLevel';
```

Replace `LOOT_STATS` type annotation:
```ts
const LOOT_STATS: Record<string, Partial<RawStats>> = {
```

Replace the `stats` field declaration:
```ts
  private stats!: RawStats;
```

Update `create()` method — reading from registry using `GameStatsVO`:
```ts
  create() {
    this.stats = GameStatsVO.from(this.registry.get('stats') as RawStats).toPlain();
    this.classId = this.registry.get('selectedClass')?.id ?? 'developer';
    // ... rest unchanged
```

Update `emitStats()`:
```ts
  private emitStats() {
    this.registry.set('stats', { ...this.stats });
    this.game.events.emit(STATS_CHANGED, { ...this.stats });
  }
```

Update `mergePartials` at bottom:
```ts
function mergePartials(a: Partial<RawStats>, b: Partial<RawStats>): Partial<RawStats> {
  const result = { ...a };
  for (const k of Object.keys(b) as (keyof RawStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}
```

- [ ] **Step 8: Delete `src/engine/gameEngine.ts` and the engine folder**

```
Remove-Item -Recurse -Force src\engine
```

- [ ] **Step 9: Verify build passes**

```
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 10: Remove deprecated `GameStats` alias from `src/types/game.ts`**

Edit `src/types/game.ts` — remove the deprecated alias lines:
```ts
/** @deprecated Use RawStats */
export type GameStats = RawStats;
```

- [ ] **Step 11: Verify build still passes**

```
npm run build
```

Expected: Build succeeds. (If any file still uses `GameStats`, the build will fail with a clear error — fix each import.)

- [ ] **Step 12: Commit**

```
git add -A
git commit -m "refactor: migrate Phaser layer to domain rules, remove engine/, drop GameStats alias"
```

---

## Task 10: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the Architecture section**

Add `src/domain/` to the architecture tree and note the engine removal:

```
src/
  domain/                   # Phaser-free domain layer (DDD)
    valueObjects/           # GameStats (VO class), Health
    entities/               # Player, Enemy, Boss (pure TS, no Phaser)
    events/                 # DomainEvent, StatChanged, EnemyDefeated, BossDefeated, GameOver
    rules/                  # statRules, progressionRules
```

Update the type locations note:
> **Type locations:** Shared plain-object types (`RawStats`, `ConsultantClass`, `GamePhase`, `GameOverPayload`) live in `src/types/game.ts`. The `GameStats` VO class lives in `src/domain/valueObjects/GameStats.ts`. `src/engine/` has been removed.

- [ ] **Step 2: Commit**

```
git add AGENTS.md
git commit -m "docs: update AGENTS.md for DDD domain layer"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by task |
|---|---|
| `src/domain/valueObjects/GameStats.ts` — immutable VO with `static initial()`, `static from()`, `apply()`, `toPlain()` | Task 5 ✅ |
| `src/domain/valueObjects/Health.ts` — `static of()`, `take()`, `isDead()` | Task 4 ✅ |
| `src/domain/entities/Player.ts` — `static create()`, `takeDamage()`, `isAlive()`, `killBonusFor()` | Task 8 ✅ |
| `src/domain/entities/Enemy.ts` — `EnemyType` union, `static spawn()`, `takeDamage()`, `isAlive()` | Task 7 ✅ |
| `src/domain/entities/Boss.ts` — extends Enemy, `chargedAttackDamage`, `static spawnBoss()` | Task 7 ✅ |
| Domain events: `DomainEvent`, `StatChanged`, `EnemyDefeated`, `BossDefeated`, `GameOver` | Task 6 ✅ |
| `src/domain/rules/statRules.ts` — `clampStat`, `clampStatChange`, `applyStatChanges` | Task 3 ✅ |
| `src/domain/rules/progressionRules.ts` — `checkWinLose` | Task 3 ✅ |
| `RawStats` replaces `GameStats` plain type in `src/types/game.ts` | Tasks 1 + 9 ✅ |
| `CLASS_MODIFIERS` in `src/constants/classes.ts` | Task 2 ✅ |
| `src/engine/gameEngine.ts` deleted | Task 9 ✅ |
| Phaser layer uses `RawStats` for registry read/write | Task 9 ✅ |
| `GameStats.from()` used in `GameScene.create()` | Task 9 ✅ |
| `src/domain/` has zero Phaser imports | All domain tasks ✅ |
| `AGENTS.md` updated | Task 10 ✅ |

### Placeholder scan
No TBD/TODO patterns found. All code blocks are complete.

### Type consistency
- `RawStats` used consistently across all tasks (defined in Task 1, used in Tasks 2–10)
- `GameStats` VO class (Task 5) uses `clampStat`/`clampStatChange` from Task 3 ✅
- Domain `Enemy.EnemyType` union (Task 7) imported by `EnemyDefeated` event (Task 6) — note Task 6 must commit after Task 7 ✅
- `CLASS_MODIFIERS` (Task 2) imported by domain `Player` (Task 8) ✅
