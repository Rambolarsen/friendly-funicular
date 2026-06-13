import { AbilityDefinition, RawStats } from '../types/game';

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
} as const;

const NON_INTERN_CLASS_IDS = [
  'architect',
  'developer',
  'ux',
  'datascientist',
  'pm',
  'security',
  'accountmanager',
] as const;

const RANDOM_STAT_KEYS: Array<keyof RawStats> = [
  'budget',
  'clientHappiness',
  'technicalDebt',
  'teamMorale',
  'deliveryProgress',
  'complianceRisk',
];

type AbilityClassId = keyof typeof ABILITY_DEFINITIONS;

type ChildrenProvider = {
  getChildren(): unknown[];
};

type AbilityScene = {
  time: {
    delayedCall: (delay: number, callback: () => void) => unknown;
  };
  tweens: {
    // Phaser tween signatures are wider than this helper needs.
    // A narrow structural type here keeps the helper usable in tests and in-scene.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    add: Function;
  };
};

type AbilityEnemy = {
  active: boolean;
  x: number;
  y: number;
  applySlow: (until: number) => void;
  applyFreeze: (until: number) => void;
  applyFlee: (until: number) => void;
  applyStun: (until: number) => void;
  takeDamage: (amount: number, attackerX?: number) => boolean;
};

type AbilityProjectile = {
  active: boolean;
  destroy: () => void;
};

type AbilityLoot = {
  active: boolean;
  setTint: (color: number) => unknown;
  clearTint: () => unknown;
};

type AbilityPlayer = {
  classId: string;
  x: number;
  y: number;
  isAbilityReady: (time: number) => boolean;
  startAbilityCooldown: (time: number, cooldownMs: number) => void;
  grantProjectileImmunity: (time: number, durationMs: number) => void;
};

export type AbilityUseResult = {
  name: string;
  cooldownMs: number;
  statDelta?: Partial<RawStats>;
};

export type AbilityCooldownState = {
  progress: number;
  remainingLabel: string;
};

export type AbilityContext = {
  scene: AbilityScene;
  time: number;
  player: AbilityPlayer;
  enemies: ChildrenProvider;
  projectiles: ChildrenProvider;
  loots: ChildrenProvider;
  onEnemyDefeated: (enemy: AbilityEnemy) => void;
  random?: () => number;
};

export function getAbilityDefinition(classId: string): AbilityDefinition {
  return ABILITY_DEFINITIONS[classId as AbilityClassId] ?? ABILITY_DEFINITIONS.developer;
}

export function getAbilityCooldownState(
  cooldown: { activatedAt: number; cooldownMs: number; now: number } | null,
): AbilityCooldownState {
  if (!cooldown) {
    return {
      progress: 1,
      remainingLabel: 'READY',
    };
  }

  const elapsed = Math.max(0, cooldown.now - cooldown.activatedAt);
  const progress = Math.min(1, elapsed / cooldown.cooldownMs);
  const remainingSeconds = Math.max(0, (cooldown.cooldownMs - elapsed) / 1000);

  return {
    progress,
    remainingLabel: progress >= 1 ? 'READY' : `${remainingSeconds.toFixed(1)}s`,
  };
}

export function isAbilityTelegraphVisible(
  activatedAt: number | null,
  now: number,
  visibleDurationMs = 500,
): boolean {
  if (activatedAt === null) {
    return false;
  }

  return now - activatedAt < visibleDurationMs;
}

export function useClassAbility(ctx: AbilityContext): AbilityUseResult | null {
  if (!ctx.player.isAbilityReady(ctx.time)) {
    return null;
  }

  const classId = isAbilityClassId(ctx.player.classId) ? ctx.player.classId : 'developer';
  const result = classId === 'intern'
    ? runInternAbility(ctx)
    : applyAbilityEffect(classId, ctx);

  if (!result) {
    return null;
  }

  ctx.player.startAbilityCooldown(ctx.time, result.cooldownMs);
  return result;
}

function runInternAbility(ctx: AbilityContext): AbilityUseResult {
  const random = ctx.random ?? Math.random;
  const copiedEffect = random() < 0.7;

  if (!copiedEffect) {
    const statKey = RANDOM_STAT_KEYS[Math.floor(random() * RANDOM_STAT_KEYS.length)];
    const statValue = Math.floor(random() * 16) - 10;

    return {
      name: getAbilityDefinition('intern').name,
      cooldownMs: getAbilityDefinition('intern').cooldownMs,
      statDelta: { [statKey]: statValue },
    };
  }

  const copiedClassId = NON_INTERN_CLASS_IDS[Math.floor(random() * NON_INTERN_CLASS_IDS.length)];
  const copiedResult = applyAbilityEffect(copiedClassId, ctx);

  return {
    name: getAbilityDefinition('intern').name,
    cooldownMs: getAbilityDefinition('intern').cooldownMs,
    statDelta: copiedResult?.statDelta,
  };
}

