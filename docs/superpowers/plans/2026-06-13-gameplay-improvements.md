# Gameplay Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stronger combat feedback, active class abilities with cooldown UI, and two intermediate levels without breaking the existing React + Phaser game loop.

**Architecture:** Keep scene ownership where it already exists: `GameScene` continues to own combat resolution, active groups, stat emission, and level progression; `Player` remains focused on movement/combat state; `Enemy` owns patrol/status behavior. New cross-cutting logic lives in focused helper modules (`abilities.ts`, `effects.ts`) so `GameScene` gains orchestration without absorbing every implementation detail.

**Tech Stack:** React 19, TypeScript, Phaser 3, Vite, ESLint

> **Validation note:** This repository has no automated test runner. Use `npm run build`, `npm run lint`, and targeted manual playthrough checks at each milestone.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `public/assets/sprites/loot-compliance.png` | Temporary sprite for the new compliance loot |
| Modify | `src/constants/classes.ts` | Align displayed ability names with active ability behavior |
| Modify | `src/types/game.ts` | Add shared `AbilityUsedPayload` type |
| Modify | `src/game/eventKeys.ts` | Add `ABILITY_USED` event key |
| Modify | `src/game/levels/types.ts` | Extend loot typing with `compliance` |
| Modify | `src/game/config.ts` | Seed `levelIndex` in registry |
| Modify | `src/game/scenes/BootScene.ts` | Preload `loot-compliance` |
| Create | `src/game/effects.ts` | Death-burst helper |
| Create | `src/game/abilities.ts` | Centralized active-ability execution |
| Modify | `src/game/entities/Player.ts` | Player knockback, iframe tween, cooldown/projectile-immunity helpers |
| Modify | `src/game/entities/Enemy.ts` | Enemy knockback and temporary status effect state |
| Modify | `src/game/scenes/GameScene.ts` | Combat feel, ability dispatch, new loot, multi-level progression |
| Modify | `src/game/PhaserGame.tsx` | Cooldown HUD row |
| Create | `src/game/levels/level2.ts` | Level 2 content |
| Create | `src/game/levels/level3.ts` | Level 3 content |

---

## Task 1: Scaffold shared contracts, asset loading, and level registry state

**Files:**
- Create: `public/assets/sprites/loot-compliance.png`
- Modify: `src/constants/classes.ts`
- Modify: `src/types/game.ts`
- Modify: `src/game/eventKeys.ts`
- Modify: `src/game/levels/types.ts`
- Modify: `src/game/config.ts`
- Modify: `src/game/scenes/BootScene.ts`

- [ ] **Step 1: Create a temporary compliance loot sprite by copying the debt icon**

```bash
cp public/assets/sprites/loot-debt.png public/assets/sprites/loot-compliance.png
```

Expected: `public/assets/sprites/loot-compliance.png` exists immediately and can be replaced with custom art later without changing code.

- [ ] **Step 2: Align the visible class ability names with the new active-ability design**

Update the `abilityName` fields in `src/constants/classes.ts`:

```ts
abilityName: 'Draft Architecture'
abilityName: 'Ship Hotfix'
abilityName: 'User Research'
abilityName: 'Run the Model'
abilityName: 'Call a Meeting'
abilityName: 'Deploy Firewall'
abilityName: 'Escalate'
abilityName: 'Wildcard'
```

This keeps `ClassCard`, `StartScreen`, and `EndScreen` in sync with the actual ability behavior.

- [ ] **Step 3: Add the shared ability event payload type**

In `src/types/game.ts`, append:

```ts
export type AbilityUsedPayload = {
  name: string;
  cooldownMs: number;
};
```

- [ ] **Step 4: Add the new event key**

In `src/game/eventKeys.ts`, add:

```ts
/** Emitted by scenes when an active ability is used. Payload: AbilityUsedPayload */
export const ABILITY_USED = 'ability-used';
```

- [ ] **Step 5: Extend loot typing to include compliance**

Replace the inline loot type in `src/game/levels/types.ts` with:

```ts
export type LootType = 'budget' | 'morale' | 'debt' | 'compliance';
export type LootData = { type: LootType; x: number; y: number };
```

- [ ] **Step 6: Seed `levelIndex` in the Phaser registry**

In `src/game/config.ts`, update the `preBoot` callback:

```ts
callbacks: {
  preBoot: (game: Phaser.Game) => {
    game.registry.set('selectedClass', selectedClass);
    game.registry.set('stats', { ...INITIAL_STATS });
    game.registry.set('levelIndex', 0);
  },
},
```

