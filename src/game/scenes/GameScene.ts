import Phaser from 'phaser';
import { RawStats } from '../../types/game';
import { GameStats as GameStatsVO } from '../../domain/valueObjects/GameStats';
import { applyStatChanges } from '../../domain/rules/statRules';
import { checkWinLose } from '../../domain/rules/progressionRules';
import { ABILITY_USED, GAME_OVER, LEVEL_STARTED, STATS_CHANGED } from '../eventKeys';
import {
  getAbilityDefinition,
  isAbilityTelegraphVisible,
  useClassAbility as executeClassAbility,
} from '../abilities';
import { Player } from '../entities/Player';
import { ENEMY_CONFIGS, Enemy, SpectreEnemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { spawnDeathBurst } from '../effects';
import { EnemyType, LevelData, LootType } from '../levels/types';
import { level1 } from '../levels/level1';
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
import { bossLevel } from '../levels/bossLevel';

const PLAYER_ATTACK_DAMAGE = 25;
const LEVELS: LevelData[] = [level1, level2, level3, bossLevel];
const LOOT_STATS: Record<LootType, Partial<RawStats>> = {
  budget: { budget: 15 },
  morale: { teamMorale: 12 },
  debt:   { technicalDebt: -15 },
  compliance: { complianceRisk: -15 },
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private loots!: Phaser.GameObjects.Group;
  private boss: Boss | null = null;

  private stats!: RawStats;
  private classId!: string;
  private levelIndex = 0;
  private isBossLevel = false;
  private bossDefeated = false;
  private levelComplete = false;

  private currentLevel!: LevelData;
  private abilityKey!: Phaser.Input.Keyboard.Key;

  // UI
  private hpText!: Phaser.GameObjects.Text;
  private abilityTelegraphGraphics: Phaser.GameObjects.Graphics | null = null;
  private abilityAura: Phaser.GameObjects.Rectangle | null = null;
  private lastAbilityUsedAt: number | null = null;
  private projectileTelegraphSnapshot: Array<{ x: number; y: number }> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { levelIndex?: number }) {
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
    this.stats = GameStatsVO.from(this.registry.get('stats') as RawStats).toPlain();
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
    this.player = new Player(this, x, y, this.classId);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.abilityKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // Exit marker (non-boss levels)
    if (!this.isBossLevel) {
      this.add.rectangle(
        this.currentLevel.exitX, 440, 24, 100, 0x22c55e, 0.6,
      ).setDepth(5);
      this.add.text(this.currentLevel.exitX - 12, 380, '→ EXIT', {
        fontSize: '11px', color: '#22c55e', fontStyle: 'bold',
      }).setDepth(6);
    }

    this.setupColliders();
    this.setupHUD();
    this.setupAbilityTelegraph();
    this.game.events.emit(LEVEL_STARTED);
    this.emitStats(); // initial HUD sync
  }

  update(time: number) {
    if (this.levelComplete) return;

    this.player.update(time);
    this.updateAbilityTelegraph();

    // Fall-off detection: respawn with stat penalty
    if (this.player.y > this.currentLevel.height + 50) {
      const { x, y } = this.currentLevel.playerStart;
      this.player.setPosition(x, y);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.player.grantInvincibility(time);
      this.stats = applyStatChanges(this.stats, { budget: -10, teamMorale: -10 });
      this.emitStats();
      this.updateHUD();
      this.checkWinLose();
    }

    // Attack hits enemies
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      if (this.player.isAttackHitting(enemy)) {
        this.cameras.main.shake(80, 0.003);
        const died = enemy.takeDamage(PLAYER_ATTACK_DAMAGE, this.player.x);
        if (died) this.onEnemyDied(enemy as Enemy);
      }
    }

    // Spectre shooting
    for (const obj of this.enemies.getChildren()) {
      if (obj instanceof SpectreEnemy && obj.active) {
        obj.shoot(this.player.x, this.player.y, time);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
      const projectileSnapshot = this.classId === 'security'
        ? this.projectiles.getChildren().filter(isPositionedActiveObject).map(({ x, y }) => ({ x, y }))
        : [];
      const result = executeClassAbility({
        scene: this,
        time,
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        loots: this.loots,
        onEnemyDefeated: (enemy) => {
          this.onEnemyDied(enemy as Enemy);
        },
      });

      if (result) {
        if (result.statDelta) {
          this.stats = applyStatChanges(this.stats, result.statDelta);
          this.emitStats();
        }
        this.lastAbilityUsedAt = time;
        this.projectileTelegraphSnapshot = projectileSnapshot;
        this.game.events.emit(ABILITY_USED, {
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

  private buildBackground() {
    const { width, height } = this.currentLevel;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(0);

    // Decorative vertical stripes (corporate dungeon flavour)
    const stripe = this.isBossLevel ? 0x2d1b3d : 0x16213e;
    for (let x = 0; x < width; x += 160) {
      this.add.rectangle(x, height / 2, 80, height, stripe, 0.3).setDepth(0);
    }
  }

  private buildPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    for (const p of this.currentLevel.platforms) {
      const tile = this.add.tileSprite(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 'platform').setDepth(4);
      this.physics.add.existing(tile, true);
      this.platforms.add(tile);
    }
  }

  private spawnEnemies() {
    this.enemies = this.add.group();
    this.projectiles = this.add.group();

    for (const spawn of this.currentLevel.enemies) {
      const enemy = spawn.type === EnemyType.Spectre
        ? new SpectreEnemy(this, spawn.x, spawn.y, this.projectiles)
        : new Enemy(this, spawn.x, spawn.y, spawn.type);
      this.enemies.add(enemy);
    }

    if (this.currentLevel.boss) {
      this.boss = new Boss(this, this.currentLevel.boss.x, this.currentLevel.boss.y);
      this.enemies.add(this.boss);
    }
  }

  private spawnLoots() {
    this.loots = this.add.group();
    for (const loot of this.currentLevel.loots) {
      const icon = this.add.image(loot.x, loot.y, `loot-${loot.type}`).setDepth(5);
      icon.setData('lootType', loot.type);
      this.physics.add.existing(icon);
      (icon.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      // Floating bob animation
      this.tweens.add({ targets: icon, y: loot.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.loots.add(icon);
    }
  }

  private setupColliders() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);

    // Player touches enemy — contact damage
    this.physics.add.overlap(this.player, this.enemies, (_p, obj) => {
      const enemy = obj as Enemy;
      if (!enemy.active) return;
      const time = this.time.now;
      const { newStats, died, didTakeDamage } = this.player.takeDamage(
        enemy.contactDamage,
        this.stats,
        time,
        enemy.x,
      );
      if (!didTakeDamage) return;
      this.stats = newStats;
      this.cameras.main.shake(250, 0.008);
      this.emitStats();
      this.updateHUD();
      if (died) this.onPlayerDied();
    });

    // Projectile hits player
    this.physics.add.overlap(this.player, this.projectiles, (_p, proj) => {
      const time = this.time.now;
      const projectile = proj as Phaser.GameObjects.GameObject & { x?: number };
      if (this.player.isProjectileImmune(time)) {
        projectile.destroy();
        return;
      }
      const { newStats, died, didTakeDamage } = this.player.takeDamage(8, this.stats, time, projectile.x);
      projectile.destroy();
      if (!didTakeDamage) return;
      this.stats = newStats;
      this.cameras.main.shake(250, 0.008);
      this.emitStats();
      this.updateHUD();
      if (died) this.onPlayerDied();
    });

    // Player collects loot
    this.physics.add.overlap(this.player, this.loots, (_p, loot) => {
      const type = (loot as Phaser.GameObjects.Image).getData('lootType') as LootType;
      const changes = LOOT_STATS[type];
      this.stats = applyStatChanges(this.stats, changes);
      this.emitStats();
      (loot as Phaser.GameObjects.GameObject).destroy();
    });
  }

  private setupHUD() {
    // Minimal in-scene text labels (main HUD is React overlay)
    this.add.text(12, 10,
      this.isBossLevel ? '⚠ BOSS LEVEL' : `LEVEL ${this.levelIndex + 1}`,
      { fontSize: '13px', color: '#e5e7eb', backgroundColor: '#00000066', padding: { x: 6, y: 3 } },
    ).setScrollFactor(0).setDepth(100);

    this.hpText = this.add.text(12, 32,
      `HP: ${this.player?.hp ?? 100}`,
      { fontSize: '12px', color: '#f87171', backgroundColor: '#00000066', padding: { x: 6, y: 3 } },
    ).setScrollFactor(0).setDepth(100);
  }

  private setupAbilityTelegraph() {
    this.abilityTelegraphGraphics = this.add.graphics().setDepth(12);
    this.abilityAura = this.add.rectangle(0, 0, 0, 0, 0x22d3ee, 0.04)
      .setScrollFactor(0)
      .setDepth(90)
      .setVisible(false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.abilityTelegraphGraphics?.destroy();
      this.abilityAura?.destroy();
      this.abilityTelegraphGraphics = null;
      this.abilityAura = null;
    });
  }

  private updateAbilityTelegraph() {
    const telegraph = this.abilityTelegraphGraphics;
    const aura = this.abilityAura;
    if (!telegraph || !aura) {
      return;
    }

    const definition = getAbilityDefinition(this.classId);
    const enemies = this.enemies.getChildren().filter((child): child is Enemy => child instanceof Enemy && child.active);
    const loots = this.loots.getChildren().filter(isPositionedActiveObject);

    telegraph.clear();
    aura.setVisible(false);

    if (!isAbilityTelegraphVisible(this.lastAbilityUsedAt, this.time.now)) {
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

  private showAbilityAura(color: number, alpha: number) {
    if (!this.abilityAura) {
      return;
    }

    this.abilityAura
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setSize(this.scale.width - 24, this.scale.height - 24)
      .setFillStyle(color, alpha)
      .setVisible(true);
  }

  private updateHUD() {
    this.hpText?.setText(`HP: ${this.player.hp}`);
  }

  private emitStats() {
    this.registry.set('stats', { ...this.stats });
    this.game.events.emit(STATS_CHANGED, { ...this.stats });
  }

  private onEnemyDied(enemy: Enemy) {
    if (!enemy.active) return;
    const isBoss = enemy instanceof Boss;
    const kills = this.player.getKillBonus(enemy.enemyType, this.classId);
    const bossBonus = isBoss ? (enemy as Boss).statDrop : {};
    const combined = mergePartials(kills, bossBonus);
    const deathColor = isBoss
      ? 0xef4444
      : (ENEMY_CONFIGS[enemy.enemyType].tint ?? 0xffffff);

    this.stats = applyStatChanges(this.stats, combined);
    this.emitStats();

    if (isBoss) {
      this.bossDefeated = true;
      this.boss = null;
    }

    this.cameras.main.shake(150, 0.005);
    spawnDeathBurst(this, enemy.x, enemy.y, deathColor);
    enemy.die();
    this.enemies.remove(enemy, false, false);
    this.checkWinLose();
  }

  private onPlayerDied() {
    if (this.levelComplete) return;
    this.levelComplete = true;
    const { reason } = checkWinLose(this.stats, this.bossDefeated);
    this.game.events.emit(GAME_OVER, {
      outcome: 'lose',
      stats: this.stats,
      reason: reason ?? 'The project fell apart. Everyone has left the building.',
    });
  }

  private onLevelComplete() {
    if (this.levelComplete) return;
    this.levelComplete = true;

    this.stats = applyStatChanges(this.stats, { deliveryProgress: 10 });
    this.emitStats();
    const nextLevelIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
    this.registry.set('levelIndex', nextLevelIndex);

    this.time.delayedCall(400, () => {
      this.scene.start('GameScene', { levelIndex: nextLevelIndex });
    });
  }

  private checkWinLose() {
    const { outcome, reason } = checkWinLose(this.stats, this.bossDefeated);
    if (!outcome) return;
    if (this.levelComplete) return;
    this.levelComplete = true;
    this.game.events.emit(GAME_OVER, { outcome, stats: this.stats, reason });
  }
}

function mergePartials(a: Partial<RawStats>, b: Partial<RawStats>): Partial<RawStats> {
  const result = { ...a };
  for (const k of Object.keys(b) as (keyof RawStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}

function findNearestTarget<T extends { x: number; y: number }>(
  sourceX: number,
  sourceY: number,
  targets: T[],
): T | null {
  let nearestTarget: T | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const target of targets) {
    const distance = Phaser.Math.Distance.Between(sourceX, sourceY, target.x, target.y);
    if (distance >= nearestDistance) {
      continue;
    }

    nearestTarget = target;
    nearestDistance = distance;
  }

  return nearestTarget;
}

function getEnemyAuraColor(classId: string): number {
  switch (classId) {
    case 'ux':
      return 0xbfdbfe;
    case 'pm':
      return 0xfbbf24;
    default:
      return 0x22d3ee;
  }
}

function isPositionedActiveObject(
  child: unknown,
): child is Phaser.GameObjects.GameObject & { active: boolean; x: number; y: number } {
  return typeof child === 'object'
    && child !== null
    && 'active' in child
    && 'x' in child
    && 'y' in child
    && 'destroy' in child
    && Boolean(child.active);
}
