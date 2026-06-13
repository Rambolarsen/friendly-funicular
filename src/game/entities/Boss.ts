import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../levels/types';

const BOSS_HP = 300;
const BOSS_SPEED = 70;
const BOSS_PATROL_RANGE = 300;
const CHARGE_SPEED = 420;
const CHARGE_INTERVAL = 5000; // ms between charges
const CHARGE_DURATION = 600;  // ms of charge movement
const CONTACT_DAMAGE = 20;

export class Boss extends Enemy {
  private isCharging = false;
  private nextChargeTime = 0;
  private chargeDirection: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, EnemyType.Troll); // uses chars spritesheet; overridden below
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

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
  }

  patrol() {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.isCharging) {
      body.setVelocityX(this.chargeDirection * CHARGE_SPEED);
      return;
    }

    // Normal patrol
    if (this.x > this.patrolCenter + this.patrolRange) this.direction = -1;
    if (this.x < this.patrolCenter - this.patrolRange) this.direction = 1;
    body.setVelocityX(this.direction * BOSS_SPEED);
    this.setFlipX(this.direction === -1);

    if (this.scene.time.now > this.nextChargeTime) {
      this.startCharge();
    }
  }

  private startCharge() {
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
