import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  socket.emit('connected', { id: socket.id });
});

httpServer.listen(PORT, () => {
  console.log(`Gamez server listening on http://localhost:${PORT}`);
});
