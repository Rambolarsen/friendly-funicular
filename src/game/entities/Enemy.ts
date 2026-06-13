import Phaser from 'phaser';
import { EnemyType } from '../levels/types';

export const ENEMY_CONFIGS: Record<EnemyType, {
  texture: string;
  hp: number;
  speed: number;
  contactDamage: number;
  patrolRange: number;
  color: number;
}> = {
  [EnemyType.Goblin]:  { texture: 'enemy-goblin',  hp: 30,  speed: 60,  contactDamage: 10, patrolRange: 120, color: 0x4ade80 },
  [EnemyType.Wraith]:  { texture: 'enemy-wraith',  hp: 20,  speed: 110, contactDamage: 8,  patrolRange: 160, color: 0xa78bfa },
  [EnemyType.Troll]:   { texture: 'enemy-troll',   hp: 60,  speed: 40,  contactDamage: 15, patrolRange: 80,  color: 0x92400e },
  [EnemyType.Spectre]: { texture: 'enemy-spectre', hp: 25,  speed: 50,  contactDamage: 5,  patrolRange: 100, color: 0x67e8f9 },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  maxHp: number;
  enemyType: EnemyType;
  contactDamage: number;
  protected patrolCenter: number;
  protected patrolRange: number;
  protected direction: 1 | -1 = 1;
  protected speed: number;

  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    const cfg = ENEMY_CONFIGS[type];
    super(scene, x, y, cfg.texture);
    this.enemyType = type;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.speed = cfg.speed;
    this.contactDamage = cfg.contactDamage;
    this.patrolCenter = x;
    this.patrolRange = cfg.patrolRange;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setGravityY(0);
    this.setDepth(8);

    // HP bar (background + fill)
    this.hpBarBg = scene.add.rectangle(x, y - 20, 32, 4, 0x333333).setDepth(15);
    this.hpBar   = scene.add.rectangle(x, y - 20, 32, 4, 0x22c55e).setDepth(16).setOrigin(0.5, 0.5);
  }

  patrol() {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.x > this.patrolCenter + this.patrolRange) this.direction = -1;
    if (this.x < this.patrolCenter - this.patrolRange) this.direction = 1;
    body.setVelocityX(this.direction * this.speed);
    this.setFlipX(this.direction === -1);
  }

  updateHpBar() {
    const pct = this.hp / this.maxHp;
    this.hpBar.setPosition(this.x, this.y - 24);
    this.hpBarBg.setPosition(this.x, this.y - 24);
    this.hpBar.setSize(32 * pct, 4);
    this.hpBar.setFillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444);
  }

  takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHpBar();
    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => this.clearTint());
    return this.hp <= 0;
  }

  die() {
    this.hpBar.destroy();
    this.hpBarBg.destroy();
    this.destroy();
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.patrol();
    this.updateHpBar();
  }
}

/** Spectre fires slow projectiles; inherits patrol but overrides attack behavior */
export class SpectreEnemy extends Enemy {
  private nextShot = 0;
  private readonly SHOOT_INTERVAL = 2500;
  private projectiles: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, x: number, y: number, projectileGroup: Phaser.GameObjects.Group) {
    super(scene, x, y, EnemyType.Spectre);
    this.projectiles = projectileGroup;
  }

  shoot(targetX: number, targetY: number, time: number) {
    if (time < this.nextShot) return;
    this.nextShot = time + this.SHOOT_INTERVAL;

    const proj = this.scene.add.rectangle(this.x, this.y, 10, 10, 0x67e8f9) as Phaser.GameObjects.Rectangle;
    this.scene.physics.add.existing(proj);
    this.projectiles.add(proj);

    const speed = 160;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const body = (proj as unknown as { body: Phaser.Physics.Arcade.Body }).body;
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    body.setGravityY(-600); // counteract world gravity

    this.scene.time.delayedCall(3000, () => {
      if (proj.active) {
        this.projectiles.remove(proj, true, true);
      }
    });
  }
}