- [ ] **Step 7: Preload the compliance loot image**

In `src/game/scenes/BootScene.ts`, add:

```ts
this.load.image('loot-compliance', 'assets/sprites/loot-compliance.png');
```

Place it with the other loot `load.image(...)` calls in `preload()`.

- [ ] **Step 8: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add public/assets/sprites/loot-compliance.png src/constants/classes.ts src/types/game.ts src/game/eventKeys.ts src/game/levels/types.ts src/game/config.ts src/game/scenes/BootScene.ts
git commit -m "feat: scaffold gameplay improvement contracts"
```

---

## Task 2: Add combat feedback primitives

**Files:**
- Create: `src/game/effects.ts`
- Modify: `src/game/entities/Enemy.ts`
- Modify: `src/game/entities/Player.ts`
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Create the death-burst helper**

Create `src/game/effects.ts`:

```ts
import Phaser from 'phaser';

export function spawnDeathBurst(scene: Phaser.Scene, x: number, y: number, color: number) {
  const count = Phaser.Math.Between(6, 8);

  for (let i = 0; i < count; i += 1) {
    const particle = scene.add.rectangle(x, y, 8, 8, color).setDepth(18);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(40, 80);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}
```

- [ ] **Step 2: Extend enemy damage to support knockback and a stronger hit reaction**

In `src/game/entities/Enemy.ts`, replace `takeDamage()` with:

```ts
takeDamage(amount: number, attackerX?: number): boolean {
  this.hp = Math.max(0, this.hp - amount);
  this.updateHpBar();

  const body = this.body as Phaser.Physics.Arcade.Body;
  if (typeof attackerX === 'number') {
    const direction = this.x >= attackerX ? 1 : -1;
    body.setVelocityX(direction * 300);
    this.scene.time.delayedCall(120, () => {
      if (this.active) {
        body.setVelocityX(0);
      }
    });
  }

  this.setTint(0xff4444);
  this.setScale(1.15);
  this.scene.tweens.add({
    targets: this,
    scaleX: 1,
    scaleY: 1,
    duration: 80,
    ease: 'Quad.easeOut',
  });
  this.scene.time.delayedCall(100, () => {
    if (!this.active) return;
    if (this.baseTint) this.setTint(this.baseTint);
    else this.clearTint();
  });

  return this.hp <= 0;
}
```

- [ ] **Step 3: Upgrade player damage feedback and attack-box punch**

In `src/game/entities/Player.ts`, add:

```ts
private invincibilityTween: Phaser.Tweens.Tween | null = null;
```

Replace the attack-box creation block with:

```ts
this.attackBox = this.scene.add.rectangle(boxX, boxY, ATTACK_RANGE, ATTACK_HEIGHT, 0xffffff, 0.35);
this.attackBox.setDepth(20);
this.attackBox.setScale(1);
this.scene.tweens.add({
  targets: this.attackBox,
  scaleX: 1.3,
  scaleY: 1.3,
  duration: 60,
  yoyo: true,
  ease: 'Quad.easeOut',
});
this.scene.time.delayedCall(150, () => {
  this.attackBox?.destroy();
  this.attackBox = null;
});
```

Then replace `takeDamage()` with:

```ts
takeDamage(
  amount: number,
  currentStats: RawStats,
  time: number,
  sourceX?: number,
): { newStats: RawStats; died: boolean } {
  if (time < this.invincibleUntil) return { newStats: currentStats, died: false };
  this.invincibleUntil = time + INVINCIBILITY_DURATION;

  const body = this.body as Phaser.Physics.Arcade.Body;
  if (typeof sourceX === 'number') {
    const direction = this.x >= sourceX ? 1 : -1;
    body.setVelocity(direction * 250, -80);
  }

  this.invincibilityTween?.stop();
  this.setAlpha(1);
  this.invincibilityTween = this.scene.tweens.add({
    targets: this,
    alpha: 0.3,
    duration: 100,
    yoyo: true,
    repeat: -1,
  });
  this.scene.time.delayedCall(INVINCIBILITY_DURATION, () => {
    if (this.scene.time.now < this.invincibleUntil) return;
    this.invincibilityTween?.stop();
    this.invincibilityTween = null;
    this.setAlpha(1);
  });

  this.hp = Math.max(0, this.hp - amount);
  const newStats = applyStatChanges(currentStats, { teamMorale: -5, budget: -3 });
  const { outcome } = checkWinLose(newStats, false);
  return { newStats, died: this.hp <= 0 || outcome === 'lose' };
}
```

- [ ] **Step 4: Trigger camera shake and death bursts from `GameScene`**

In `src/game/scenes/GameScene.ts`:

```ts
import { spawnDeathBurst } from '../effects';
import { ENEMY_CONFIGS } from '../entities/Enemy';
```

Update the melee hit logic:

```ts
if (this.player.isAttackHitting(bounds)) {
  this.cameras.main.shake(80, 0.003);
  const died = enemy.takeDamage(PLAYER_ATTACK_DAMAGE, this.player.x);
  if (died) this.onEnemyDied(enemy);
}
```

Update enemy-contact damage:

```ts
const { newStats, died } = this.player.takeDamage(enemy.contactDamage, this.stats, time, enemy.x);
this.cameras.main.shake(250, 0.008);
```

Update projectile damage:

```ts
const { newStats, died } = this.player.takeDamage(8, this.stats, time, (proj as Phaser.GameObjects.Rectangle).x);
this.cameras.main.shake(250, 0.008);
```

Update `onEnemyDied()`:

```ts
const color = ENEMY_CONFIGS[enemy.enemyType]?.tint ?? 0xffffff;
this.cameras.main.shake(150, 0.005);
spawnDeathBurst(this, enemy.x, enemy.y, color);
enemy.die();
```

- [ ] **Step 5: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 6: Manual combat smoke test**

```bash
npm run dev
```

Check in the browser:
1. Hitting an enemy briefly shakes the camera and punches the attack box.
2. Enemy hits apply horizontal knockback and a scale pulse.
3. Getting hit by contact or projectile damage starts player blink tweening instead of a flat 50% alpha.
4. Enemy kills spawn a visible burst and stronger shake.

- [ ] **Step 7: Commit**

```bash
git add src/game/effects.ts src/game/entities/Enemy.ts src/game/entities/Player.ts src/game/scenes/GameScene.ts
git commit -m "feat: improve combat feedback"
```

---

## Task 3: Add typed enemy status effects and centralize active ability execution

**Files:**
- Create: `src/game/abilities.ts`
- Modify: `src/game/entities/Enemy.ts`
- Modify: `src/game/entities/Player.ts`

- [ ] **Step 1: Add typed temporary effect state to `Enemy`**

In `src/game/entities/Enemy.ts`, add fields:

```ts
private slowUntil = 0;
private freezeUntil = 0;
private fleeUntil = 0;
private stunUntil = 0;
private stunTintActive = false;
```

Add methods:

```ts
applySlow(until: number) {
  this.slowUntil = Math.max(this.slowUntil, until);
}

applyFreeze(until: number) {
  this.freezeUntil = Math.max(this.freezeUntil, until);
}

applyFlee(until: number) {
  this.fleeUntil = Math.max(this.fleeUntil, until);
}

applyStun(until: number) {
  this.stunUntil = Math.max(this.stunUntil, until);
  this.setTint(0xfacc15);
  this.stunTintActive = true;
}

private clearExpiredEffects(time: number) {
  if (time >= this.stunUntil && this.stunTintActive) {
    this.stunTintActive = false;
    if (this.baseTint) this.setTint(this.baseTint);
    else this.clearTint();
  }
}
```

Then update `preUpdate()`:

```ts
preUpdate(time: number, delta: number) {
  super.preUpdate(time, delta);
  this.clearExpiredEffects(time);

  const body = this.body as Phaser.Physics.Arcade.Body;
  if (time < this.freezeUntil || time < this.stunUntil) {
    body.setVelocityX(0);
    this.updateHpBar();
    return;
  }

  const speedMultiplier = time < this.slowUntil ? 0.5 : 1;
  if (time < this.fleeUntil) {
    const fleeDirection = this.x >= this.patrolCenter ? 1 : -1;
    body.setVelocityX(fleeDirection * this.speed * speedMultiplier);
    this.setFlipX(fleeDirection === -1);
  } else {
    this.patrol();
    body.setVelocityX(body.velocity.x * speedMultiplier);
  }
  this.updateHpBar();
}
```

- [ ] **Step 2: Add player cooldown and projectile-immunity helpers**

In `src/game/entities/Player.ts`, add:

```ts
private abilityCooldownUntil = 0;
private projectileImmunityUntil = 0;

isAbilityReady(time: number) {
  return time >= this.abilityCooldownUntil;
}

startAbilityCooldown(time: number, cooldownMs: number) {
  this.abilityCooldownUntil = time + cooldownMs;
}

grantProjectileImmunity(time: number, durationMs: number) {
  this.projectileImmunityUntil = time + durationMs;
}

isProjectileImmune(time: number) {
  return time < this.projectileImmunityUntil;
}
```

- [ ] **Step 3: Create `src/game/abilities.ts`**

```ts
import Phaser from 'phaser';
import { RawStats } from '../types/game';
import { Player } from './entities/Player';
import { Enemy } from './entities/Enemy';

type AbilityUseResult = {
  name: string;
  cooldownMs: number;
  statDelta?: Partial<RawStats>;
};

type AbilityContext = {
  scene: Phaser.Scene;
  time: number;
  classId: string;
  player: Player;
  enemies: Phaser.GameObjects.Group;
  projectiles: Phaser.GameObjects.Group;
  loots: Phaser.GameObjects.Group;
  onEnemyDied: (enemy: Enemy) => void;
};

const BAD_INTERN_KEYS: (keyof RawStats)[] = [
  'budget',
  'clientHappiness',
  'technicalDebt',
  'teamMorale',
  'deliveryProgress',
  'complianceRisk',
];

export function useClassAbility(ctx: AbilityContext): AbilityUseResult | null {
  const { classId, time, player } = ctx;
  const cooldownMs = getCooldownMs(classId);
  if (!player.isAbilityReady(time)) return null;

  player.startAbilityCooldown(time, cooldownMs);

  switch (classId) {
    case 'architect':
      return useArchitect(ctx, cooldownMs);
    case 'developer':
      return useDeveloper(ctx, cooldownMs);
    case 'ux':
      return useUx(ctx, cooldownMs);
    case 'datascientist':
      return useDataScientist(ctx, cooldownMs);
    case 'pm':
      return usePm(ctx, cooldownMs);
    case 'security':
      return useSecurity(ctx, cooldownMs);
    case 'accountmanager':
      return useAccountManager(ctx, cooldownMs);
    case 'intern':
      return useIntern(ctx, cooldownMs);
    default:
      return null;
  }
}

function getCooldownMs(classId: string) {
  switch (classId) {
    case 'architect': return 15000;
    case 'developer': return 10000;
    case 'ux': return 20000;
    case 'datascientist': return 12000;
    case 'pm': return 18000;
    case 'security': return 15000;
    case 'accountmanager': return 12000;
    case 'intern': return 8000;
    default: return 0;
  }
}

function eachEnemy(group: Phaser.GameObjects.Group, cb: (enemy: Enemy) => void) {
  for (const child of group.getChildren()) {
    if (child instanceof Enemy && child.active) cb(child);
  }
}

function useArchitect({ enemies, time }: AbilityContext, cooldownMs: number): AbilityUseResult {
  eachEnemy(enemies, (enemy) => enemy.applySlow(time + 5000));
  return {
    name: 'Draft Architecture',
    statDelta: { technicalDebt: -10 },
    cooldownMs,
  };
}

function useDeveloper(
  { enemies, player: actor, onEnemyDied }: AbilityContext,
  cooldownMs: number,
): AbilityUseResult {
  eachEnemy(enemies, (enemy) => {
    if (Phaser.Math.Distance.Between(actor.x, actor.y, enemy.x, enemy.y) <= 180) {
      const died = enemy.takeDamage(60, actor.x);
      if (died) onEnemyDied(enemy);
    }
  });
  return {
    name: 'Ship Hotfix',
    statDelta: { deliveryProgress: 5 },
    cooldownMs,
  };
}

function useUx({ enemies, time }: AbilityContext, cooldownMs: number): AbilityUseResult {
  eachEnemy(enemies, (enemy) => enemy.applyFreeze(time + 3000));
  return {
    name: 'User Research',
    statDelta: { clientHappiness: 8 },
    cooldownMs,
  };
}

function useDataScientist(
  { loots, scene }: AbilityContext,
  cooldownMs: number,
): AbilityUseResult {
  for (const child of loots.getChildren()) {
    const loot = child as Phaser.GameObjects.Image;
    if (!loot.active) continue;
    scene.tweens.add({
      targets: loot,
      tint: { from: 0xffffff, to: 0xffff00 },
      yoyo: true,
      repeat: 14,
      duration: 200,
      onComplete: () => loot.clearTint(),
    });
  }
  return {
    name: 'Run the Model',
    statDelta: { deliveryProgress: 8, complianceRisk: 5 },
    cooldownMs,
  };
}

function usePm({ enemies, time }: AbilityContext, cooldownMs: number): AbilityUseResult {
  eachEnemy(enemies, (enemy) => enemy.applyFlee(time + 4000));
  return {
    name: 'Call a Meeting',
    statDelta: { teamMorale: 8 },
    cooldownMs,
  };
}

function useSecurity(
  { projectiles, player, time }: AbilityContext,
  cooldownMs: number,
): AbilityUseResult {
  for (const child of projectiles.getChildren()) {
    (child as Phaser.GameObjects.GameObject).destroy();
  }
  projectiles.clear(false, false);
  player.grantProjectileImmunity(time, 4000);
  return {
    name: 'Deploy Firewall',
    statDelta: { complianceRisk: -10 },
    cooldownMs,
  };
}

function useAccountManager(
  { enemies, player: actor, time }: AbilityContext,
  cooldownMs: number,
): AbilityUseResult {
  let closest: Enemy | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  eachEnemy(enemies, (enemy) => {
    const distance = Phaser.Math.Distance.Between(actor.x, actor.y, enemy.x, enemy.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = enemy;
    }
  });
  closest?.applyStun(time + 5000);
  return {
    name: 'Escalate',
    statDelta: { clientHappiness: 5 },
    cooldownMs,
  };
}

function useIntern(ctx: AbilityContext, cooldownMs: number): AbilityUseResult {
  if (Math.random() < 0.7) {
    const classes = ['architect', 'developer', 'ux', 'datascientist', 'pm', 'security', 'accountmanager'] as const;
    const picked = classes[Math.floor(Math.random() * classes.length)];
    const copied = applyCopiedInternEffect(ctx, picked);
    return {
      name: 'Wildcard',
      cooldownMs,
      statDelta: copied,
    };
  }

  const key = BAD_INTERN_KEYS[Math.floor(Math.random() * BAD_INTERN_KEYS.length)];
  const value = Phaser.Math.Between(-10, 5);
  return {
    name: 'Wildcard',
    statDelta: { [key]: value },
    cooldownMs,
  };
}

function applyCopiedInternEffect(
  ctx: AbilityContext,
  picked: 'architect' | 'developer' | 'ux' | 'datascientist' | 'pm' | 'security' | 'accountmanager',
): Partial<RawStats> {
  switch (picked) {
    case 'architect':
      eachEnemy(ctx.enemies, (enemy) => enemy.applySlow(ctx.time + 5000));
      return { technicalDebt: -10 };
    case 'developer':
      eachEnemy(ctx.enemies, (enemy) => {
        if (Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, enemy.x, enemy.y) <= 180) {
          const died = enemy.takeDamage(60, ctx.player.x);
          if (died) ctx.onEnemyDied(enemy);
        }
      });
      return { deliveryProgress: 5 };
    case 'ux':
      eachEnemy(ctx.enemies, (enemy) => enemy.applyFreeze(ctx.time + 3000));
      return { clientHappiness: 8 };
    case 'datascientist':
      for (const child of ctx.loots.getChildren()) {
        const loot = child as Phaser.GameObjects.Image;
        if (!loot.active) continue;
        ctx.scene.tweens.add({
          targets: loot,
          tint: { from: 0xffffff, to: 0xffff00 },
          yoyo: true,
          repeat: 14,
          duration: 200,
          onComplete: () => loot.clearTint(),
        });
      }
      return { deliveryProgress: 8, complianceRisk: 5 };
    case 'pm':
      eachEnemy(ctx.enemies, (enemy) => enemy.applyFlee(ctx.time + 4000));
      return { teamMorale: 8 };
    case 'security':
      for (const child of ctx.projectiles.getChildren()) {
        (child as Phaser.GameObjects.GameObject).destroy();
      }
      ctx.projectiles.clear(false, false);
      ctx.player.grantProjectileImmunity(ctx.time, 4000);
      return { complianceRisk: -10 };
    case 'accountmanager':
      let closest: Enemy | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      eachEnemy(ctx.enemies, (enemy) => {
        const distance = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, enemy.x, enemy.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          closest = enemy;
        }
      });
      closest?.applyStun(ctx.time + 5000);
      return { clientHappiness: 5 };
  }
}
```

- [ ] **Step 4: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/game/abilities.ts src/game/entities/Enemy.ts src/game/entities/Player.ts
git commit -m "feat: add class ability engine"
```

