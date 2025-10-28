const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const GameState = require('./game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

const game = new GameState();

io.on('connection', (socket) => {
  const team = game.assignPlayerToTeam(socket.id);
  socket.emit('init', { team, gameState: game });

  socket.on('action', (data) => {
    if (data.type === 'move') {
      game.moveTroops(game.players[socket.id].team, data.from, data.to, data.count);
    } else if (data.type === 'research') {
      game.research(game.players[socket.id].team, data.tech);
    }
    io.emit('update', game);
  });

  socket.on('chat', (msg) => {
    const team = game.players[socket.id]?.team || 'spectator';
    io.emit('chat', `[${team}] ${msg}`);
  });

  socket.on('disconnect', () => {
    delete game.players[socket.id];
    for (let t in game.teams) {
      game.teams[t] = game.teams[t].filter(id => id !== socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌍 WorldFront запущен на порту ${PORT}`));