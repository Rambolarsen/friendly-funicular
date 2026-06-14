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
import { SocketClient } from '../network/SocketClient';
import { RemotePlayer } from '../entities/RemotePlayer';
import { RemoteEnemy } from '../entities/RemoteEnemy';
import { hordeArena } from '../levels/hordeArena';
import type { StatePayload, MultiplayerGameOverPayload } from '../../types/multiplayer';
import { soundManager } from '../sound';

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

  // Multiplayer
  private isMultiplayer = false;
  private socketClient: SocketClient | null = null;
  private roomId: string | null = null;
  private remotePlayers = new Map<string, RemotePlayer>();
  private remoteEnemies = new Map<string, RemoteEnemy>();
  private enemyCountText: Phaser.GameObjects.Text | null = null;
  private positionUpdateTimer = 0;
  private readonly POSITION_UPDATE_INTERVAL = 50; // ms
  private socketCleanups: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: {
    levelIndex?: number;
    bossLevel?: boolean;
    multiplayer?: boolean;
    socketClient?: SocketClient;
    roomId?: string;
  }) {
    const storedLevelIndex = this.registry.get('levelIndex');
    this.levelIndex = data?.levelIndex
      ?? (typeof storedLevelIndex === 'number' ? storedLevelIndex : 0);
    this.isBossLevel = data?.bossLevel ?? (this.levelIndex === LEVELS.length - 1);
    this.bossDefeated = false;
    this.levelComplete = false;
    this.isMultiplayer = data?.multiplayer ?? false;
    this.socketClient = data?.socketClient ?? null;
    this.roomId = data?.roomId ?? null;
    this.registry.set('roomId', this.roomId);
    this.remotePlayers.clear();
    this.remoteEnemies.clear();
    this.enemyCountText = null;
    this.positionUpdateTimer = 0;
    this.socketCleanups = [];
    this.lastAbilityUsedAt = null;
    this.projectileTelegraphSnapshot = [];
  }

  create() {
    this.stats = GameStatsVO.from(this.registry.get('stats') as RawStats).toPlain();
    this.classId = this.registry.get('selectedClass')?.id ?? 'developer';
    const multiSocket = this.registry.get('multiplayerSocket') as SocketClient | undefined;
    const multiRoomId = this.registry.get('multiplayerRoomId') as string | undefined;
    if (multiSocket && multiRoomId) {
      this.isMultiplayer = true;
      this.socketClient = multiSocket;
      this.roomId = multiRoomId;
    }

    this.currentLevel = this.isMultiplayer ? hordeArena : (LEVELS[this.levelIndex] ?? LEVELS[0]);

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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.game.events.emit(LEVEL_STARTED);
    this.emitStats(); // initial HUD sync

    if (this.isMultiplayer) {
      this.setupMultiplayer();
    }
    soundManager.startBgm();
  }

  update(time: number) {
    if (this.levelComplete) return;

    this.player.update(time);

    // Ability key — runs in both solo and multiplayer
    if (Phaser.Input.Keyboard.JustDown(this.abilityKey)) {
      const projectileSnapshot = this.classId === 'security'
        ? this.projectiles.getChildren().filter(isPositionedActiveObject).map(({ x, y }) => ({ x, y }))
        : [];
      const result = executeClassAbility({
        scene: this,
        time,
        player: this.player,
        enemies: this.enemies,      // empty in multiplayer; enemy effects won't fire
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
        this.game.events.emit(ABILITY_USED, { name: result.name, cooldownMs: result.cooldownMs });
        this.checkWinLose();
      }
    }

    if (this.isMultiplayer) {
      // Send position to server
      this.positionUpdateTimer += this.sys.game.loop.delta;
      if (this.positionUpdateTimer >= this.POSITION_UPDATE_INTERVAL) {
        this.positionUpdateTimer = 0;
        this.socketClient!.sendPlayerUpdate({
          x: this.player.x,
          y: this.player.y,
          flipX: this.player.flipX,
          animKey: (this.player as unknown as { currentAnimKey?: string }).currentAnimKey ?? 'player-idle',
          hp: this.player.hp,
          stats: this.stats,
          attackQuote: this.player.pendingQuote,
        });
        this.player.pendingQuote = undefined;
      }

      // Attack against RemoteEnemies
      for (const [enemyId, re] of this.remoteEnemies) {
        if (this.player.isAttackHitting(re)) {
          re.flash();
          this.socketClient!.attackEnemy({ enemyId, damage: this.player.getAttackDamage() });
        }
      }

      // Contact damage from RemoteEnemies (no physics body — manual proximity check)
      const REMOTE_CONTACT_DAMAGE: Record<string, number> = {
        goblin: 10, wraith: 8, troll: 15, brute: 15, spectre: 5, boss: 25,
      };
      for (const re of this.remoteEnemies.values()) {
        const threshold = (this.player.displayWidth + re.displayWidth) / 2 - 4;
        const dx = this.player.x - re.x;
        const dy = this.player.y - re.y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          const dmg = REMOTE_CONTACT_DAMAGE[re.enemyType] ?? 10;
          const { newStats, died, didTakeDamage } = this.player.takeDamage(dmg, this.stats, time, re.x);
          if (didTakeDamage) {
            soundManager.playerHurt();
            this.stats = newStats;
            this.cameras.main.shake(250, 0.008);
            this.emitStats();
            this.updateHUD();
            if (died) this.onPlayerDied();
          }
        }
      }

      // Fall-off detection in multiplayer: respawn at start with HP penalty
      if (this.player.y > this.currentLevel.height + 50) {
        const { x, y } = this.currentLevel.playerStart;
        this.player.setPosition(x, y);
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.player.hp = Math.max(1, this.player.hp - 25);
        this.player.grantInvincibility(time);
        soundManager.playerHurt();
        this.updateHUD();
      }

      return; // skip local enemy logic in multiplayer
    }
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
        const died = enemy.takeDamage(this.player.getAttackDamage(), this.player.x);
        if (died) this.onEnemyDied(enemy as Enemy);
      }
    }

    // Spectre shooting
    for (const obj of this.enemies.getChildren()) {
      if (obj instanceof SpectreEnemy && obj.active) {
        obj.shoot(this.player.x, this.player.y, time);
      }
    }

    // Enemy jump AI: gap detection + vertical player chase
    this.applyEnemyJumpAI();

    // Exit trigger
    if (!this.isBossLevel && this.player.x >= this.currentLevel.exitX) {
      this.onLevelComplete();
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private readonly ENEMY_JUMP_VY = -750;
  private readonly ENEMY_LOOK_AHEAD_PX = 14;

  /** Returns true if any platform body covers the given point. */
  private hasPlatformAt(x: number, y: number): boolean {
    for (const child of this.platforms.getChildren()) {
      const body = (child as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
      if (x >= body.left && x <= body.right && y >= body.top && y <= body.bottom) return true;
    }
    return false;
  }

  /**
   * Gap detection + vertical chase for solo-mode enemies.
   * Called once per update after patrol() has set velocityX.
   */
  private applyEnemyJumpAI(): void {
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      if (!body.blocked.down) continue;

      const dir = enemy.facingDirection;
      const feetY = enemy.y + 13; // 1px below enemy feet
      const lookX = enemy.x + dir * this.ENEMY_LOOK_AHEAD_PX;

      // Jump over gaps: if no platform just below the look-ahead point, jump
      if (!this.hasPlatformAt(lookX, feetY)) {
        enemy.tryJump(this.ENEMY_JUMP_VY);
        continue;
      }

      // Vertical chase: jump if player is above and within reachable height
      const dy = enemy.y - this.player.y;
      if (dy > 50 && dy < 160) {
        enemy.tryJump(this.ENEMY_JUMP_VY);
      }
    }
  }

  private buildBackground() {
    const { width, height } = this.currentLevel;
    if (this.textures.exists('dungeon-bg') && this.isMultiplayer) {
      // Tile the dungeon background for the compact arena
      this.add.image(width / 2, height / 2, 'dungeon-bg').setDepth(0);
    } else {
      // Existing gradient background for solo levels
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(0);
      const stripe = this.isBossLevel ? 0x2d1b3d : 0x16213e;
      for (let x = 0; x < width; x += 160) {
        this.add.rectangle(x, height / 2, 80, height, stripe, 0.3).setDepth(0);
      }
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
    // One-way platforms: only collide when the body is falling onto the top surface.
    // This lets players and enemies jump through from below.
    const oneWay = (obj: Phaser.Types.Physics.Arcade.GameObjectWithBody, platform: Phaser.Types.Physics.Arcade.GameObjectWithBody) => {
      const body = obj.body as Phaser.Physics.Arcade.Body;
      const platBody = platform.body as Phaser.Physics.Arcade.StaticBody;
      return body.velocity.y >= 0 && body.bottom - body.velocity.y * (1 / 60) <= platBody.top + 4;
    };
    this.physics.add.collider(this.player, this.platforms, undefined, oneWay as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, this);
    this.physics.add.collider(this.enemies, this.platforms, undefined, oneWay as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, this);

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
      soundManager.playerHurt();
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
      soundManager.playerHurt();
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
      soundManager.lootPickup();
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

  private setupMultiplayer(): void {
    const sc = this.socketClient!;

    // Enemy count HUD
    this.enemyCountText = this.add.text(this.scale.width / 2, 10,
      'Enemies: 0 / 20',
      { fontSize: '13px', color: '#f87171', backgroundColor: '#00000088', padding: { x: 6, y: 3 } },
    ).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);

    // Apply server state tick
    const offState = sc.onState((payload: StatePayload) => {
      this.applyServerState(payload);
    });

    // Remote player joins
    const offJoined = sc.onPlayerJoined(({ id, classId, name }) => {
      if (!this.remotePlayers.has(id)) {
        const rp = new RemotePlayer(this, {
          id,
          name,
          classId,
          x: 100,
          y: 500,
          flipX: false,
          animKey: 'player-idle',
          hp: 100,
          stats: {} as never,
        });
        this.remotePlayers.set(id, rp);
      }
    });

    // Remote player leaves
    const offLeft = sc.onPlayerLeft(({ id }) => {
      this.remotePlayers.get(id)?.destroy();
      this.remotePlayers.delete(id);
    });

    // Enemy killed confirmation
    const offEnemyDied = sc.onEnemyDied(({ enemyId }) => {
      this.remoteEnemies.get(enemyId)?.destroy();
      this.remoteEnemies.delete(enemyId);
    });

    // Game over
    const offGameOver = sc.onGameOver((payload: MultiplayerGameOverPayload) => {
      this.game.events.emit(GAME_OVER, {
        outcome: 'lose',
        stats: this.stats,
        reason: 'The team was overrun. 20 enemies on site.',
        multiplayerResult: payload,
      });
    });

    this.socketCleanups = [offState, offJoined, offLeft, offEnemyDied, offGameOver];
  }

  private applyServerState(payload: StatePayload): void {
    const sc = this.socketClient!;

    // Update enemy count HUD
    this.enemyCountText?.setText(`Enemies: ${payload.enemyCount} / 20`);

    // Sync remote players (skip own socket id)
    const myId = sc.id;
    for (const ps of payload.players) {
      if (ps.id === myId) continue;
      let rp = this.remotePlayers.get(ps.id);
      if (!rp) {
        rp = new RemotePlayer(this, ps);
        this.remotePlayers.set(ps.id, rp);
      }
      rp.applyState(ps);
      if (ps.attackQuote) rp.showQuote(ps.attackQuote);
    }

    // Sync remote enemies
    const seen = new Set<string>();
    for (const es of payload.enemies) {
      seen.add(es.id);
      let re = this.remoteEnemies.get(es.id);
      if (!re) {
        re = new RemoteEnemy(this, es);
        this.remoteEnemies.set(es.id, re);
      }
      re.applyState(es);
    }
    // Remove enemies no longer in server state
    for (const [id, re] of this.remoteEnemies) {
      if (!seen.has(id)) { re.destroy(); this.remoteEnemies.delete(id); }
    }
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
      soundManager.bossDeath();
    } else {
      soundManager.enemyDeath();
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
    soundManager.stopBgm();
    soundManager.gameOver();
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
    soundManager.levelComplete();

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
    soundManager.stopBgm();
    if (outcome === 'win') {
      soundManager.win();
    } else {
      soundManager.gameOver();
    }
    this.game.events.emit(GAME_OVER, { outcome, stats: this.stats, reason });
  }

  shutdown(): void {
    this.socketCleanups.forEach((fn) => fn());
    this.socketCleanups = [];
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
