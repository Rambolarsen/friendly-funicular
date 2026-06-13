import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';
import { GameRoom } from './GameRoom';
import { EnemyDiedPayload, GameOverPayload, RoomInfo, StatePayload } from './types';

export class LobbyManager {
  private rooms = new Map<string, GameRoom>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(): GameRoom {
    const id = uuid().slice(0, 8);
    const room = new GameRoom(
      id,
      (state: StatePayload) => this.io.to(id).emit('state', state),
      (payload: GameOverPayload) => this.io.to(id).emit('game_over', payload),
      (payload: EnemyDiedPayload) => this.io.to(id).emit('enemy_died', payload),
    );
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  getOrCreate(id: string | null): GameRoom {
    if (id && this.rooms.has(id)) {
      const existing = this.rooms.get(id)!;
      if (!existing.isEnded) {
        return existing;
      }
    }
    return this.createRoom();
  }

  removePlayerFromAllRooms(socketId: string): void {
    for (const [id, room] of this.rooms) {
      if (room.players.has(socketId)) {
        room.removePlayer(socketId);
        this.io.to(id).emit('player_left', { id: socketId });
        if (room.isEmpty()) {
          setTimeout(() => {
            if (room.isEmpty()) {
              this.rooms.delete(id);
            }
          }, 60_000);
        }
      }
    }
  }

  getLobbyInfo(): RoomInfo[] {
    return Array.from(this.rooms.values())
      .filter((room) => !room.isEmpty() && !room.isEnded)
      .map((room) => ({
        id: room.id,
        playerCount: room.players.size,
        timeSurvived: room.getTimeSurvived(),
      }));
  }
}