---

## Task 4: Wire abilities into `GameScene` and render cooldown state in the React HUD

**Files:**
- Modify: `src/game/scenes/GameScene.ts`
- Modify: `src/game/PhaserGame.tsx`

- [ ] **Step 1: Add the `Q` key and call the ability helper**

In `src/game/scenes/GameScene.ts`, add fields:

```ts
private qKey!: Phaser.Input.Keyboard.Key;
```

In `create()`:

```ts
this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
```

Add the import:

```ts
import { ABILITY_USED, GAME_OVER, STATS_CHANGED } from '../eventKeys';
import { useClassAbility } from '../abilities';
```

In `update(time: number)` add before the exit-trigger block:

```ts
if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
  const result = useClassAbility({
    scene: this,
    time,
    classId: this.classId,
    player: this.player,
    enemies: this.enemies,
    projectiles: this.projectiles,
    loots: this.loots,
    onEnemyDied: (enemy) => this.onEnemyDied(enemy),
  });

  if (result?.statDelta) {
    this.stats = applyStatChanges(this.stats, result.statDelta);
    this.emitStats();
    this.checkWinLose();
  }

  if (result) {
    this.game.events.emit(ABILITY_USED, {
      name: result.name,
      cooldownMs: result.cooldownMs,
    });
  }
}
```

