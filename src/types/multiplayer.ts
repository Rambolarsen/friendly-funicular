// Mirror of server/src/types.ts for client-side use.
// Update both files together when the protocol changes.

export interface MultiplayerRawStats {
  budget: number;
  clientHappiness: number;
  technicalDebt: number;
  teamMorale: number;
  deliveryProgress: number;
  complianceRisk: number;
}

export interface MultiplayerPlayerState {
  id: string;
  name: string;
  classId: string;
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: MultiplayerRawStats;
}

export type MultiplayerEnemyType = 'goblin' | 'wraith' | 'troll' | 'spectre' | 'brute' | 'boss';

export interface MultiplayerEnemyState {
  id: string;
  type: MultiplayerEnemyType;
  x: number;
  y: number;
  direction: 1 | -1;
  hp: number;
  maxHp: number;
}

export interface MultiplayerRoomInfo {
  id: string;
  playerCount: number;
  timeSurvived: number;
}

export interface JoinRoomPayload {
  roomId: string | null;
  classId: string;
  name: string;
}

export interface PlayerUpdatePayload {
  x: number;
  y: number;
  flipX: boolean;
  animKey: string;
  hp: number;
  stats: MultiplayerRawStats;
}

export interface AttackEnemyPayload {
  enemyId: string;
  damage: number;
}

export interface StatePayload {
  players: MultiplayerPlayerState[];
  enemies: MultiplayerEnemyState[];
  enemyCount: number;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
  state: StatePayload;
}

export interface MultiplayerGameOverPayload {
  reason: 'overrun';
  playerStats: { id: string; name: string; classId: string; stats: MultiplayerRawStats }[];
}

export interface LobbyUpdatePayload {
  rooms: MultiplayerRoomInfo[];
}

export interface EnemyDiedPayload {
  enemyId: string;
  killerId: string;
}
