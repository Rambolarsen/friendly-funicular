# Ability Telegraph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each class ability easy to find during play and clearly communicate its range or target coverage before the player uses it.

**Architecture:** Keep one shared ability definition source in `src/game/abilities.ts` so the React HUD and Phaser telegraph layer read the same cooldown, label, and targeting metadata. Let `PhaserGame.tsx` own the bottom-center cooldown card while `GameScene.ts` owns world-space telegraphs that follow the player and reflect live enemies, projectiles, and loot.

**Tech Stack:** React 19, TypeScript, Phaser 3, Vite, ESLint

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/types/game.ts` | Define shared ability metadata shapes for HUD and runtime events |
| Modify | `src/game/abilities.ts` | Centralize cooldown, label, description, range label, and telegraph kind per class |
| Modify | `src/game/PhaserGame.tsx` | Replace the tiny side cooldown row with a persistent bottom-center action card |
| Modify | `src/game/scenes/GameScene.ts` | Add telegraph objects, update them per frame, and clean them up safely |

---

### Task 1: Promote ability UI metadata to a shared contract

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/game/abilities.ts`

- [ ] **Step 1: Add shared UI/runtime types**

In `src/types/game.ts`, append:

```ts
export type AbilityTelegraphKind =
  | 'radius'
  | 'nearest-enemy'
  | 'all-enemies'
  | 'all-loot'
  | 'all-projectiles'
  | 'wildcard';

export type AbilityDefinition = {
  id: string;
  name: string;
  cooldownMs: number;
  description: string;
  rangeLabel: string;
  telegraphKind: AbilityTelegraphKind;
  radiusPx?: number;
};

export type AbilityUsedPayload = {
  name: string;
  cooldownMs: number;
};
```

- [ ] **Step 2: Replace duplicated ability constants with one shared definition map**

In `src/game/abilities.ts`, import `AbilityDefinition` and build:

```ts
export const ABILITY_DEFINITIONS = {
  architect: {
    id: 'architect',
    name: 'Draft Architecture',
    cooldownMs: 15_000,
    description: 'Slows every active enemy for 5s.',
    rangeLabel: 'Range: all active enemies',
    telegraphKind: 'all-enemies',
  },
  developer: {
    id: 'developer',
    name: 'Ship Hotfix',
    cooldownMs: 10_000,
    description: 'Burst nearby enemies for 60 damage.',
    rangeLabel: 'Range: 180px radius',
    telegraphKind: 'radius',
    radiusPx: 180,
  },
  ux: {
    id: 'ux',
    name: 'User Research',
    cooldownMs: 20_000,
    description: 'Freezes every active enemy for 3s.',
    rangeLabel: 'Range: all active enemies',
    telegraphKind: 'all-enemies',
  },
  datascientist: {
    id: 'datascientist',
    name: 'Run the Model',
    cooldownMs: 12_000,
    description: 'Empowers every active loot drop for 3s.',
    rangeLabel: 'Targets: all loot drops',
    telegraphKind: 'all-loot',
  },
  pm: {
    id: 'pm',
    name: 'Call a Meeting',
    cooldownMs: 18_000,
    description: 'Turns every active enemy around for 4s.',
    rangeLabel: 'Range: all active enemies',
    telegraphKind: 'all-enemies',
  },
  security: {
    id: 'security',
    name: 'Deploy Firewall',
    cooldownMs: 15_000,
    description: 'Clears projectiles and grants 4s projectile immunity.',
    rangeLabel: 'Targets: all projectiles',
    telegraphKind: 'all-projectiles',
  },
  accountmanager: {
    id: 'accountmanager',
    name: 'Escalate',
    cooldownMs: 12_000,
    description: 'Stuns the nearest enemy for 5s.',
    rangeLabel: 'Target: nearest enemy',
    telegraphKind: 'nearest-enemy',
  },
  intern: {
    id: 'intern',
    name: 'Wildcard',
    cooldownMs: 8_000,
    description: 'Usually copies another class effect.',
    rangeLabel: 'Range: copied ability',
    telegraphKind: 'wildcard',
  },
} satisfies Record<string, AbilityDefinition>;
```

- [ ] **Step 3: Export a safe lookup helper and reuse it in the executor**

Still in `src/game/abilities.ts`, add:

```ts
export function getAbilityDefinition(classId: string): AbilityDefinition {
  return ABILITY_DEFINITIONS[classId] ?? ABILITY_DEFINITIONS.developer;
}
```

Then replace the old cooldown/name constants inside `useClassAbility()` and `createResult()` so gameplay numbers come from `getAbilityDefinition(classId)`.