function applyAbilityEffect(classId: AbilityClassId, ctx: AbilityContext): AbilityUseResult | null {
  const activeEnemies = getActiveChildren(ctx.enemies, isAbilityEnemy);
  const activeProjectiles = getActiveChildren(ctx.projectiles, isAbilityProjectile);
  const activeLoots = getActiveChildren(ctx.loots, isAbilityLoot);

  switch (classId) {
    case 'architect': {
      const slowUntil = ctx.time + 5000;
      for (const enemy of activeEnemies) {
        enemy.applySlow(slowUntil);
      }
      return createResult(classId, { technicalDebt: -10 });
    }
    case 'developer': {
      for (const enemy of activeEnemies) {
        if (distanceBetween(ctx.player, enemy) > 180) {
          continue;
        }

        const defeated = enemy.takeDamage(60, ctx.player.x);
        if (defeated) {
          ctx.onEnemyDefeated(enemy);
        }
      }
      return createResult(classId, { deliveryProgress: 5 });
    }
    case 'ux': {
      const freezeUntil = ctx.time + 3000;
      for (const enemy of activeEnemies) {
        enemy.applyFreeze(freezeUntil);
      }
      return createResult(classId, { clientHappiness: 8 });
    }
    case 'datascientist': {
      for (const loot of activeLoots) {
        loot.setTint(0x93c5fd);
        ctx.scene.tweens.add({
          targets: loot,
          alpha: 0.35,
          duration: 250,
          yoyo: true,
          repeat: 5,
          ease: 'Sine.easeInOut',
        });
        ctx.scene.time.delayedCall(3000, () => {
          loot.clearTint();
        });
      }
      return createResult(classId, { deliveryProgress: 8, complianceRisk: 5 });
    }
    case 'pm': {
      const fleeUntil = ctx.time + 4000;
      for (const enemy of activeEnemies) {
        enemy.applyFlee(fleeUntil);
      }
      return createResult(classId, { teamMorale: 8 });
    }
    case 'security': {
      for (const projectile of activeProjectiles) {
        projectile.destroy();
      }
      ctx.player.grantProjectileImmunity(ctx.time, 4000);
      return createResult(classId, { complianceRisk: -10 });
    }
    case 'accountmanager': {
      const nearestEnemy = getNearestEnemy(ctx.player, activeEnemies);
      if (!nearestEnemy) {
        return null;
      }
      nearestEnemy.applyStun(ctx.time + 5000);
      return createResult(classId, { clientHappiness: 5 });
    }
    case 'intern':
      return null;
  }
}

function getNearestEnemy(
  player: Pick<AbilityPlayer, 'x' | 'y'>,
  enemies: AbilityEnemy[],
): AbilityEnemy | null {
  let nearestEnemy: AbilityEnemy | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of enemies) {
    const distance = distanceBetween(player, enemy);
    if (distance >= nearestDistance) {
      continue;
    }
    nearestEnemy = enemy;
    nearestDistance = distance;
  }

  return nearestEnemy;
}

function getActiveChildren<T extends { active: boolean }>(
  group: ChildrenProvider,
  predicate: (child: unknown) => child is T,
): T[] {
  return group.getChildren().filter(predicate).filter((child) => child.active);
}

function distanceBetween(
  a: Pick<AbilityPlayer, 'x' | 'y'>,
  b: Pick<AbilityEnemy, 'x' | 'y'>,
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createResult(classId: Exclude<AbilityClassId, 'intern'>, statDelta?: Partial<RawStats>): AbilityUseResult {
  const definition = getAbilityDefinition(classId);
  return {
    name: definition.name,
    cooldownMs: definition.cooldownMs,
    statDelta,
  };
}

function isAbilityClassId(value: string): value is AbilityClassId {
  return value in ABILITY_DEFINITIONS;
}

function isAbilityEnemy(child: unknown): child is AbilityEnemy {
  return typeof child === 'object'
    && child !== null
    && 'active' in child
    && 'x' in child
    && 'y' in child
    && 'applySlow' in child
    && 'applyFreeze' in child
    && 'applyFlee' in child
    && 'applyStun' in child
    && 'takeDamage' in child;
}

function isAbilityProjectile(child: unknown): child is AbilityProjectile {
  return typeof child === 'object'
    && child !== null
    && 'active' in child
    && 'destroy' in child;
}

function isAbilityLoot(child: unknown): child is AbilityLoot {
  return typeof child === 'object'
    && child !== null
    && 'active' in child
    && 'setTint' in child
    && 'clearTint' in child;
}