- [ ] **Step 2: Respect projectile immunity**

Still in `GameScene.ts`, update the projectile overlap:

```ts
if (this.player.isProjectileImmune(time)) {
  (proj as Phaser.GameObjects.GameObject).destroy();
  return;
}
```

Add it before calling `takeDamage(...)`.

- [ ] **Step 3: Track ability cooldown state in `PhaserGame.tsx`**

At the top of `src/game/PhaserGame.tsx`, add:

```ts
import { AbilityUsedPayload } from '../types/game';
import { ABILITY_USED, GAME_OVER, STATS_CHANGED } from './eventKeys';

type AbilityHudState = {
  name: string;
  activatedAt: number;
  cooldownMs: number;
  progressPct: number;
  ready: boolean;
};
```

Add state:

```ts
const [abilityHud, setAbilityHud] = useState<AbilityHudState | null>(null);
```

Register the event:

```ts
const onAbilityUsed = ({ name, cooldownMs }: AbilityUsedPayload) => {
  setAbilityHud({
    name,
    activatedAt: Date.now(),
    cooldownMs,
    progressPct: 0,
    ready: false,
  });
};

game.events.on(ABILITY_USED, onAbilityUsed);
```

And in cleanup:

```ts
game.events.off(ABILITY_USED, onAbilityUsed);
```