- [ ] **Step 4: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0 with the new type contract wired through.

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/game/abilities.ts
git commit -m "feat: add shared ability metadata"
```

---

### Task 2: Replace the side cooldown row with a bottom-center action HUD

**Files:**
- Modify: `src/game/PhaserGame.tsx`

- [ ] **Step 1: Import the shared ability lookup**

Add:

```ts
import { getAbilityDefinition } from './abilities';
```

- [ ] **Step 2: Seed the cooldown state from the selected class**

Near the existing state declarations in `src/game/PhaserGame.tsx`, add:

```ts
const abilityDefinition = useMemo(
  () => getAbilityDefinition(selectedClass.id),
  [selectedClass.id],
);
```

Then change the derived UI logic to use the shared definition even before the first `ABILITY_USED` event:

```ts
const abilityUi = useMemo(() => {
  if (!abilityCooldown) {
    return {
      progress: 1,
      remainingLabel: 'READY',
    };
  }

  const elapsed = Math.max(0, cooldownNow - abilityCooldown.activatedAt);
  const progress = Math.min(1, elapsed / abilityCooldown.cooldownMs);
  const remainingSeconds = Math.max(0, (abilityCooldown.cooldownMs - elapsed) / 1000);

  return {
    progress,
    remainingLabel: progress >= 1 ? 'READY' : `${remainingSeconds.toFixed(1)}s`,
  };
}, [abilityCooldown, cooldownNow]);
```

- [ ] **Step 3: Remove the cooldown row from the side stat stack and add the primary action card**

Replace the JSX below the stat panel with:

```tsx
<div className="pointer-events-none absolute bottom-4 left-1/2 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2">
  <div className="rounded-2xl border border-cyan-400/40 bg-slate-950/85 px-4 py-3 shadow-[0_0_30px_rgba(34,211,238,0.15)] backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 text-lg font-black text-cyan-100">
        Q
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-black uppercase tracking-[0.24em] text-cyan-100">
            {selectedClass.emoji} {abilityDefinition.name}
          </p>
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
            {abilityUi.remainingLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-200">
          {abilityDefinition.description}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
          {abilityDefinition.rangeLabel}
        </p>
      </div>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-cyan-400 transition-[width] duration-100"
        style={{ width: `${abilityUi.progress * 100}%` }}
      />
    </div>
  </div>
</div>
```

- [ ] **Step 4: Keep `ABILITY_USED` as the source of activation time**

Leave the existing event listener pattern in place, but reset it with:

```ts
const onAbilityUsed = ({ name, cooldownMs }: AbilityUsedPayload) => {
  const activatedAt = Date.now();
  setAbilityCooldown({ name, cooldownMs, activatedAt });
  setCooldownNow(activatedAt);
};
```

This preserves the real cooldown start time while the static metadata drives the visible card content.

- [ ] **Step 5: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: the React HUD compiles with the new persistent card and no unused state.

- [ ] **Step 6: Commit**

```bash
git add src/game/PhaserGame.tsx
git commit -m "feat: add primary ability hud"
```

---

### Task 3: Add in-world telegraphs for range and target coverage

**Files:**
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 1: Import the shared ability lookup**

At the top of `src/game/scenes/GameScene.ts`, change the abilities import to:

```ts
import { getAbilityDefinition, useClassAbility as executeClassAbility } from '../abilities';
```

- [ ] **Step 2: Add telegraph object fields**

Inside `GameScene`, add:

```ts
private abilityRangeRing: Phaser.GameObjects.Arc | null = null;
private abilityLinkLine: Phaser.GameObjects.Graphics | null = null;
private abilityTargetReticle: Phaser.GameObjects.Arc | null = null;
private abilityAura: Phaser.GameObjects.Rectangle | null = null;
```

- [ ] **Step 3: Create the telegraph layer during scene setup**

At the end of `create()`, before `emitStats()`, call:

```ts
this.setupAbilityTelegraph();
```

Add the helper:

```ts
private setupAbilityTelegraph() {
  this.abilityRangeRing = this.add.circle(0, 0, 10, 0x22d3ee, 0.08)
    .setStrokeStyle(2, 0x67e8f9, 0.5)
    .setDepth(3);
  this.abilityLinkLine = this.add.graphics().setDepth(7);
  this.abilityTargetReticle = this.add.circle(0, 0, 18, 0x000000, 0)
    .setStrokeStyle(2, 0xfbbf24, 0.8)
    .setDepth(8)
    .setVisible(false);
  this.abilityAura = this.add.rectangle(0, 0, 0, 0, 0x22d3ee, 0.05)
    .setScrollFactor(0)
    .setDepth(90)
    .setVisible(false);
}
```

- [ ] **Step 4: Update the telegraph every frame**

Inside `update(time: number)`, immediately after `this.player.update(time);`, call:

```ts
this.updateAbilityTelegraph();
```

Add:

```ts
private updateAbilityTelegraph() {
  const definition = getAbilityDefinition(this.classId);
  const enemies = this.enemies.getChildren().filter((child): child is Enemy => child instanceof Enemy && child.active);
  const projectiles = this.projectiles.getChildren().filter((child) => child.active);
  const loots = this.loots.getChildren().filter((child) => child.active);

  this.abilityRangeRing?.setVisible(false);
  this.abilityTargetReticle?.setVisible(false);
  this.abilityAura?.setVisible(false);
  this.abilityLinkLine?.clear();

  if (definition.telegraphKind === 'radius' && this.abilityRangeRing && definition.radiusPx) {
    this.abilityRangeRing
      .setPosition(this.player.x, this.player.y)
      .setRadius(definition.radiusPx)
      .setVisible(true);
    return;
  }

  if (definition.telegraphKind === 'nearest-enemy' && this.abilityLinkLine && this.abilityTargetReticle) {
    const nearestEnemy = enemies.reduce<Enemy | null>((nearest, enemy) => {
      if (!nearest) return enemy;
      const nextDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const currentDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, nearest.x, nearest.y);
      return nextDistance < currentDistance ? enemy : nearest;
    }, null);

    if (!nearestEnemy) {
      return;
    }

    this.abilityLinkLine.lineStyle(2, 0xfbbf24, 0.8);
    this.abilityLinkLine.beginPath();
    this.abilityLinkLine.moveTo(this.player.x, this.player.y - 8);
    this.abilityLinkLine.lineTo(nearestEnemy.x, nearestEnemy.y);
    this.abilityLinkLine.strokePath();
    this.abilityTargetReticle.setPosition(nearestEnemy.x, nearestEnemy.y).setVisible(true);
    return;
  }

  if (definition.telegraphKind === 'all-projectiles' && this.abilityAura) {
    this.abilityAura
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setSize(this.scale.width - 24, this.scale.height - 24)
      .setFillStyle(0x60a5fa, projectiles.length > 0 ? 0.06 : 0.03)
      .setVisible(true);
    return;
  }

  if ((definition.telegraphKind === 'all-enemies' && enemies.length > 0) || (definition.telegraphKind === 'all-loot' && loots.length > 0) || definition.telegraphKind === 'wildcard') {
    const color = definition.telegraphKind === 'all-loot'
      ? 0x93c5fd
      : definition.telegraphKind === 'wildcard'
        ? 0xa855f7
        : 0x22d3ee;

    this.abilityAura
      ?.setPosition(this.scale.width / 2, this.scale.height / 2)
      .setSize(this.scale.width - 24, this.scale.height - 24)
      .setFillStyle(color, 0.04)
      .setVisible(true);
  }
}
```

- [ ] **Step 5: Destroy telegraph objects on shutdown**

In the scene lifecycle cleanup path, add:

```ts
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.abilityRangeRing?.destroy();
  this.abilityLinkLine?.destroy();
  this.abilityTargetReticle?.destroy();
  this.abilityAura?.destroy();
  this.abilityRangeRing = null;
  this.abilityLinkLine = null;
  this.abilityTargetReticle = null;
  this.abilityAura = null;
});
```

- [ ] **Step 6: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: the scene compiles with the new telegraph objects and no Phaser type errors.

- [ ] **Step 7: Commit**

```bash
git add src/game/scenes/GameScene.ts
git commit -m "feat: add ability telegraphs"
```

---

### Task 4: Final manual pass

**Files:**
- Modify: `src/game/PhaserGame.tsx`
- Modify: `src/game/scenes/GameScene.ts`
- Modify: `src/game/abilities.ts`
- Modify: `src/types/game.ts`

- [ ] **Step 1: Run the full validation commands**

```bash
npm run build && npm run lint
```

Expected: both commands exit 0 after the full feature lands.

- [ ] **Step 2: Do a targeted playthrough check**

Run:

```bash
npm run dev
```

Check:
- the right-side panel no longer contains the cooldown widget
- the bottom-center card is visible before the first ability use
- `developer` shows a visible radius ring
- `accountmanager` points to the nearest enemy
- room-wide classes show a subtle viewport aura
- cooldown text changes from `READY` to seconds and back

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts src/game/abilities.ts src/game/PhaserGame.tsx src/game/scenes/GameScene.ts docs/superpowers/specs/2026-06-13-ability-telegraph-design.md docs/superpowers/plans/2026-06-13-ability-telegraph-plan.md
git commit -m "feat: improve ability cooldown and telegraphs"
```
