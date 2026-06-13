"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const abilities_1 = require("../../src/game/abilities");
function createPlayer(classId) {
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
function createEnemy(x, hp = 100) {
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
function createProjectile() {
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
    const delayedCalls = [];
    const tweens = [];
    return {
        delayedCalls,
        tweens,
        scene: {
            time: {
                delayedCall(delay, callback) {
                    delayedCalls.push({ delay, callback });
                    return { remove() { } };
                },
            },
            tweens: {
                add(config) {
                    tweens.push(config);
                    return config;
                },
            },
        },
    };
}
(0, node_test_1.default)('developer ability damages only nearby enemies and starts cooldown', () => {
    const player = createPlayer('developer');
    const nearEnemy = createEnemy(220, 55);
    const farEnemy = createEnemy(360, 100);
    const defeated = [];
    const { scene } = createSceneDouble();
    const result = (0, abilities_1.useClassAbility)({
        scene,
        time: 1500,
        player,
        enemies: { getChildren: () => [nearEnemy, farEnemy] },
        projectiles: { getChildren: () => [] },
        loots: { getChildren: () => [] },
        onEnemyDefeated: (enemy) => {
            defeated.push(enemy);
        },
    });
    strict_1.default.deepEqual(result, {
        name: 'Ship Hotfix',
        cooldownMs: 10_000,
        statDelta: { deliveryProgress: 5 },
    });
    strict_1.default.deepEqual(nearEnemy.damage, [{ amount: 60, attackerX: 100 }]);
    strict_1.default.deepEqual(farEnemy.damage, []);
    strict_1.default.equal(defeated.length, 1);
    strict_1.default.deepEqual(player.cooldowns, [{ time: 1500, cooldownMs: 10_000 }]);
});
(0, node_test_1.default)('architect ability slows every active enemy for five seconds', () => {
    const player = createPlayer('architect');
    const enemyA = createEnemy(140);
    const enemyB = createEnemy(260);
    const { scene } = createSceneDouble();
    const result = (0, abilities_1.useClassAbility)({
        scene,
        time: 3000,
        player,
        enemies: { getChildren: () => [enemyA, enemyB] },
        projectiles: { getChildren: () => [] },
        loots: { getChildren: () => [] },
        onEnemyDefeated: () => { },
    });
    strict_1.default.deepEqual(result, {
        name: 'Draft Architecture',
        cooldownMs: 15_000,
        statDelta: { technicalDebt: -10 },
    });
    strict_1.default.equal(enemyA.slowUntil, 8000);
    strict_1.default.equal(enemyB.slowUntil, 8000);
});
(0, node_test_1.default)('security ability clears projectiles and grants projectile immunity', () => {
    const player = createPlayer('security');
    const projectileA = createProjectile();
    const projectileB = createProjectile();
    const { scene } = createSceneDouble();
    const result = (0, abilities_1.useClassAbility)({
        scene,
        time: 9000,
        player,
        enemies: { getChildren: () => [] },
        projectiles: { getChildren: () => [projectileA, projectileB] },
        loots: { getChildren: () => [] },
        onEnemyDefeated: () => { },
    });
    strict_1.default.deepEqual(result, {
        name: 'Deploy Firewall',
        cooldownMs: 15_000,
        statDelta: { complianceRisk: -10 },
    });
    strict_1.default.equal(projectileA.destroyed, true);
    strict_1.default.equal(projectileB.destroyed, true);
    strict_1.default.deepEqual(player.immunities, [{ time: 9000, durationMs: 4000 }]);
    strict_1.default.deepEqual(player.cooldowns, [{ time: 9000, cooldownMs: 15_000 }]);
});
(0, node_test_1.default)('ability definitions expose range telegraph details for the developer class', () => {
    const definition = (0, abilities_1.getAbilityDefinition)('developer');
    strict_1.default.deepEqual(definition, {
        id: 'developer',
        name: 'Ship Hotfix',
        cooldownMs: 10_000,
        description: 'Burst nearby enemies for 60 damage.',
        rangeLabel: 'Range: 180px radius',
        telegraphKind: 'radius',
        radiusPx: 180,
    });
});
(0, node_test_1.default)('ability definitions fall back to the developer metadata for unknown classes', () => {
    const definition = (0, abilities_1.getAbilityDefinition)('mystery-class');
    strict_1.default.equal(definition.id, 'developer');
    strict_1.default.equal(definition.name, 'Ship Hotfix');
    strict_1.default.equal(definition.telegraphKind, 'radius');
});
(0, node_test_1.default)('cooldown ui state reports remaining time until the ability is ready again', () => {
    const cooldown = (0, abilities_1.getAbilityCooldownState)({
        activatedAt: 1_000,
        cooldownMs: 10_000,
        now: 3_500,
    });
    strict_1.default.equal(cooldown.progress, 0.25);
    strict_1.default.equal(cooldown.remainingLabel, '7.5s');
});
(0, node_test_1.default)('cooldown ui state stays ready before the first use', () => {
    const cooldown = (0, abilities_1.getAbilityCooldownState)(null);
    strict_1.default.equal(cooldown.progress, 1);
    strict_1.default.equal(cooldown.remainingLabel, 'READY');
});
(0, node_test_1.default)('ability telegraph stays visible for half a second after activation', () => {
    strict_1.default.equal((0, abilities_1.isAbilityTelegraphVisible)(1_000, 1_499), true);
    strict_1.default.equal((0, abilities_1.isAbilityTelegraphVisible)(1_000, 1_500), false);
});
(0, node_test_1.default)('ability telegraph is hidden before the first activation', () => {
    strict_1.default.equal((0, abilities_1.isAbilityTelegraphVisible)(null, 1_500), false);
});
