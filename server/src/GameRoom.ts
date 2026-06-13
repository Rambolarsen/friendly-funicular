import { v4 as uuid } from 'uuid';
import {
  EnemyState,
  EnemyType,
  PlayerState,
  PlayerUpdatePayload,
  RawStats,
  StatePayload,
  GameOverPayload,
  EnemyDiedPayload,
} from './types';
import { HordeSpawner, SpawnType } from './HordeSpawner';

const ARENA_WIDTH = 1280;
const GROUND_Y = 560;
const ENEMY_SPEED_PX_PER_S = 80;
const OVERRUN_THRESHOLD = 20;
const TICK_MS = 50; // 20fps

const INITIAL_STATS: RawStats = {
  budget: 50,
  clientHappiness: 50,
  technicalDebt: 30,
  teamMorale: 50,
  deliveryProgress: 0,
  complianceRisk: 20,
};

function enemyHp(type: SpawnType): number {
  if (type === 'boss') return 300;
  if (type === 'brute') return 120;
  return 40;
}

function regularEnemyType(ageMs: number): EnemyType {
  if (ageMs > 120_000) return 'spectre';
  if (ageMs > 60_000) return 'wraith';
  return 'goblin';
}

export class GameRoom {
  readonly id: string;
  players = new Map<string, PlayerState>();
  enemies = new Map<string, EnemyState>();
  readonly createdAt = Date.now();

  private spawner = new HordeSpawner();
  private bossAlive = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private gameOver = false;

  private onTick: (payload: StatePayload) => void;
  private onGameOver: (payload: GameOverPayload) => void;
  private onEnemyDied: (payload: EnemyDiedPayload) => void;

  constructor(
    id: string,
    onTick: (p: StatePayload) => void,
    onGameOver: (p: GameOverPayload) => void,
    onEnemyDied: (p: EnemyDiedPayload) => void,
  ) {
    this.id = id;
    this.onTick = onTick;
    this.onGameOver = onGameOver;
    this.onEnemyDied = onEnemyDied;
  }

  addPlayer(socketId: string, name: string, classId: string): void {
    this.players.set(socketId, {
      id: socketId,
      name,
      classId,
      x: 100,
      y: GROUND_Y,
      flipX: false,
      animKey: 'player-idle',
      hp: 100,
      stats: { ...INITIAL_STATS },
    });

    if (!this.tickInterval && !this.gameOver) {
      this.startLoop();
    }
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    if (this.players.size === 0) {
      this.stopLoop();
    }
  }

  updatePlayer(socketId: string, data: PlayerUpdatePayload): void {
    const player = this.players.get(socketId);
    if (player) {
      Object.assign(player, data);
    }
  }

  /** Returns true if enemy was killed. */
  hitEnemy(enemyId: string, damage: number, killerId: string): boolean {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) {
      return false;
    }

    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      if (enemy.type === 'boss') {
        this.bossAlive = false;
      }
      this.enemies.delete(enemyId);
      this.onEnemyDied({ enemyId, killerId });
      return true;
    }

    return false;
  }

  getTimeSurvived(): number {
    return Math.floor((Date.now() - this.createdAt) / 1000);
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  private startLoop(): void {
    this.lastTick = Date.now();
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private stopLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    this.moveEnemies(delta);
    this.spawner.tick(delta, this.bossAlive, (type) => this.spawnEnemy(type));

    if (this.enemies.size >= OVERRUN_THRESHOLD) {
      this.stopLoop();
      this.gameOver = true;
      this.onGameOver({
        reason: 'overrun',
        playerStats: Array.from(this.players.values()).map((player) => ({
          id: player.id,
          name: player.name,
          classId: player.classId,
          stats: player.stats,
        })),
      });
      return;
    }

    this.onTick({
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      enemyCount: this.enemies.size,
    });
  }

  private moveEnemies(delta: number): void {
    const playerList = Array.from(this.players.values());
    if (playerList.length === 0) {
      return;
    }

    for (const enemy of this.enemies.values()) {
      const nearest = playerList.reduce((a, b) =>
        Math.abs(a.x - enemy.x) < Math.abs(b.x - enemy.x) ? a : b,
      );
      const dir: 1 | -1 = nearest.x > enemy.x ? 1 : -1;
      enemy.direction = dir;
      enemy.x += dir * ENEMY_SPEED_PX_PER_S * (delta / 1000);
      enemy.x = Math.max(0, Math.min(ARENA_WIDTH, enemy.x));
    }
  }

  private spawnEnemy(type: SpawnType): void {
    if (this.enemies.size >= OVERRUN_THRESHOLD) {
      return;
    }

    const side = Math.random() > 0.5;
    const x = side ? ARENA_WIDTH + 20 : -20;
    const direction: 1 | -1 = side ? -1 : 1;
    const hp = enemyHp(type);
    const enemyType: EnemyType =
      type === 'boss'
        ? 'boss'
        : type === 'brute'
          ? 'troll'
          : regularEnemyType(Date.now() - this.createdAt);

    if (type === 'boss') {
      this.bossAlive = true;
    }

    const id = uuid();
    this.enemies.set(id, {
      id,
      type: enemyType,
      x,
      y: GROUND_Y,
      direction,
      hp,
      maxHp: hp,
    });
  }
}
