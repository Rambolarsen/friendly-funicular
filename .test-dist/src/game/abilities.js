"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABILITY_DEFINITIONS = void 0;
exports.getAbilityDefinition = getAbilityDefinition;
exports.getAbilityCooldownState = getAbilityCooldownState;
exports.isAbilityTelegraphVisible = isAbilityTelegraphVisible;
exports.useClassAbility = useClassAbility;
exports.ABILITY_DEFINITIONS = {
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
};
const NON_INTERN_CLASS_IDS = [
    'architect',
    'developer',
    'ux',
    'datascientist',
    'pm',
    'security',
    'accountmanager',
];
const RANDOM_STAT_KEYS = [
    'budget',
    'clientHappiness',
    'technicalDebt',
    'teamMorale',
    'deliveryProgress',
    'complianceRisk',
];
function getAbilityDefinition(classId) {
    return exports.ABILITY_DEFINITIONS[classId] ?? exports.ABILITY_DEFINITIONS.developer;
}
function getAbilityCooldownState(cooldown) {
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
function isAbilityTelegraphVisible(activatedAt, now, visibleDurationMs = 500) {
    if (activatedAt === null) {
        return false;
    }
    return now - activatedAt < visibleDurationMs;
}
function useClassAbility(ctx) {
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
function runInternAbility(ctx) {
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
function applyAbilityEffect(classId, ctx) {
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
function getNearestEnemy(player, enemies) {
    let nearestEnemy = null;
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
function getActiveChildren(group, predicate) {
    return group.getChildren().filter(predicate).filter((child) => child.active);
}
function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
function createResult(classId, statDelta) {
    const definition = getAbilityDefinition(classId);
    return {
        name: definition.name,
        cooldownMs: definition.cooldownMs,
        statDelta,
    };
}
function isAbilityClassId(value) {
    return value in exports.ABILITY_DEFINITIONS;
}
function isAbilityEnemy(child) {
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
function isAbilityProjectile(child) {
    return typeof child === 'object'
        && child !== null
        && 'active' in child
        && 'destroy' in child;
}
function isAbilityLoot(child) {
    return typeof child === 'object'
        && child !== null
        && 'active' in child
        && 'setTint' in child
        && 'clearTint' in child;
}
