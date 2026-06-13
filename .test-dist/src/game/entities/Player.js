"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const phaser_1 = __importDefault(require("phaser"));
const statRules_1 = require("../../domain/rules/statRules");
const progressionRules_1 = require("../../domain/rules/progressionRules");
const types_1 = require("../levels/types");
const classes_1 = require("../../constants/classes");
const MOVE_SPEED = 200;
const JUMP_VELOCITY = -860;
const MAX_HP = 100;
const ATTACK_COOLDOWN = 400; // ms
const ATTACK_RANGE = 48;
const ATTACK_HEIGHT = 32;
const INVINCIBILITY_DURATION = 800; // ms after taking damage
class Player extends phaser_1.default.Physics.Arcade.Sprite {
    hp;
    maxHp = MAX_HP;
    classId;
    attackCooldownTimer = 0;
    abilityCooldownUntil = 0;
    projectileImmunityUntil = 0;
    invincibleUntil = 0;
    cursors;
    wasd;
    attackKeys;
    /** Visible hitbox graphic shown briefly during attack */
    attackBox = null;
    attackVictims = new WeakSet();
    invincibilityTween = null;
    jumpBufferTimer = 0;
    static JUMP_BUFFER_MS = 120;
    constructor(scene, x, y, classId) {
        super(scene, x, y, 'chars', 0);
        this.classId = classId;
        this.hp = MAX_HP;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body;
        body.setGravityY(0);
        body.setSize(20, 22);
        body.setOffset(2, 2);
        this.setDisplaySize(28, 28);
        this.setDepth(10);
        const kb = scene.input.keyboard;
        this.cursors = kb.createCursorKeys();
        this.wasd = {
            up: kb.addKey(phaser_1.default.Input.Keyboard.KeyCodes.W),
            left: kb.addKey(phaser_1.default.Input.Keyboard.KeyCodes.A),
            right: kb.addKey(phaser_1.default.Input.Keyboard.KeyCodes.D),
        };
        this.attackKeys = {
            z: kb.addKey(phaser_1.default.Input.Keyboard.KeyCodes.Z),
            x: kb.addKey(phaser_1.default.Input.Keyboard.KeyCodes.X),
        };
    }
    update(time) {
        const body = this.body;
        const onGround = body.blocked.down;
        // Horizontal movement
        const goLeft = this.cursors.left.isDown || this.wasd.left.isDown;
        const goRight = this.cursors.right.isDown || this.wasd.right.isDown;
        if (goLeft) {
            body.setVelocityX(-MOVE_SPEED);
            this.setFlipX(true);
        }
        else if (goRight) {
            body.setVelocityX(MOVE_SPEED);
            this.setFlipX(false);
        }
        else {
            body.setVelocityX(0);
        }
        // Jump (hold to auto-jump on landing; 120ms buffer for early presses)
        const jumpPressed = this.cursors.up.isDown
            || this.cursors.space.isDown
            || this.wasd.up.isDown;
        if (jumpPressed) {
            this.jumpBufferTimer = time + Player.JUMP_BUFFER_MS;
        }
        if (this.jumpBufferTimer > time && onGround) {
            body.setVelocityY(JUMP_VELOCITY);
            this.jumpBufferTimer = 0;
        }
        // Attack
        const attackPressed = phaser_1.default.Input.Keyboard.JustDown(this.attackKeys.z)
            || phaser_1.default.Input.Keyboard.JustDown(this.attackKeys.x);
        if (attackPressed && time > this.attackCooldownTimer) {
            this.attackCooldownTimer = time + ATTACK_COOLDOWN;
            this.showAttackBox();
        }
        // Animations
        if (!onGround) {
            this.play('player-jump', true);
        }
        else if (goLeft || goRight) {
            this.play('player-walk', true);
        }
        else {
            this.play('player-idle', true);
        }
        if (time >= this.invincibleUntil) {
            this.clearInvincibilityVisuals();
        }
    }
    showAttackBox() {
        const offsetX = this.flipX ? -ATTACK_RANGE : ATTACK_RANGE;
        const boxX = this.x + offsetX / 2 + (this.flipX ? -12 : 12);
        const boxY = this.y;
        this.attackVictims = new WeakSet();
        this.attackBox = this.scene.add.rectangle(boxX, boxY, ATTACK_RANGE, ATTACK_HEIGHT, 0xffffff, 0.35);
        this.attackBox.setDepth(20);
        this.attackBox.setScale(0.75, 0.8);
        this.scene.tweens.add({
            targets: this.attackBox,
            scaleX: 1,
            scaleY: 1,
            duration: 80,
            ease: 'Quad.easeOut',
        });
        this.scene.time.delayedCall(150, () => {
            this.attackBox?.destroy();
            this.attackBox = null;
        });
    }
    /** Returns true if the attack hitbox overlaps the given world bounds */
    isAttackHitting(target) {
        if (!this.attackBox)
            return false;
        if (this.attackVictims.has(target))
            return false;
        const hitBounds = this.attackBox.getBounds();
        if (!phaser_1.default.Geom.Rectangle.Overlaps(hitBounds, target.getBounds()))
            return false;
        this.attackVictims.add(target);
        return true;
    }
    /**
     * Apply damage to the player. Returns updated stats.
     * Respects invincibility frames; emits nothing — caller handles stat emission.
     */
    takeDamage(amount, currentStats, time, sourceX) {
        if (time < this.invincibleUntil)
            return { newStats: currentStats, died: false, didTakeDamage: false };
        this.grantInvincibility(time);
        if (typeof sourceX === 'number') {
            const body = this.body;
            const direction = this.x >= sourceX ? 1 : -1;
            body.setVelocityX(direction * 250);
            body.setVelocityY(-80);
        }
        this.hp = Math.max(0, this.hp - amount);
        const newStats = (0, statRules_1.applyStatChanges)(currentStats, { teamMorale: -5, budget: -3 });
        const { outcome } = (0, progressionRules_1.checkWinLose)(newStats, false);
        return { newStats, died: this.hp <= 0 || outcome === 'lose', didTakeDamage: true };
    }
    /** Grant invincibility frames (e.g. after respawn) without dealing damage. */
    grantInvincibility(time) {
        this.invincibleUntil = time + INVINCIBILITY_DURATION;
        this.startInvincibilityTween();
    }
    isAbilityReady(time) {
        return time >= this.abilityCooldownUntil;
    }
    startAbilityCooldown(time, cooldownMs) {
        this.abilityCooldownUntil = time + cooldownMs;
    }
    grantProjectileImmunity(time, durationMs) {
        this.projectileImmunityUntil = time + durationMs;
    }
    isProjectileImmune(time) {
        return time < this.projectileImmunityUntil;
    }
    /**
     * Returns the stat bonus earned for killing the given enemy type
     * plus the class passive kill modifier.
     */
    getKillBonus(enemyType, classId) {
        const BASE = {
            [types_1.EnemyType.Goblin]: { deliveryProgress: 8, budget: -5 },
            [types_1.EnemyType.Wraith]: { deliveryProgress: 6, teamMorale: -3 },
            [types_1.EnemyType.Troll]: { deliveryProgress: 12, budget: -10 },
            [types_1.EnemyType.Spectre]: { complianceRisk: -15 },
        };
        const base = BASE[enemyType] ?? {};
        const classBonus = classId === 'intern'
            ? this.randomInternBonus()
            : (classes_1.CLASS_MODIFIERS[classId] ?? {});
        return mergePartialStats(base, classBonus);
    }
    randomInternBonus() {
        const keys = [
            'budget', 'clientHappiness', 'technicalDebt', 'teamMorale',
            'deliveryProgress', 'complianceRisk',
        ];
        const key = keys[Math.floor(Math.random() * keys.length)];
        const value = Math.floor(Math.random() * 20) - 8; // -8 to +11
        return { [key]: value };
    }
    startInvincibilityTween() {
        this.clearInvincibilityVisuals();
        this.setAlpha(1);
        this.invincibilityTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 90,
            yoyo: true,
            repeat: -1,
            ease: 'Linear',
        });
    }
    clearInvincibilityVisuals() {
        this.invincibilityTween?.stop();
        this.invincibilityTween?.remove();
        this.invincibilityTween = null;
        this.setAlpha(1);
    }
}
exports.Player = Player;
function mergePartialStats(a, b) {
    const result = { ...a };
    for (const k of Object.keys(b)) {
        result[k] = ((result[k] ?? 0) + (b[k] ?? 0));
    }
    return result;
}
