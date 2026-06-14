import Phaser from 'phaser';
import { EnemyType } from '../levels/types';

export const ENEMY_CONFIGS: Record<EnemyType, {
  texture: string;
  startFrame: number;
  animKey: string;
  tint?: number;
  hp: number;
  speed: number;
  contactDamage: number;
  patrolRange: number;
}> = {
  [EnemyType.Goblin]:  { texture: 'chars', startFrame: 4,  animKey: 'goblin-walk',  hp: 30,  speed: 60,  contactDamage: 10, patrolRange: 120 },
  [EnemyType.Wraith]:  { texture: 'chars', startFrame: 6,  animKey: 'wraith-walk',  tint: 0xa78bfa, hp: 20,  speed: 110, contactDamage: 8,  patrolRange: 160 },
  [EnemyType.Troll]:   { texture: 'chars', startFrame: 9,  animKey: 'troll-walk',   hp: 60,  speed: 40,  contactDamage: 15, patrolRange: 80  },
  [EnemyType.Spectre]: { texture: 'chars', startFrame: 8,  animKey: 'spectre-idle', tint: 0x67e8f9, hp: 25,  speed: 50,  contactDamage: 5,  patrolRange: 100 },
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
  protected animKey: string = '';
  private baseTint: number | null = null;
  protected slowUntil = 0;
  protected freezeUntil = 0;
  protected fleeUntil = 0;
  protected stunUntil = 0;
  protected knockbackUntil = 0;

  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    const cfg = ENEMY_CONFIGS[type];
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
    this.setDisplaySize(24, 24);
    if (cfg.tint) {
      this.setTint(cfg.tint);
      this.baseTint = cfg.tint;
    }
    this.setDepth(8);

    this.play(cfg.animKey);

    // HP bar (background + fill)
    this.hpBarBg = scene.add.rectangle(x, y - 20, 32, 4, 0x333333).setDepth(15);
    this.hpBar   = scene.add.rectangle(x, y - 20, 32, 4, 0x22c55e).setDepth(16).setOrigin(0.5, 0.5);
  }

  get facingDirection(): 1 | -1 { return this.direction; }

  tryJump(vy: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) body.setVelocityY(vy);
  }

  patrol() {
    const time = this.scene.time.now;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const movement = this.getMovementState(time);

    if (movement.underKnockback) {
      return;
    }
    if (movement.immobilized) {
      body.setVelocityX(0);
      return;
    }

    if (this.x > this.patrolCenter + this.patrolRange) this.direction = -1;
    if (this.x < this.patrolCenter - this.patrolRange) this.direction = 1;
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

  takeDamage(amount: number, attackerX?: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHpBar();
    const body = this.body as Phaser.Physics.Arcade.Body;
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
      if (!this.active) return;
      if (this.baseTint) this.setTint(this.baseTint);
      else this.clearTint();
    });
    return this.hp <= 0;
  }

  die() {
    this.hpBar.destroy();
    this.hpBarBg.destroy();
    this.destroy();
  }

  applySlow(until: number): void {
    this.slowUntil = Math.max(this.slowUntil, until);
  }

  applyFreeze(until: number): void {
    this.freezeUntil = Math.max(this.freezeUntil, until);
  }

  applyFlee(until: number): void {
    this.fleeUntil = Math.max(this.fleeUntil, until);
  }

  applyStun(until: number): void {
    this.stunUntil = Math.max(this.stunUntil, until);
  }

  clearExpiredEffects(time: number): void {
    if (time >= this.slowUntil) this.slowUntil = 0;
    if (time >= this.freezeUntil) this.freezeUntil = 0;
    if (time >= this.fleeUntil) this.fleeUntil = 0;
    if (time >= this.stunUntil) this.stunUntil = 0;
    if (time >= this.knockbackUntil) this.knockbackUntil = 0;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.clearExpiredEffects(time);
    this.patrol();
    this.updateHpBar();
  }

  protected getMovementState(time: number): {
    direction: 1 | -1;
    speedMultiplier: number;
    immobilized: boolean;
    underKnockback: boolean;
  } {
    const inverted = time < this.fleeUntil;
    return {
      direction: (inverted ? -this.direction : this.direction) as 1 | -1,
      speedMultiplier: time < this.slowUntil ? 0.5 : 1,
      immobilized: time < this.freezeUntil || time < this.stunUntil,
      underKnockback: time < this.knockbackUntil,
    };
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
    body.setGravityY(-1800); // counteract world gravity

    this.scene.time.delayedCall(3000, () => {
      if (proj.active) {
        this.projectiles.remove(proj, true, true);
      }
    });
  }
}
