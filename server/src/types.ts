// Inline RawStats to avoid cross-package import complexity
export interface RawStats {
  budget: number;
  clientHappiness: number;
  technicalDebt: number;
  teamMorale: number;
  deliveryProgress: number;
  complianceRisk: number;
}

export interface PlayerState {
  id: string;
  name: string;
  classId: string;
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: RawStats;
  attackQuote?: string;
}

export type EnemyType = 'goblin' | 'wraith' | 'troll' | 'spectre' | 'brute' | 'boss';

export interface EnemyState {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  direction: 1 | -1;
  hp: number;
  maxHp: number;
  vy?: number; // server-internal: vertical velocity
}

export interface RoomInfo {
  id: string;
  playerCount: number;
  timeSurvived: number; // seconds
}

// ── Client → Server payloads ──────────────────────────────────────────────────

export interface JoinRoomPayload {
  roomId: string | null; // null = create new room
  classId: string;
  name: string;
}

export interface PlayerUpdatePayload {
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: RawStats;
  attackQuote?: string;
}

export interface AttackEnemyPayload {
  enemyId: string;
  damage: number;
}

// ── Server → Client payloads ──────────────────────────────────────────────────

export interface StatePayload {
  players: PlayerState[];
  enemies: EnemyState[];
  enemyCount: number;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
  state: StatePayload;
}

export interface GameOverPayload {
  reason: 'overrun';
  playerStats: { id: string; name: string; classId: string; stats: RawStats }[];
}

export interface LobbyUpdatePayload {
  rooms: RoomInfo[];
}

export interface EnemyDiedPayload {
  enemyId: string;
  killerId: string;
}
