import { io, Socket } from 'socket.io-client';
import type {
  AttackEnemyPayload,
  JoinRoomPayload,
  LobbyUpdatePayload,
  MultiplayerGameOverPayload,
  PlayerUpdatePayload,
  RoomJoinedPayload,
  StatePayload,
} from '../../types/multiplayer';

export type {
  RoomJoinedPayload,
  StatePayload,
  MultiplayerGameOverPayload as GameOverPayload,
  LobbyUpdatePayload,
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let instance: SocketClient | null = null;

export class SocketClient {
  private socket: Socket;

  private constructor() {
    this.socket = io(SERVER_URL, { autoConnect: true });
  }

  static getInstance(): SocketClient {
    if (!instance) {
      instance = new SocketClient();
    }

    return instance;
  }

  static reset(): void {
    instance?.socket.disconnect();
    instance = null;
  }

  joinRoom(payload: JoinRoomPayload): void {
    this.socket.emit('join_room', payload);
  }

  sendPlayerUpdate(payload: PlayerUpdatePayload): void {
    this.socket.emit('player_update', payload);
  }

  attackEnemy(payload: AttackEnemyPayload): void {
    this.socket.emit('attack_enemy', payload);
  }

  onLobbyUpdate(cb: (p: LobbyUpdatePayload) => void): () => void {
    this.socket.on('lobby_update', cb);
    return () => this.socket.off('lobby_update', cb);
  }

  onRoomJoined(cb: (p: RoomJoinedPayload) => void): () => void {
    this.socket.on('room_joined', cb);
    return () => this.socket.off('room_joined', cb);
  }

  onState(cb: (p: StatePayload) => void): () => void {
    this.socket.on('state', cb);
    return () => this.socket.off('state', cb);
  }

  onGameOver(cb: (p: MultiplayerGameOverPayload) => void): () => void {
    this.socket.on('game_over', cb);
    return () => this.socket.off('game_over', cb);
  }

  onPlayerJoined(cb: (p: { id: string; classId: string; name: string }) => void): () => void {
    this.socket.on('player_joined', cb);
    return () => this.socket.off('player_joined', cb);
  }

  onPlayerLeft(cb: (p: { id: string }) => void): () => void {
    this.socket.on('player_left', cb);
    return () => this.socket.off('player_left', cb);
  }

  onEnemyDied(cb: (p: { enemyId: string; killerId: string }) => void): () => void {
    this.socket.on('enemy_died', cb);
    return () => this.socket.off('enemy_died', cb);
  }

  get id(): string {
    return this.socket.id ?? '';
  }
}
