"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const GameStats_1 = require("../../domain/valueObjects/GameStats");
const statRules_1 = require("../../domain/rules/statRules");
const progressionRules_1 = require("../../domain/rules/progressionRules");
const eventKeys_1 = require("../eventKeys");
const abilities_1 = require("../abilities");
const Player_1 = require("../entities/Player");
const Enemy_1 = require("../entities/Enemy");
const Boss_1 = require("../entities/Boss");
const effects_1 = require("../effects");
const types_1 = require("../levels/types");
const level1_1 = require("../levels/level1");
const level2_1 = require("../levels/level2");
const level3_1 = require("../levels/level3");
const bossLevel_1 = require("../levels/bossLevel");
const PLAYER_ATTACK_DAMAGE = 25;
const LEVELS = [level1_1.level1, level2_1.level2, level3_1.level3, bossLevel_1.bossLevel];
const LOOT_STATS = {
    budget: { budget: 15 },
    morale: { teamMorale: 12 },
    debt: { technicalDebt: -15 },
    compliance: { complianceRisk: -15 },
};
class GameScene extends phaser_1.default.Scene {
    player;
    platforms;
    enemies;
    projectiles;
    loots;
    boss = null;
    stats;
    classId;
    levelIndex = 0;
    isBossLevel = false;
    bossDefeated = false;
    levelComplete = false;
    currentLevel;
    abilityKey;
    // UI
    hpText;
    abilityTelegraphGraphics = null;
    abilityAura = null;
    lastAbilityUsedAt = null;
    projectileTelegraphSnapshot = [];
    constructor() {
        super({ key: 'GameScene' });
    }
    init(data) {
        const storedLevelIndex = this.registry.get('levelIndex');
        this.levelIndex = data?.levelIndex
            ?? (typeof storedLevelIndex === 'number' ? storedLevelIndex : 0);
        this.isBossLevel = this.levelIndex === LEVELS.length - 1;
        this.bossDefeated = false;
        this.levelComplete = false;
        this.lastAbilityUsedAt = null;
        this.projectileTelegraphSnapshot = [];
    }
    create() {
        this.stats = GameStats_1.GameStats.from(this.registry.get('stats')).toPlain();
        this.classId = this.registry.get('selectedClass')?.id ?? 'developer';
        this.currentLevel = LEVELS[this.levelIndex] ?? LEVELS[0];
        // World bounds
        this.physics.world.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
        this.cameras.main.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
        this.buildBackground();
        this.buildPlatforms();
        this.spawnLoots();
        this.spawnEnemies();
        // Player
        const { x, y } = this.currentLevel.playerStart;
        this.player = new Player_1.Player(this, x, y, this.classId);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.abilityKey = this.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.Q);
        // Exit marker (non-boss levels)
        if (!this.isBossLevel) {
            this.add.rectangle(this.currentLevel.exitX, 440, 24, 100, 0x22c55e, 0.6).setDepth(5);
            this.add.text(this.currentLevel.exitX - 12, 380, '→ EXIT', {
                fontSize: '11px', color: '#22c55e', fontStyle: 'bold',
            }).setDepth(6);
        }
        this.setupColliders();
        this.setupHUD();
        this.setupAbilityTelegraph();
        this.game.events.emit(eventKeys_1.LEVEL_STARTED);
        this.emitStats(); // initial HUD sync
    }
    update(time) {
        if (this.levelComplete)
            return;
        this.player.update(time);
        this.updateAbilityTelegraph();
        // Fall-off detection: respawn with stat penalty
        if (this.player.y > this.currentLevel.height + 50) {
            const { x, y } = this.currentLevel.playerStart;
            this.player.setPosition(x, y);
            this.player.body.setVelocity(0, 0);
            this.player.grantInvincibility(time);
            this.stats = (0, statRules_1.applyStatChanges)(this.stats, { budget: -10, teamMorale: -10 });
            this.emitStats();
            this.updateHUD();
            this.checkWinLose();
        }
        // Attack hits enemies
        for (const obj of this.enemies.getChildren()) {
            const enemy = obj;
            if (!enemy.active)
                continue;
            if (this.player.isAttackHitting(enemy)) {
                this.cameras.main.shake(80, 0.003);
                const died = enemy.takeDamage(PLAYER_ATTACK_DAMAGE, this.player.x);
                if (died)
                    this.onEnemyDied(enemy);
            }
        }
        // Spectre shooting
        for (const obj of this.enemies.getChildren()) {
            if (obj instanceof Enemy_1.SpectreEnemy && obj.active) {
                obj.shoot(this.player.x, this.player.y, time);
            }
        }
        if (phaser_1.default.Input.Keyboard.JustDown(this.abilityKey)) {
            const projectileSnapshot = this.classId === 'security'
                ? this.projectiles.getChildren().filter(isPositionedActiveObject).map(({ x, y }) => ({ x, y }))
                : [];
            const result = (0, abilities_1.useClassAbility)({
                scene: this,
                time,
                player: this.player,
                enemies: this.enemies,
                projectiles: this.projectiles,
                loots: this.loots,
                onEnemyDefeated: (enemy) => {
                    this.onEnemyDied(enemy);
                },
            });
            if (result) {
                if (result.statDelta) {
                    this.stats = (0, statRules_1.applyStatChanges)(this.stats, result.statDelta);
                    this.emitStats();
                }
                this.lastAbilityUsedAt = time;
                this.projectileTelegraphSnapshot = projectileSnapshot;
                this.game.events.emit(eventKeys_1.ABILITY_USED, {
                    name: result.name,
                    cooldownMs: result.cooldownMs,
                });
                this.checkWinLose();
            }
        }
        // Exit trigger
        if (!this.isBossLevel && this.player.x >= this.currentLevel.exitX) {
            this.onLevelComplete();
        }
    }
    // ── Private helpers ──────────────────────────────────────────────────────────
    buildBackground() {
        const { width, height } = this.currentLevel;
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(0);
        // Decorative vertical stripes (corporate dungeon flavour)
        const stripe = this.isBossLevel ? 0x2d1b3d : 0x16213e;
        for (let x = 0; x < width; x += 160) {
            this.add.rectangle(x, height / 2, 80, height, stripe, 0.3).setDepth(0);
        }
    }
    buildPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        for (const p of this.currentLevel.platforms) {
            const tile = this.add.tileSprite(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 'platform').setDepth(4);
            this.physics.add.existing(tile, true);
            this.platforms.add(tile);
        }
    }
    spawnEnemies() {
        this.enemies = this.add.group();
        this.projectiles = this.add.group();
        for (const spawn of this.currentLevel.enemies) {
            const enemy = spawn.type === types_1.EnemyType.Spectre
                ? new Enemy_1.SpectreEnemy(this, spawn.x, spawn.y, this.projectiles)
                : new Enemy_1.Enemy(this, spawn.x, spawn.y, spawn.type);
            this.enemies.add(enemy);
        }
        if (this.currentLevel.boss) {
            this.boss = new Boss_1.Boss(this, this.currentLevel.boss.x, this.currentLevel.boss.y);
            this.enemies.add(this.boss);
        }
    }
    spawnLoots() {
        this.loots = this.add.group();
        for (const loot of this.currentLevel.loots) {
            const icon = this.add.image(loot.x, loot.y, `loot-${loot.type}`).setDepth(5);
            icon.setData('lootType', loot.type);
            this.physics.add.existing(icon);
            icon.body.setAllowGravity(false);
            // Floating bob animation
            this.tweens.add({ targets: icon, y: loot.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.loots.add(icon);
        }
    }
    setupColliders() {
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        // Player touches enemy — contact damage
        this.physics.add.overlap(this.player, this.enemies, (_p, obj) => {
            const enemy = obj;
            if (!enemy.active)
                return;
            const time = this.time.now;
            const { newStats, died, didTakeDamage } = this.player.takeDamage(enemy.contactDamage, this.stats, time, enemy.x);
            if (!didTakeDamage)
                return;
            this.stats = newStats;
            this.cameras.main.shake(250, 0.008);
            this.emitStats();
            this.updateHUD();
            if (died)
                this.onPlayerDied();
        });
        // Projectile hits player
        this.physics.add.overlap(this.player, this.projectiles, (_p, proj) => {
            const time = this.time.now;
            const projectile = proj;
            if (this.player.isProjectileImmune(time)) {
                projectile.destroy();
                return;
            }
            const { newStats, died, didTakeDamage } = this.player.takeDamage(8, this.stats, time, projectile.x);
            projectile.destroy();
            if (!didTakeDamage)
                return;
            this.stats = newStats;
            this.cameras.main.shake(250, 0.008);
            this.emitStats();
            this.updateHUD();
            if (died)
                this.onPlayerDied();
        });
        // Player collects loot
        this.physics.add.overlap(this.player, this.loots, (_p, loot) => {
            const type = loot.getData('lootType');
            const changes = LOOT_STATS[type];
            this.stats = (0, statRules_1.applyStatChanges)(this.stats, changes);
            this.emitStats();
            loot.destroy();
        });
    }
    setupHUD() {
        // Minimal in-scene text labels (main HUD is React overlay)
        this.add.text(12, 10, this.isBossLevel ? '⚠ BOSS LEVEL' : `LEVEL ${this.levelIndex + 1}`, { fontSize: '13px', color: '#e5e7eb', backgroundColor: '#00000066', padding: { x: 6, y: 3 } }).setScrollFactor(0).setDepth(100);
        this.hpText = this.add.text(12, 32, `HP: ${this.player?.hp ?? 100}`, { fontSize: '12px', color: '#f87171', backgroundColor: '#00000066', padding: { x: 6, y: 3 } }).setScrollFactor(0).setDepth(100);
    }
    setupAbilityTelegraph() {
        this.abilityTelegraphGraphics = this.add.graphics().setDepth(12);
        this.abilityAura = this.add.rectangle(0, 0, 0, 0, 0x22d3ee, 0.04)
            .setScrollFactor(0)
            .setDepth(90)
            .setVisible(false);
        this.events.once(phaser_1.default.Scenes.Events.SHUTDOWN, () => {
            this.abilityTelegraphGraphics?.destroy();
            this.abilityAura?.destroy();
            this.abilityTelegraphGraphics = null;
            this.abilityAura = null;
        });
    }
    updateAbilityTelegraph() {
        const telegraph = this.abilityTelegraphGraphics;
        const aura = this.abilityAura;
        if (!telegraph || !aura) {
            return;
        }
        const definition = (0, abilities_1.getAbilityDefinition)(this.classId);
        const enemies = this.enemies.getChildren().filter((child) => child instanceof Enemy_1.Enemy && child.active);
        const loots = this.loots.getChildren().filter(isPositionedActiveObject);
        telegraph.clear();
        aura.setVisible(false);
        if (!(0, abilities_1.isAbilityTelegraphVisible)(this.lastAbilityUsedAt, this.time.now)) {
            return;
        }
        switch (definition.telegraphKind) {
            case 'radius':
                telegraph.lineStyle(2, 0x67e8f9, 0.3);
                telegraph.strokeCircle(this.player.x, this.player.y, definition.radiusPx ?? 0);
                break;
            case 'nearest-enemy': {
                const nearestEnemy = findNearestTarget(this.player.x, this.player.y, enemies);
                if (!nearestEnemy) {
                    break;
                }
                telegraph.lineStyle(2, 0xfbbf24, 0.4);
                telegraph.beginPath();
                telegraph.moveTo(this.player.x, this.player.y - 8);
                telegraph.lineTo(nearestEnemy.x, nearestEnemy.y);
                telegraph.strokePath();
                telegraph.strokeCircle(nearestEnemy.x, nearestEnemy.y, 18);
                break;
            }
            case 'all-enemies':
                this.showAbilityAura(getEnemyAuraColor(this.classId), 0.025);
                telegraph.lineStyle(2, getEnemyAuraColor(this.classId), 0.25);
                for (const enemy of enemies) {
                    telegraph.strokeCircle(enemy.x, enemy.y, 20);
                }
                break;
            case 'all-loot':
                this.showAbilityAura(0x93c5fd, 0.025);
                telegraph.lineStyle(2, 0x93c5fd, 0.3);
                for (const loot of loots) {
                    telegraph.strokeCircle(loot.x, loot.y, 14);
                }
                break;
            case 'all-projectiles':
                this.showAbilityAura(0x60a5fa, this.projectileTelegraphSnapshot.length > 0 ? 0.03 : 0.02);
                telegraph.lineStyle(2, 0x60a5fa, 0.3);
                telegraph.strokeCircle(this.player.x, this.player.y, 42);
                for (const projectile of this.projectileTelegraphSnapshot) {
                    telegraph.strokeCircle(projectile.x, projectile.y, 10);
                }
                break;
            case 'wildcard':
                this.showAbilityAura(0xa855f7, 0.025);
                telegraph.lineStyle(2, 0xa855f7, 0.3);
                telegraph.strokeCircle(this.player.x, this.player.y, 56);
                break;
        }
    }
    showAbilityAura(color, alpha) {
        if (!this.abilityAura) {
            return;
        }
        this.abilityAura
            .setPosition(this.scale.width / 2, this.scale.height / 2)
            .setSize(this.scale.width - 24, this.scale.height - 24)
            .setFillStyle(color, alpha)
            .setVisible(true);
    }
    updateHUD() {
        this.hpText?.setText(`HP: ${this.player.hp}`);
    }
    emitStats() {
        this.registry.set('stats', { ...this.stats });
        this.game.events.emit(eventKeys_1.STATS_CHANGED, { ...this.stats });
    }
    onEnemyDied(enemy) {
        if (!enemy.active)
            return;
        const isBoss = enemy instanceof Boss_1.Boss;
        const kills = this.player.getKillBonus(enemy.enemyType, this.classId);
        const bossBonus = isBoss ? enemy.statDrop : {};
        const combined = mergePartials(kills, bossBonus);
        const deathColor = isBoss
            ? 0xef4444
            : (Enemy_1.ENEMY_CONFIGS[enemy.enemyType].tint ?? 0xffffff);
        this.stats = (0, statRules_1.applyStatChanges)(this.stats, combined);
        this.emitStats();
        if (isBoss) {
            this.bossDefeated = true;
            this.boss = null;
        }
        this.cameras.main.shake(150, 0.005);
        (0, effects_1.spawnDeathBurst)(this, enemy.x, enemy.y, deathColor);
        enemy.die();
        this.enemies.remove(enemy, false, false);
        this.checkWinLose();
    }
    onPlayerDied() {
        if (this.levelComplete)
            return;
        this.levelComplete = true;
        const { reason } = (0, progressionRules_1.checkWinLose)(this.stats, this.bossDefeated);
        this.game.events.emit(eventKeys_1.GAME_OVER, {
            outcome: 'lose',
            stats: this.stats,
            reason: reason ?? 'The project fell apart. Everyone has left the building.',
        });
    }
    onLevelComplete() {
        if (this.levelComplete)
            return;
        this.levelComplete = true;
        this.stats = (0, statRules_1.applyStatChanges)(this.stats, { deliveryProgress: 10 });
        this.emitStats();
        const nextLevelIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
        this.registry.set('levelIndex', nextLevelIndex);
        this.time.delayedCall(400, () => {
            this.scene.start('GameScene', { levelIndex: nextLevelIndex });
        });
    }
    checkWinLose() {
        const { outcome, reason } = (0, progressionRules_1.checkWinLose)(this.stats, this.bossDefeated);
        if (!outcome)
            return;
        if (this.levelComplete)
            return;
        this.levelComplete = true;
        this.game.events.emit(eventKeys_1.GAME_OVER, { outcome, stats: this.stats, reason });
    }
}
exports.GameScene = GameScene;
function mergePartials(a, b) {
    const result = { ...a };
    for (const k of Object.keys(b)) {
        result[k] = ((result[k] ?? 0) + (b[k] ?? 0));
    }
    return result;
}
function findNearestTarget(sourceX, sourceY, targets) {
    let nearestTarget = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const target of targets) {
        const distance = phaser_1.default.Math.Distance.Between(sourceX, sourceY, target.x, target.y);
        if (distance >= nearestDistance) {
            continue;
        }
        nearestTarget = target;
        nearestDistance = distance;
    }
    return nearestTarget;
}
function getEnemyAuraColor(classId) {
    switch (classId) {
        case 'ux':
            return 0xbfdbfe;
        case 'pm':
            return 0xfbbf24;
        default:
            return 0x22d3ee;
    }
}
function isPositionedActiveObject(child) {
    return typeof child === 'object'
        && child !== null
        && 'active' in child
        && 'x' in child
        && 'y' in child
        && 'destroy' in child
        && Boolean(child.active);
}
