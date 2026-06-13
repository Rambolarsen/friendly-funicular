import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAbilityCooldownState,
  getAbilityDefinition,
  isAbilityTelegraphVisible,
  useClassAbility,
} from '../../src/game/abilities';

type FakePlayer = {
  classId: string;
  x: number;
  y: number;
  cooldowns: Array<{ time: number; cooldownMs: number }>;
  immunities: Array<{ time: number; durationMs: number }>;
  isAbilityReady: (time: number) => boolean;
  startAbilityCooldown: (time: number, cooldownMs: number) => void;
  grantProjectileImmunity: (time: number, durationMs: number) => void;
};

type FakeEnemy = {
  active: boolean;
  x: number;
  y: number;
  hp: number;
  damage: Array<{ amount: number; attackerX: number | undefined }>;
  slowUntil: number | null;
  freezeUntil: number | null;
  fleeUntil: number | null;
  stunUntil: number | null;
  applySlow: (until: number) => void;
  applyFreeze: (until: number) => void;
  applyFlee: (until: number) => void;
  applyStun: (until: number) => void;
  takeDamage: (amount: number, attackerX?: number) => boolean;
};

type FakeProjectile = {
  active: boolean;
  destroyed: boolean;
  destroy: () => void;
};

function createPlayer(classId: string): FakePlayer {
  return {
    classId,
    x: 100,
    y: 200,
    cooldowns: [],
    immunities: [],
    isAbilityReady: () => true,
    startAbilityCooldown(time, cooldownMs) {
      this.cooldowns.push({ time, cooldownMs });
    },
    grantProjectileImmunity(time, durationMs) {
      this.immunities.push({ time, durationMs });
    },
  };
}

function createEnemy(x: number, hp = 100): FakeEnemy {
  return {
    active: true,
    x,
    y: 200,
    hp,
    damage: [],
    slowUntil: null,
    freezeUntil: null,
    fleeUntil: null,
    stunUntil: null,
    applySlow(until) {
      this.slowUntil = until;
    },
    applyFreeze(until) {
      this.freezeUntil = until;
    },
    applyFlee(until) {
      this.fleeUntil = until;
    },
    applyStun(until) {
      this.stunUntil = until;
    },
    takeDamage(amount, attackerX) {
      this.damage.push({ amount, attackerX });
      this.hp = Math.max(0, this.hp - amount);
      return this.hp <= 0;
    },
  };
}

function createProjectile(): FakeProjectile {
  return {
    active: true,
    destroyed: false,
    destroy() {
      this.destroyed = true;
      this.active = false;
    },
  };
}

function createSceneDouble() {
  const delayedCalls: Array<{ delay: number; callback: () => void }> = [];
  const tweens: unknown[] = [];

  return {
    delayedCalls,
    tweens,
    scene: {
      time: {
        delayedCall(delay: number, callback: () => void) {
          delayedCalls.push({ delay, callback });
          return { remove() {} };
        },
      },
      tweens: {
        add(config: unknown) {
          tweens.push(config);
          return config;
        },
      },
    },
  };
}

test('developer ability damages only nearby enemies and starts cooldown', () => {
  const player = createPlayer('developer');
  const nearEnemy = createEnemy(220, 55);
  const farEnemy = createEnemy(360, 100);
  const defeated: FakeEnemy[] = [];
  const { scene } = createSceneDouble();

  const result = useClassAbility({
    scene,
    time: 1500,
    player,
    enemies: { getChildren: () => [nearEnemy, farEnemy] },
    projectiles: { getChildren: () => [] },
    loots: { getChildren: () => [] },
    onEnemyDefeated: (enemy) => {
      defeated.push(enemy as FakeEnemy);
    },
  });

  assert.deepEqual(result, {
    name: 'Ship Hotfix',
    cooldownMs: 10_000,
    statDelta: { deliveryProgress: 5 },
  });
  assert.deepEqual(nearEnemy.damage, [{ amount: 60, attackerX: 100 }]);
  assert.deepEqual(farEnemy.damage, []);
  assert.equal(defeated.length, 1);
  assert.deepEqual(player.cooldowns, [{ time: 1500, cooldownMs: 10_000 }]);
});

test('architect ability slows every active enemy for five seconds', () => {
  const player = createPlayer('architect');
  const enemyA = createEnemy(140);
  const enemyB = createEnemy(260);
  const { scene } = createSceneDouble();

  const result = useClassAbility({
    scene,
    time: 3000,
    player,
    enemies: { getChildren: () => [enemyA, enemyB] },
    projectiles: { getChildren: () => [] },
    loots: { getChildren: () => [] },
    onEnemyDefeated: () => {},
  });

  assert.deepEqual(result, {
    name: 'Draft Architecture',
    cooldownMs: 15_000,
    statDelta: { technicalDebt: -10 },
  });
  assert.equal(enemyA.slowUntil, 8000);
  assert.equal(enemyB.slowUntil, 8000);
});

test('security ability clears projectiles and grants projectile immunity', () => {
  const player = createPlayer('security');
  const projectileA = createProjectile();
  const projectileB = createProjectile();
  const { scene } = createSceneDouble();

  const result = useClassAbility({
    scene,
    time: 9000,
    player,
    enemies: { getChildren: () => [] },
    projectiles: { getChildren: () => [projectileA, projectileB] },
    loots: { getChildren: () => [] },
    onEnemyDefeated: () => {},
  });

  assert.deepEqual(result, {
    name: 'Deploy Firewall',
    cooldownMs: 15_000,
    statDelta: { complianceRisk: -10 },
  });
  assert.equal(projectileA.destroyed, true);
  assert.equal(projectileB.destroyed, true);
  assert.deepEqual(player.immunities, [{ time: 9000, durationMs: 4000 }]);
  assert.deepEqual(player.cooldowns, [{ time: 9000, cooldownMs: 15_000 }]);
});

test('ability definitions expose range telegraph details for the developer class', () => {
  const definition = getAbilityDefinition('developer');

  assert.deepEqual(definition, {
    id: 'developer',
    name: 'Ship Hotfix',
    cooldownMs: 10_000,
    description: 'Burst nearby enemies for 60 damage.',
    rangeLabel: 'Range: 180px radius',
    telegraphKind: 'radius',
    radiusPx: 180,
  });
});

test('ability definitions fall back to the developer metadata for unknown classes', () => {
  const definition = getAbilityDefinition('mystery-class');

  assert.equal(definition.id, 'developer');
  assert.equal(definition.name, 'Ship Hotfix');
  assert.equal(definition.telegraphKind, 'radius');
});

test('cooldown ui state reports remaining time until the ability is ready again', () => {
  const cooldown = getAbilityCooldownState({
    activatedAt: 1_000,
    cooldownMs: 10_000,
    now: 3_500,
  });

  assert.equal(cooldown.progress, 0.25);
  assert.equal(cooldown.remainingLabel, '7.5s');
});

test('cooldown ui state stays ready before the first use', () => {
  const cooldown = getAbilityCooldownState(null);

  assert.equal(cooldown.progress, 1);
  assert.equal(cooldown.remainingLabel, 'READY');
});

test('ability telegraph stays visible for half a second after activation', () => {
  assert.equal(isAbilityTelegraphVisible(1_000, 1_499), true);
  assert.equal(isAbilityTelegraphVisible(1_000, 1_500), false);
});

test('ability telegraph is hidden before the first activation', () => {
  assert.equal(isAbilityTelegraphVisible(null, 1_500), false);
});
