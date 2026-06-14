import Phaser from 'phaser';
import { RawStats } from '../../types/game';
import { applyStatChanges } from '../../domain/rules/statRules';
import { checkWinLose } from '../../domain/rules/progressionRules';
import { EnemyType } from '../levels/types';
import { CLASS_MODIFIERS, CLASS_ATTACK_DAMAGE, CLASS_ATTACK_QUOTES } from '../../constants/classes';
import { ATTACK_USED } from '../eventKeys';
import { soundManager } from '../sound';

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
  private quoteVisibleUntil = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private attackKey!: Phaser.Input.Keyboard.Key;
  /** Visible hitbox graphic shown briefly during attack */
  private attackBox: Phaser.GameObjects.Rectangle | null = null;
  private attackVictims = new WeakSet<object>();
  private invincibilityTween: Phaser.Tweens.Tween | null = null;
  private jumpBufferTimer = 0;
  currentAnimKey = 'player-idle';
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
    this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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
      soundManager.jump();
    }

    // Attack
    const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey);
    if (attackPressed && time > this.attackCooldownTimer) {
      this.attackCooldownTimer = time + ATTACK_COOLDOWN;
      this.showAttackBox();
      soundManager.attack();
      this.maybeShowAttackQuote(time);
      this.scene.game.events.emit(ATTACK_USED, { cooldownMs: ATTACK_COOLDOWN });
    }

    // Animations
    if (!onGround) {
      this.currentAnimKey = `${this.classId}-player-jump`;
      this.play(`${this.classId}-player-jump`, true);
    } else if (goLeft || goRight) {
      this.currentAnimKey = `${this.classId}-player-walk`;
      this.play(`${this.classId}-player-walk`, true);
    } else {
      this.currentAnimKey = `${this.classId}-player-idle`;
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
    // Invisible hitbox — used only for collision detection
    this.attackBox = this.scene.add.rectangle(boxX, boxY, ATTACK_RANGE, ATTACK_HEIGHT, 0xffffff, 0);
    this.attackBox.setDepth(20);
    this.spawnSlashEffect(boxX, boxY, this.flipX ? -1 : 1);
    this.scene.time.delayedCall(150, () => {
      this.attackBox?.destroy();
      this.attackBox = null;
    });
  }

  private spawnSlashEffect(x: number, y: number, dirX: number) {
    // Three angled slash lines forming a claw pattern
    const slashAngles = [-28, 0, 28];
    const slashColors = [0xff6a00, 0xffffff, 0xff6a00];

    for (let i = 0; i < slashAngles.length; i++) {
      const line = this.scene.add.rectangle(x, y, ATTACK_RANGE * 1.3, 5, slashColors[i], 0.92);
      line.setDepth(21);
      line.setRotation(Phaser.Math.DegToRad(slashAngles[i]));
      line.setScale(0.2, 1);
      this.scene.tweens.add({
        targets: line,
        scaleX: 1,
        alpha: 0,
        duration: 160,
        ease: 'Quad.easeOut',
        onComplete: () => { line.destroy(); },
      });
    }

    // Bright impact flash at the tip of the swing
    const flashX = x + dirX * 14;
    const flash = this.scene.add.ellipse(flashX, y, 22, 22, 0xffffff, 0.9);
    flash.setDepth(22);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 130,
      ease: 'Quad.easeOut',
      onComplete: () => { flash.destroy(); },
    });

    // Gold sparks shooting outward
    const sparkCount = 5;
    for (let i = 0; i < sparkCount; i++) {
      const spread = Phaser.Math.FloatBetween(-0.7, 0.7);
      const baseAngle = dirX > 0 ? 0 : Math.PI;
      const angle = baseAngle + spread;
      const dist = Phaser.Math.Between(24, 52);
      const spark = this.scene.add.rectangle(x, y, 7, 3, 0xffd040, 1);
      spark.setDepth(22);
      spark.setRotation(angle);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.4,
        duration: 210,
        ease: 'Cubic.easeOut',
        onComplete: () => { spark.destroy(); },
      });
    }
  }

  private maybeShowAttackQuote(time: number): void {
    if (time < this.quoteVisibleUntil) return;
    if (Math.random() >= 0.15) return;

    const quotes = CLASS_ATTACK_QUOTES[this.classId];
    if (!quotes || quotes.length === 0) return;

    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const text = this.scene.add.text(this.x, this.y - 40, quote, {
      color: '#ffd040',
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5, 1);
    text.setDepth(25);

    this.quoteVisibleUntil = time + 1500;

    this.scene.tweens.add({
      targets: text,
      y: text.y - 48,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => { text.destroy(); },
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
