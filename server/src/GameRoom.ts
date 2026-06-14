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
const ARENA_HEIGHT = 640;
const ENEMY_HALF_HEIGHT = 12; // half of the 24px sprite
// Enemy center y when standing on a platform surface = platform.y - ENEMY_HALF_HEIGHT
const ENEMY_GROUND_Y = 590 - ENEMY_HALF_HEIGHT; // = 578
const ENEMY_SPEED_PX_PER_S = 80;
const GRAVITY = 1200;        // px/s²
const JUMP_VY = -750;        // px/s — enough to clear the 40px gaps
const JUMP_TRIGGER_DIST = 10; // px look-ahead before a gap edge

/** All platforms in the horde arena (x, y = top-left corner, w, h). */
const ARENA_PLATFORMS = [
  // Ground — full width with two narrow gaps
  { x: 0,    y: 590, w: 420, h: 20 },
  { x: 460,  y: 590, w: 360, h: 20 },
  { x: 860,  y: 590, w: 420, h: 20 },
  // Mid tier — left cluster
  { x: 60,   y: 460, w: 180, h: 16 },
  { x: 300,  y: 430, w: 160, h: 16 },
  // Mid tier — centre
  { x: 530,  y: 400, w: 220, h: 16 },
  // Mid tier — right cluster
  { x: 820,  y: 430, w: 160, h: 16 },
  { x: 1040, y: 460, w: 180, h: 16 },
  // High tier — left
  { x: 100,  y: 290, w: 140, h: 16 },
  { x: 310,  y: 270, w: 130, h: 16 },
  // High tier — centre
  { x: 560,  y: 250, w: 160, h: 16 },
  // High tier — right
  { x: 840,  y: 270, w: 130, h: 16 },
  { x: 1040, y: 290, w: 140, h: 16 },
  // Ceiling ledges
  { x: 200,  y: 150, w: 100, h: 16 },
  { x: 590,  y: 130, w: 100, h: 16 },
  { x: 980,  y: 150, w: 100, h: 16 },
];

// Ground segments from hordeArena (platform x range at ground level)
const GROUND_SEGMENTS = [
  { x1: 0,   x2: 420  },
  { x1: 460, x2: 820  },
  { x1: 860, x2: 1280 },
];

function isOnGroundSegment(x: number): boolean {
  return GROUND_SEGMENTS.some(s => x >= s.x1 && x <= s.x2);
}

/**
 * Returns the surface y (top of platform) for any platform the entity is
 * standing on, or null if no platform is below that x position.
 * Used for one-way landing: only when falling downward.
 */
function getPlatformSurfaceY(x: number, currentY: number, prevY: number): number | null {
  const entityBottom = currentY + ENEMY_HALF_HEIGHT;
  const entityPrevBottom = prevY + ENEMY_HALF_HEIGHT;
  let best: number | null = null;
  for (const p of ARENA_PLATFORMS) {
    if (x < p.x || x > p.x + p.w) continue;
    const surfaceY = p.y;
    // One-way: only land when crossing the surface from above
    if (entityPrevBottom <= surfaceY + 2 && entityBottom >= surfaceY) {
      if (best === null || surfaceY > best) best = surfaceY;
    }
  }
  return best;
}
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

  get isEnded(): boolean {
    return this.gameOver;
  }

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
      y: ENEMY_GROUND_Y,
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
    try {
      this._tick();
    } catch (err) {
      console.error('[GameRoom] tick error:', err);
      this.stopLoop();
    }
  }

  private _tick(): void {
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
    const dt = delta / 1000;
    const toRemove: string[] = [];

    for (const enemy of this.enemies.values()) {
      const nearest = playerList.length > 0
        ? playerList.reduce((a, b) =>
            Math.abs(a.x - enemy.x) < Math.abs(b.x - enemy.x) ? a : b,
          )
        : null;

      const dir: 1 | -1 = nearest ? (nearest.x > enemy.x ? 1 : -1) : enemy.direction;
      enemy.direction = dir;

      const vy = enemy.vy ?? 0;
      const onGround = isOnGroundSegment(enemy.x) && Math.abs(enemy.y - ENEMY_GROUND_Y) < 3;

      // Determine if the enemy is resting on ANY platform surface
      const isGrounded = onGround || (vy === 0 && enemy.y < ENEMY_GROUND_Y);

      if (isGrounded && vy >= 0) {
        // Gap detection on ground level: jump over gaps
        if (onGround) {
          const lookX = enemy.x + dir * JUMP_TRIGGER_DIST;
          if (!isOnGroundSegment(lookX)) {
            enemy.vy = JUMP_VY;
          }
        }

        // Jump toward player if player is above this enemy
        if (nearest && nearest.y < enemy.y - 40) {
          enemy.vy = JUMP_VY;
        }
      }

      // Apply gravity and move
      const prevY = enemy.y;
      enemy.vy = (enemy.vy ?? 0) + GRAVITY * dt;
      enemy.x += dir * ENEMY_SPEED_PX_PER_S * dt;
      enemy.y += enemy.vy * dt;

      // Platform collision (one-way: only when falling onto the top surface)
      const surfaceY = getPlatformSurfaceY(enemy.x, enemy.y, prevY);
      if (surfaceY !== null && enemy.vy >= 0) {
        enemy.y = surfaceY - ENEMY_HALF_HEIGHT;
        enemy.vy = 0;
      }

      // Ground collision (fallback for ground-level platforms)
      if (isOnGroundSegment(enemy.x) && enemy.y >= ENEMY_GROUND_Y) {
        enemy.y = ENEMY_GROUND_Y;
        enemy.vy = 0;
      }

      // Remove enemies that fell off the arena
      if (enemy.y > ARENA_HEIGHT + 60) {
        toRemove.push(enemy.id);
        continue;
      }

      enemy.x = Math.max(0, Math.min(ARENA_WIDTH, enemy.x));
    }

    for (const id of toRemove) {
      this.enemies.delete(id);
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
      y: ENEMY_GROUND_Y,
      direction,
      hp,
      maxHp: hp,
      vy: 0,
    });
  }
}
