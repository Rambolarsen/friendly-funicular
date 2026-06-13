import Phaser from 'phaser';
import { RawStats } from '../../types/game';
import { applyStatChanges } from '../../domain/rules/statRules';
import { checkWinLose } from '../../domain/rules/progressionRules';
import { EnemyType } from '../levels/types';
import { CLASS_MODIFIERS, CLASS_ATTACK_DAMAGE, CONSULTANT_CLASSES } from '../../constants/classes';
import { ATTACK_USED } from '../eventKeys';

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -860;
const MAX_HP = 100;
export const ATTACK_COOLDOWN = 400; // ms
const ATTACK_RANGE = 48;
const ATTACK_HEIGHT = 32;
const INVINCIBILITY_DURATION = 800; // ms after taking damage

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  maxHp: number = MAX_HP;
  classId: string;
  private attackCooldownTimer = 0;
  private abilityCooldownUntil = 0;
  private projectileImmunityUntil = 0;
  private invincibleUntil = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private attackKeys!: { z: Phaser.Input.Keyboard.Key; x: Phaser.Input.Keyboard.Key };
  /** Visible hitbox graphic shown briefly during attack */
  private attackBox: Phaser.GameObjects.Rectangle | null = null;
  private attackVictims = new WeakSet<object>();
  private invincibilityTween: Phaser.Tweens.Tween | null = null;
  private jumpBufferTimer = 0;
  private static readonly JUMP_BUFFER_MS = 120;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: string) {
    super(scene, x, y, `${classId}-sprite`);
    this.classId = classId;
    this.hp = MAX_HP;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(0);
    body.setSize(20, 22);
    body.setOffset(2, 2);
    this.setDisplaySize(28, 28);
    this.setDepth(10);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKeys = {
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
    };
  }

  update(time: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;

    // Horizontal movement
    const goLeft  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown;

    if (goLeft) {
      body.setVelocityX(-MOVE_SPEED);
      this.setFlipX(true);
    } else if (goRight) {
      body.setVelocityX(MOVE_SPEED);
      this.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    // Jump (hold to auto-jump on landing; 120ms buffer for early presses)
    const jumpPressed = this.cursors.up.isDown
      || (this.cursors.space as Phaser.Input.Keyboard.Key).isDown
      || this.wasd.up.isDown;
    if (jumpPressed) {
      this.jumpBufferTimer = time + Player.JUMP_BUFFER_MS;
    }
    if (this.jumpBufferTimer > time && onGround) {
      body.setVelocityY(JUMP_VELOCITY);
      this.jumpBufferTimer = 0;
    }

    // Attack
    const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKeys.z)
      || Phaser.Input.Keyboard.JustDown(this.attackKeys.x);
    if (attackPressed && time > this.attackCooldownTimer) {
      this.attackCooldownTimer = time + ATTACK_COOLDOWN;
      this.showAttackBox();
      this.scene.game.events.emit(ATTACK_USED, { cooldownMs: ATTACK_COOLDOWN });
    }

    // Animations
    if (!onGround) {
      this.play(`${this.classId}-player-jump`, true);
    } else if (goLeft || goRight) {
      this.play(`${this.classId}-player-walk`, true);
    } else {
      this.play(`${this.classId}-player-idle`, true);
    }

    if (time >= this.invincibleUntil) {
      this.clearInvincibilityVisuals();
    }
  }

  private showAttackBox() {
    const offsetX = this.flipX ? -ATTACK_RANGE : ATTACK_RANGE;
    const boxX = this.x + offsetX / 2 + (this.flipX ? -12 : 12);
    const boxY = this.y;

    this.attackVictims = new WeakSet<object>();
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
  isAttackHitting(target: Phaser.GameObjects.GameObject & { getBounds: () => Phaser.Geom.Rectangle }): boolean {
    if (!this.attackBox) return false;
    if (this.attackVictims.has(target)) return false;
    const hitBounds = this.attackBox.getBounds();
    if (!Phaser.Geom.Rectangle.Overlaps(hitBounds, target.getBounds())) return false;
    this.attackVictims.add(target);
    return true;
  }

  /**
   * Apply damage to the player. Returns updated stats.
   * Respects invincibility frames; emits nothing — caller handles stat emission.
   */
  takeDamage(
    amount: number,
    currentStats: RawStats,
    time: number,
    sourceX?: number,
  ): { newStats: RawStats; died: boolean; didTakeDamage: boolean } {
    if (time < this.invincibleUntil) return { newStats: currentStats, died: false, didTakeDamage: false };
    this.grantInvincibility(time);

    if (typeof sourceX === 'number') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const direction = this.x >= sourceX ? 1 : -1;
      body.setVelocityX(direction * 250);
      body.setVelocityY(-80);
    }

    this.hp = Math.max(0, this.hp - amount);
    const newStats = applyStatChanges(currentStats, { teamMorale: -5, budget: -3 });
    const { outcome } = checkWinLose(newStats, false);
    return { newStats, died: this.hp <= 0 || outcome === 'lose', didTakeDamage: true };
  }

  /** Grant invincibility frames (e.g. after respawn) without dealing damage. */
  grantInvincibility(time: number) {
    this.invincibleUntil = time + INVINCIBILITY_DURATION;
    this.startInvincibilityTween();
  }

  isAbilityReady(time: number): boolean {
    return time >= this.abilityCooldownUntil;
  }

  /** Returns the base damage this class deals with a basic attack. */
  getAttackDamage(): number {
    const damage = CLASS_ATTACK_DAMAGE[this.classId];
    if (damage === null || damage === undefined) {
      // Intern: random 10–40
      return 10 + Math.floor(Math.random() * 31);
    }
    return damage;
  }

  startAbilityCooldown(time: number, cooldownMs: number): void {
    this.abilityCooldownUntil = time + cooldownMs;
  }

  grantProjectileImmunity(time: number, durationMs: number): void {
    this.projectileImmunityUntil = time + durationMs;
  }

  isProjectileImmune(time: number): boolean {
    return time < this.projectileImmunityUntil;
  }

  /**
   * Returns the stat bonus earned for killing the given enemy type
   * plus the class passive kill modifier.
   */
  getKillBonus(enemyType: EnemyType, classId: string): Partial<RawStats> {
    const BASE: Record<EnemyType, Partial<RawStats>> = {
      [EnemyType.Goblin]:  { deliveryProgress: 8,  budget: -5 },
      [EnemyType.Wraith]:  { deliveryProgress: 6,  teamMorale: -3 },
      [EnemyType.Troll]:   { deliveryProgress: 12, budget: -10 },
      [EnemyType.Spectre]: { complianceRisk: -15 },
    };
    const base = BASE[enemyType] ?? {};
    const classBonus = classId === 'intern'
      ? this.randomInternBonus()
      : (CLASS_MODIFIERS[classId] ?? {});
    return mergePartialStats(base, classBonus);
  }

  private randomInternBonus(): Partial<RawStats> {
    const keys: (keyof RawStats)[] = [
      'budget', 'clientHappiness', 'technicalDebt', 'teamMorale',
      'deliveryProgress', 'complianceRisk',
    ];
    const key = keys[Math.floor(Math.random() * keys.length)];
    const value = Math.floor(Math.random() * 20) - 8; // -8 to +11
    return { [key]: value };
  }

  private startInvincibilityTween(): void {
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

  private clearInvincibilityVisuals(): void {
    this.invincibilityTween?.stop();
    this.invincibilityTween?.remove();
    this.invincibilityTween = null;
    this.setAlpha(1);
  }
}

function mergePartialStats(a: Partial<RawStats>, b: Partial<RawStats>): Partial<RawStats> {
  const result = { ...a };
  for (const k of Object.keys(b) as (keyof RawStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}
