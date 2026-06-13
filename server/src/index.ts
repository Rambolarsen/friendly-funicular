import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { LobbyManager } from './LobbyManager';
import { AttackEnemyPayload, JoinRoomPayload, PlayerUpdatePayload } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

const lobby = new LobbyManager(io);

setInterval(() => {
  io.emit('lobby_update', { rooms: lobby.getLobbyInfo() });
}, 3000);

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.emit('lobby_update', { rooms: lobby.getLobbyInfo() });

  socket.on('join_room', (payload: JoinRoomPayload) => {
    const { roomId, classId, name } = payload;
    const room = lobby.getOrCreate(roomId);

    room.addPlayer(socket.id, name, classId);
    socket.join(room.id);

    socket.to(room.id).emit('player_joined', {
      id: socket.id,
      classId,
      name,
    });

    socket.emit('room_joined', {
      roomId: room.id,
      playerId: socket.id,
      state: {
        players: Array.from(room.players.values()),
        enemies: Array.from(room.enemies.values()),
        enemyCount: room.enemies.size,
      },
    });
  });

  socket.on('player_update', (payload: PlayerUpdatePayload) => {
    for (const room of [...io.sockets.adapter.rooms.keys()]) {
      const gameRoom = lobby.getRoom(room);
      if (gameRoom?.players.has(socket.id)) {
        gameRoom.updatePlayer(socket.id, payload);
        break;
      }
    }
  });

  socket.on('attack_enemy', (payload: AttackEnemyPayload) => {
    for (const room of [...io.sockets.adapter.rooms.keys()]) {
      const gameRoom = lobby.getRoom(room);
      if (gameRoom?.players.has(socket.id)) {
        gameRoom.hitEnemy(payload.enemyId, payload.damage, socket.id);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);
    lobby.removePlayerFromAllRooms(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