- [ ] **Step 4: Add the cooldown interval and HUD row**

In `PhaserGame.tsx`, add:

```ts
useEffect(() => {
  if (!abilityHud || abilityHud.ready) return;

  const timer = window.setInterval(() => {
    setAbilityHud((current) => {
      if (!current) return current;
      const progressPct = Math.min(100, ((Date.now() - current.activatedAt) / current.cooldownMs) * 100);
      const ready = progressPct >= 100;
      return { ...current, progressPct, ready };
    });
  }, 100);

  return () => window.clearInterval(timer);
}, [abilityHud]);
```

Then add this JSX under the existing `StatBar` list:

```tsx
{abilityHud && (
  <div className="mt-3">
    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-purple-200">
      <span>{abilityHud.name}</span>
      <span>{abilityHud.ready ? 'Ready' : 'Cooling'}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-gray-800">
      <div
        className="h-full bg-purple-500 transition-[width] duration-100"
        style={{
          width: `${abilityHud.progressPct}%`,
        }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 5: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 6: Manual ability smoke test**

```bash
npm run dev
```

Check in the browser:
1. Pressing `Q` triggers exactly one ability use per cooldown.
2. The HUD row appears, shows the correct ability name, and fills over time.
3. Security destroys projectiles and ignores projectile hits during the immunity window.
4. Intern always either copies a real class ability or applies one bad stat roll.

- [ ] **Step 7: Commit**

```bash
git add src/game/scenes/GameScene.ts src/game/PhaserGame.tsx
git commit -m "feat: wire class abilities into gameplay"
```

---

## Task 5: Refactor `GameScene` to support four-level progression

**Files:**
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Replace the boolean boss-level init path with `levelIndex`**

In `src/game/scenes/GameScene.ts`, replace:

```ts
private isBossLevel = false;
private currentLevel!: LevelData;

