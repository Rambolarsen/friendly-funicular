import Phaser from 'phaser';
import { GameStats } from '../../types/game';
import { applyStatChanges, checkWinLose } from '../../engine/gameEngine';
import { GAME_OVER, STATS_CHANGED } from '../eventKeys';
import { Player } from '../entities/Player';
import { Enemy, SpectreEnemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { EnemyType, LevelData } from '../levels/types';
import { level1 } from '../levels/level1';
import { bossLevel } from '../levels/bossLevel';

const PLAYER_ATTACK_DAMAGE = 25;
const LOOT_STATS: Record<string, Partial<GameStats>> = {
  budget: { budget: 15 },
  morale: { teamMorale: 12 },
  debt:   { technicalDebt: -15 },
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private loots!: Phaser.GameObjects.Group;
  private boss: Boss | null = null;

  private stats!: GameStats;
  private classId!: string;
  private isBossLevel = false;
  private bossDefeated = false;
  private levelComplete = false;

  private currentLevel!: LevelData;

  // UI
  private hpText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { bossLevel?: boolean }) {
    this.isBossLevel = data?.bossLevel ?? false;
    this.bossDefeated = false;
    this.levelComplete = false;
  }

  create() {
    this.stats = { ...(this.registry.get('stats') as GameStats) };
    this.classId = this.registry.get('selectedClass')?.id ?? 'developer';

    this.currentLevel = this.isBossLevel ? bossLevel : level1;

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
    this.emitStats(); // initial HUD sync
  }

  update(time: number) {
    if (this.levelComplete) return;

    this.player.update(time);

    // Attack hits enemies
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      const bounds = new Phaser.Geom.Rectangle(
        enemy.x - enemy.displayWidth / 2,
        enemy.y - enemy.displayHeight / 2,
        enemy.displayWidth,
        enemy.displayHeight,
      );
      if (this.player.isAttackHitting(bounds)) {
        const died = enemy.takeDamage(PLAYER_ATTACK_DAMAGE);
        if (died) this.onEnemyDied(enemy as Enemy);
      }
    }

    // Spectre shooting
    for (const obj of this.enemies.getChildren()) {
      if (obj instanceof SpectreEnemy && obj.active) {
        obj.shoot(this.player.x, this.player.y, time);
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
      const { newStats, died } = this.player.takeDamage(enemy.contactDamage, this.stats, time);
      this.stats = newStats;
      this.emitStats();
      this.updateHUD();
      if (died) this.onPlayerDied();
    });

    // Projectile hits player
    this.physics.add.overlap(this.player, this.projectiles, (_p, proj) => {
      const time = this.time.now;
      const { newStats, died } = this.player.takeDamage(8, this.stats, time);
      this.stats = newStats;
      this.emitStats();
      this.updateHUD();
      (proj as Phaser.GameObjects.GameObject).destroy();
      if (died) this.onPlayerDied();
    });

    // Player collects loot
    this.physics.add.overlap(this.player, this.loots, (_p, loot) => {
      const type = (loot as Phaser.GameObjects.Image).getData('lootType') as string;
      const changes = LOOT_STATS[type] ?? {};
      this.stats = applyStatChanges(this.stats, changes);
      this.emitStats();
      (loot as Phaser.GameObjects.GameObject).destroy();
    });
  }

  private setupHUD() {
    // Minimal in-scene text labels (main HUD is React overlay)
    this.add.text(12, 10,
      this.isBossLevel ? '⚠ BOSS LEVEL' : 'LEVEL 1',
      { fontSize: '13px', color: '#e5e7eb', backgroundColor: '#00000066', padding: { x: 6, y: 3 } },
    ).setScrollFactor(0).setDepth(100);

    this.hpText = this.add.text(12, 32,
      `HP: ${this.player?.hp ?? 100}`,
      { fontSize: '12px', color: '#f87171', backgroundColor: '#00000066', padding: { x: 6, y: 3 } },
    ).setScrollFactor(0).setDepth(100);
  }

  private updateHUD() {
    this.hpText?.setText(`HP: ${this.player.hp}`);
  }

  private emitStats() {
    this.registry.set('stats', { ...this.stats });
    this.game.events.emit(STATS_CHANGED, { ...this.stats });
  }

  private onEnemyDied(enemy: Enemy) {
    const isBoss = enemy instanceof Boss;
    const kills = this.player.getKillBonus(enemy.enemyType, this.classId);
    const bossBonus = isBoss ? (enemy as Boss).statDrop : {};
    const combined = mergePartials(kills, bossBonus);

    this.stats = applyStatChanges(this.stats, combined);
    this.emitStats();

    if (isBoss) {
      this.bossDefeated = true;
      this.boss = null;
    }

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
    this.registry.set('stats', this.stats);

    this.time.delayedCall(400, () => {
      this.scene.start('GameScene', { bossLevel: true });
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

function mergePartials(a: Partial<GameStats>, b: Partial<GameStats>): Partial<GameStats> {
  const result = { ...a };
  for (const k of Object.keys(b) as (keyof GameStats)[]) {
    result[k] = ((result[k] ?? 0) + (b[k] ?? 0)) as number;
  }
  return result;
}
