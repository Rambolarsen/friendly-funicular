"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Boss = void 0;
const Enemy_1 = require("./Enemy");
const types_1 = require("../levels/types");
const BOSS_HP = 300;
const BOSS_SPEED = 70;
const BOSS_PATROL_RANGE = 300;
const CHARGE_SPEED = 420;
const CHARGE_INTERVAL = 5000; // ms between charges
const CHARGE_DURATION = 600; // ms of charge movement
const CONTACT_DAMAGE = 20;
class Boss extends Enemy_1.Enemy {
    isCharging = false;
    nextChargeTime = 0;
    chargeDirection = 1;
    constructor(scene, x, y) {
        super(scene, x, y, types_1.EnemyType.Troll); // uses chars spritesheet; overridden below
        this.setTexture('chars', 21);
        this.setDisplaySize(48, 48);
        this.animKey = 'boss-walk';
        this.play('boss-walk');
        this.hp = BOSS_HP;
        this.maxHp = BOSS_HP;
        this.speed = BOSS_SPEED;
        this.patrolCenter = x;
        this.patrolRange = BOSS_PATROL_RANGE;
        this.contactDamage = CONTACT_DAMAGE;
        this.setDepth(9);
    }
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
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
        if (this.isCharging) {
            body.setVelocityX(this.chargeDirection * CHARGE_SPEED * movement.speedMultiplier);
            return;
        }
        // Normal patrol
        if (this.x > this.patrolCenter + this.patrolRange)
            this.direction = -1;
        if (this.x < this.patrolCenter - this.patrolRange)
            this.direction = 1;
        body.setVelocityX(movement.direction * BOSS_SPEED * movement.speedMultiplier);
        this.setFlipX(movement.direction === -1);
        if (time > this.nextChargeTime) {
            this.startCharge();
        }
    }
    startCharge() {
        this.isCharging = true;
        this.chargeDirection = this.direction;
        this.setTint(0xff2200);
        this.scene.time.delayedCall(CHARGE_DURATION, () => {
            this.isCharging = false;
            this.nextChargeTime = this.scene.time.now + CHARGE_INTERVAL;
            this.clearTint();
        });
    }
    /** Boss kill drops significant progress bonus */
    get statDrop() {
        return { deliveryProgress: 20, clientHappiness: 10 };
    }
}
exports.Boss = Boss;