init(data?: { bossLevel?: boolean }) {
  this.isBossLevel = data?.bossLevel ?? false;
  this.bossDefeated = false;
  this.levelComplete = false;
}
```

With:

```ts
private isBossLevel = false;
private levelIndex = 0;
private currentLevel!: LevelData;

init(data?: { levelIndex?: number }) {
  this.levelIndex = data?.levelIndex ?? (this.registry.get('levelIndex') as number) ?? 0;
  this.bossDefeated = false;
  this.levelComplete = false;
}
```

- [ ] **Step 2: Select the current level from an ordered array**

Add imports:

```ts
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
```

Then in `create()`:

```ts
const levels = [level1, level2, level3, bossLevel];
this.currentLevel = levels[this.levelIndex] ?? level1;
this.isBossLevel = this.levelIndex === levels.length - 1;
```

- [ ] **Step 3: Update HUD labels and loot stats**

Extend `LOOT_STATS`:

```ts
compliance: { complianceRisk: -15 },
```

Replace the HUD label text with:

```ts
const levelLabels = ['LEVEL 1', 'LEVEL 2', 'LEVEL 3', '⚠ BOSS LEVEL'];
this.add.text(12, 10, levelLabels[this.levelIndex] ?? 'LEVEL 1', {
  fontSize: '13px',
  color: '#e5e7eb',
  backgroundColor: '#00000066',
  padding: { x: 6, y: 3 },
}).setScrollFactor(0).setDepth(100);
```

- [ ] **Step 4: Increment `levelIndex` on exit instead of jumping straight to boss**

Replace `onLevelComplete()` with:

```ts
private onLevelComplete() {
  if (this.levelComplete) return;
  this.levelComplete = true;

  this.stats = applyStatChanges(this.stats, { deliveryProgress: 10 });
  this.emitStats();
  this.registry.set('stats', this.stats);

  const nextLevelIndex = this.levelIndex + 1;
  this.registry.set('levelIndex', nextLevelIndex);

  this.time.delayedCall(400, () => {
    this.scene.start('GameScene', { levelIndex: nextLevelIndex });
  });
}
```

- [ ] **Step 5: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/GameScene.ts
git commit -m "feat: refactor scene for multi-level progression"
```

