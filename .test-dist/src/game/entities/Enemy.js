"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectreEnemy = exports.Enemy = exports.ENEMY_CONFIGS = void 0;
const phaser_1 = __importDefault(require("phaser"));
const types_1 = require("../levels/types");
exports.ENEMY_CONFIGS = {
    [types_1.EnemyType.Goblin]: { texture: 'chars', startFrame: 4, animKey: 'goblin-walk', hp: 30, speed: 60, contactDamage: 10, patrolRange: 120 },
    [types_1.EnemyType.Wraith]: { texture: 'chars', startFrame: 6, animKey: 'wraith-walk', tint: 0xa78bfa, hp: 20, speed: 110, contactDamage: 8, patrolRange: 160 },
    [types_1.EnemyType.Troll]: { texture: 'chars', startFrame: 9, animKey: 'troll-walk', hp: 60, speed: 40, contactDamage: 15, patrolRange: 80 },
    [types_1.EnemyType.Spectre]: { texture: 'chars', startFrame: 8, animKey: 'spectre-idle', tint: 0x67e8f9, hp: 25, speed: 50, contactDamage: 5, patrolRange: 100 },
};
class Enemy extends phaser_1.default.Physics.Arcade.Sprite {
    hp;
    maxHp;
    enemyType;
    contactDamage;
    patrolCenter;
    patrolRange;
    direction = 1;
    speed;
    animKey = '';
    baseTint = null;
    slowUntil = 0;
    freezeUntil = 0;
    fleeUntil = 0;
    stunUntil = 0;
    knockbackUntil = 0;
    hpBar;
    hpBarBg;
    constructor(scene, x, y, type) {
        const cfg = exports.ENEMY_CONFIGS[type];
        super(scene, x, y, cfg.texture, cfg.startFrame);
        this.enemyType = type;
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.speed = cfg.speed;
        this.contactDamage = cfg.contactDamage;
        this.patrolCenter = x;
        this.patrolRange = cfg.patrolRange;
        this.animKey = cfg.animKey;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setGravityY(0);
        this.setDisplaySize(24, 24);
        if (cfg.tint) {
            this.setTint(cfg.tint);
            this.baseTint = cfg.tint;
        }
        this.setDepth(8);
        this.play(cfg.animKey);
        // HP bar (background + fill)
        this.hpBarBg = scene.add.rectangle(x, y - 20, 32, 4, 0x333333).setDepth(15);
        this.hpBar = scene.add.rectangle(x, y - 20, 32, 4, 0x22c55e).setDepth(16).setOrigin(0.5, 0.5);
    }
    patrol() {
        const time = this.scene.time.now;
        const body = this.body;
        const movement = this.getMovementState(time);
        if (movement.underKnockback) {
            return;
        }
        if (movement.immobilized) {
            body.setVelocityX(0);
            return;
        }
        if (this.x > this.patrolCenter + this.patrolRange)
            this.direction = -1;
        if (this.x < this.patrolCenter - this.patrolRange)
            this.direction = 1;
        body.setVelocityX(movement.direction * this.speed * movement.speedMultiplier);
        this.setFlipX(movement.direction === -1);
    }
    updateHpBar() {
        const pct = this.hp / this.maxHp;
        this.hpBar.setPosition(this.x, this.y - 24);
        this.hpBarBg.setPosition(this.x, this.y - 24);
        this.hpBar.setSize(32 * pct, 4);
        this.hpBar.setFillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444);
    }
    takeDamage(amount, attackerX) {
        this.hp = Math.max(0, this.hp - amount);
        this.updateHpBar();
        const body = this.body;
        if (typeof attackerX === 'number') {
            const direction = this.x >= attackerX ? 1 : -1;
            this.knockbackUntil = this.scene.time.now + 120;
            body.setVelocityX(direction * 300);
            this.setFlipX(direction === -1);
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
            if (!this.active)
                return;
            if (this.baseTint)
                this.setTint(this.baseTint);
            else
                this.clearTint();
        });
        return this.hp <= 0;
    }
    die() {
        this.hpBar.destroy();
        this.hpBarBg.destroy();
        this.destroy();
    }
    applySlow(until) {
        this.slowUntil = Math.max(this.slowUntil, until);
    }
    applyFreeze(until) {
        this.freezeUntil = Math.max(this.freezeUntil, until);
    }
    applyFlee(until) {
        this.fleeUntil = Math.max(this.fleeUntil, until);
    }
    applyStun(until) {
        this.stunUntil = Math.max(this.stunUntil, until);
    }
    clearExpiredEffects(time) {
        if (time >= this.slowUntil)
            this.slowUntil = 0;
        if (time >= this.freezeUntil)
            this.freezeUntil = 0;
        if (time >= this.fleeUntil)
            this.fleeUntil = 0;
        if (time >= this.stunUntil)
            this.stunUntil = 0;
        if (time >= this.knockbackUntil)
            this.knockbackUntil = 0;
    }
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.clearExpiredEffects(time);
        this.patrol();
        this.updateHpBar();
    }
    getMovementState(time) {
        const inverted = time < this.fleeUntil;
        return {
            direction: (inverted ? -this.direction : this.direction),
            speedMultiplier: time < this.slowUntil ? 0.5 : 1,
            immobilized: time < this.freezeUntil || time < this.stunUntil,
            underKnockback: time < this.knockbackUntil,
        };
    }
}
exports.Enemy = Enemy;
/** Spectre fires slow projectiles; inherits patrol but overrides attack behavior */
class SpectreEnemy extends Enemy {
    nextShot = 0;
    SHOOT_INTERVAL = 2500;
    projectiles;
    constructor(scene, x, y, projectileGroup) {
        super(scene, x, y, types_1.EnemyType.Spectre);
        this.projectiles = projectileGroup;
    }
    shoot(targetX, targetY, time) {
        if (time < this.nextShot)
            return;
        this.nextShot = time + this.SHOOT_INTERVAL;
        const proj = this.scene.add.rectangle(this.x, this.y, 10, 10, 0x67e8f9);
        this.scene.physics.add.existing(proj);
        this.projectiles.add(proj);
        const speed = 160;
        const angle = phaser_1.default.Math.Angle.Between(this.x, this.y, targetX, targetY);
        const body = proj.body;
        body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        body.setGravityY(-1800); // counteract world gravity
        this.scene.time.delayedCall(3000, () => {
            if (proj.active) {
                this.projectiles.remove(proj, true, true);
            }
        });
    }
}
exports.SpectreEnemy = SpectreEnemy;
