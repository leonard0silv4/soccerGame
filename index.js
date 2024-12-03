const express = require('express');
require('dotenv').config()

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const rooms = {}; 

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  // jogador entra no jogo
  socket.on('joinGame', () => {
    console.log('Jogador entrou no jogo:', socket.id);

    let room = Object.keys(rooms).find((key) => rooms[key].players.length === 1); // acha uma sala com apenas um jogador

    if (!room) {
      room = `room-${Date.now()}`; // cria uma nova sala nova se não houver uma sala com 1 jogador
      rooms[room] = { players: [], answers: {} };
    }

    rooms[room].players.push(socket.id); // adiciona o jogador a sala
    socket.join(room);

    io.to(room).emit('playerCount', rooms[room].players.length);

    // quando 2 jogadores entram inicia o jogo
    if (rooms[room].players.length === 2) {
      const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // gera uma letra random
      console.log(`Sala ${room} iniciando jogo com a letra ${letter}`);
      io.to(room).emit('startGame', { letter, room });
    }

    setRoom(socket, room); 
  });

  //um jogador envia sua resposta
  socket.on('sendAnswer', (room, answer) => {
    const correctAnswer = 'ABC'; // resposta correta para o jogo

    // guarda a resposta do jogador
    rooms[room].answers[socket.id] = { answer, correctAnswer };

    // se ambos os jogadores responderam
    if (Object.keys(rooms[room].answers).length === 2) {
      const results = {};
      rooms[room].players.forEach(playerId => {
        const playerAnswer = rooms[room].answers[playerId];
        const result = playerAnswer.answer === playerAnswer.correctAnswer ? 'Você ganhou!' : 'Você perdeu!';
        results[playerId] = result;
      });

      // envia o resultado para os jogadores
      rooms[room].players.forEach(playerId => {
        io.to(playerId).emit('gameResult', results[playerId]);
      });

      // limpa as respostas para proxima partida
      rooms[room].answers = {};
    }
  });

  socket.on('disconnect', () => {
    for (let room in rooms) {
      const index = rooms[room].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[room].players.splice(index, 1); // remove o jogador da sala
        io.to(room).emit('playerCount', rooms[room].players.length);
        if (rooms[room].players.length === 0) {
          delete rooms[room]; // apaga a sala se nao tem mais jogadores
        }
        break;
      }
    }
  });
});

function setRoom(socket, room) {
  socket.room = room;
}

server.listen(3001, () => {
  console.log('Servidor rodando na porta 3001');
});