---

## Task 6: Author Level 2 and Level 3 content

**Files:**
- Create: `src/game/levels/level2.ts`
- Create: `src/game/levels/level3.ts`

- [ ] **Step 1: Create `src/game/levels/level2.ts`**

```ts
import { EnemyType, LevelData } from './types';

export const level2: LevelData = {
  width: 4000,
  height: 540,
  playerStart: { x: 80, y: 420 },
  exitX: 3900,
  platforms: [
    { x: 0, y: 490, w: 520, h: 20 },
    { x: 600, y: 490, w: 420, h: 20 },
    { x: 1080, y: 490, w: 520, h: 20 },
    { x: 1660, y: 490, w: 460, h: 20 },
    { x: 2200, y: 490, w: 520, h: 20 },
    { x: 2800, y: 490, w: 520, h: 20 },
    { x: 3380, y: 490, w: 620, h: 20 },
    { x: 320, y: 380, w: 160, h: 16 },
    { x: 560, y: 310, w: 140, h: 16 },
    { x: 860, y: 350, w: 140, h: 16 },
    { x: 1180, y: 280, w: 180, h: 16 },
    { x: 1500, y: 360, w: 140, h: 16 },
    { x: 1880, y: 300, w: 160, h: 16 },
    { x: 2320, y: 250, w: 180, h: 16 },
    { x: 2680, y: 340, w: 160, h: 16 },
    { x: 3080, y: 280, w: 180, h: 16 },
    { x: 3460, y: 220, w: 200, h: 16 },
  ],
  enemies: [
    { type: EnemyType.Wraith, x: 260, y: 440 },
    { type: EnemyType.Goblin, x: 680, y: 440 },
    { type: EnemyType.Spectre, x: 920, y: 440 },
    { type: EnemyType.Wraith, x: 1320, y: 440 },
    { type: EnemyType.Wraith, x: 1460, y: 440 },
    { type: EnemyType.Troll, x: 1840, y: 440 },
    { type: EnemyType.Spectre, x: 2100, y: 440 },
    { type: EnemyType.Goblin, x: 2420, y: 440 },
    { type: EnemyType.Spectre, x: 2840, y: 440 },
    { type: EnemyType.Wraith, x: 3180, y: 440 },
    { type: EnemyType.Troll, x: 3520, y: 440 },
    { type: EnemyType.Spectre, x: 3720, y: 180 },
  ],
  loots: [
    { type: 'budget', x: 340, y: 350 },
    { type: 'compliance', x: 1240, y: 250 },
    { type: 'morale', x: 1940, y: 270 },
    { type: 'debt', x: 2740, y: 310 },
    { type: 'budget', x: 3500, y: 190 },
  ],
};
```

- [ ] **Step 2: Create `src/game/levels/level3.ts`**

```ts
import { EnemyType, LevelData } from './types';

export const level3: LevelData = {
  width: 3600,
  height: 540,
  playerStart: { x: 80, y: 420 },
  exitX: 3500,
  platforms: [
    { x: 0, y: 490, w: 460, h: 20 },
    { x: 560, y: 490, w: 340, h: 20 },
    { x: 980, y: 490, w: 420, h: 20 },
    { x: 1500, y: 490, w: 320, h: 20 },
    { x: 1940, y: 490, w: 340, h: 20 },
    { x: 2380, y: 490, w: 320, h: 20 },
    { x: 2820, y: 490, w: 780, h: 20 },
    { x: 260, y: 360, w: 140, h: 16 },
    { x: 700, y: 280, w: 120, h: 16 },
    { x: 1120, y: 330, w: 140, h: 16 },
    { x: 1660, y: 250, w: 140, h: 16 },
    { x: 2140, y: 300, w: 120, h: 16 },
    { x: 2560, y: 220, w: 140, h: 16 },
    { x: 3080, y: 170, w: 160, h: 16 },
  ],
  enemies: [
    { type: EnemyType.Troll, x: 240, y: 440 },
    { type: EnemyType.Wraith, x: 620, y: 440 },
    { type: EnemyType.Spectre, x: 820, y: 250 },
    { type: EnemyType.Troll, x: 1180, y: 440 },
    { type: EnemyType.Wraith, x: 1560, y: 440 },
    { type: EnemyType.Troll, x: 1880, y: 440 },
    { type: EnemyType.Spectre, x: 2200, y: 270 },
    { type: EnemyType.Troll, x: 2500, y: 440 },
    { type: EnemyType.Wraith, x: 2860, y: 440 },
    { type: EnemyType.Spectre, x: 3160, y: 140 },
    { type: EnemyType.Troll, x: 3340, y: 440 },
  ],
  loots: [
    { type: 'debt', x: 280, y: 330 },
    { type: 'compliance', x: 720, y: 250 },
    { type: 'morale', x: 1700, y: 220 },
    { type: 'budget', x: 2580, y: 190 },
    { type: 'compliance', x: 3120, y: 140 },
  ],
};
```

- [ ] **Step 3: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 4: Manual progression smoke test**

```bash
npm run dev
```

Check in the browser:
1. Level labels advance from Level 1 → Level 2 → Level 3 → Boss Level.
2. Crossing each exit preserves stats and adds the `deliveryProgress +10` reward once.
3. `loot-compliance` loads correctly and reduces compliance risk.
4. Boss level still starts and ends exactly as before once reached.

- [ ] **Step 5: Commit**

```bash
git add src/game/levels/level2.ts src/game/levels/level3.ts
git commit -m "feat: add level 2 and level 3 content"
```

---

## Task 7: Final integration pass and regression sweep

**Files:**
- Modify: `src/game/scenes/GameScene.ts` (only if tuning fixes are needed)
- Modify: `src/game/entities/Enemy.ts` (only if tuning fixes are needed)
- Modify: `src/game/entities/Player.ts` (only if tuning fixes are needed)

- [ ] **Step 1: Run the full validation commands**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 2: Perform two targeted manual runs**

```bash
npm run dev
```

Run A:
1. Start as **Developer**
2. Verify `Ship Hotfix` damages nearby enemies and advances delivery
3. Reach at least Level 2 and confirm combat effects still feel stable

Run B:
1. Start as **Security**
2. Wait for spectre projectiles, trigger `Deploy Firewall`, and confirm projectile destruction plus temporary immunity
3. Continue until at least one `loot-compliance` pickup appears

- [ ] **Step 3: Fix only confirmed tuning regressions**

If one of the smoke checks reveals an issue, patch the smallest relevant constant or conditional. Typical examples:

```ts
const CHARGE_INTERVAL = 5000;
const ATTACK_COOLDOWN = 400;
enemy.applySlow(time + 5000);
```

Do not add new systems in this step; only correct verified regressions.

- [ ] **Step 4: Commit the integration pass**

```bash
git add src/game/scenes/GameScene.ts src/game/entities/Enemy.ts src/game/entities/Player.ts
git commit -m "chore: finalize gameplay improvements"
```

---

## Self-Review Notes

- **Spec coverage:** combat feedback, abilities, cooldown HUD, compliance loot, registry-backed level progression, and two new level files each have explicit implementation tasks.
- **Placeholder scan:** no TODO/TBD markers remain; the only deferred work is the known future art replacement for `loot-compliance.png`, which is intentionally handled with a concrete temporary asset copy in Task 1.
- **Type consistency:** `AbilityUsedPayload`, `LootType`, `ABILITY_USED`, `levelIndex`, and the new helper names are used consistently across tasks.
