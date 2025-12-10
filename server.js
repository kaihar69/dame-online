const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// --- SPEICHER ---
let players = {}; 
let hallOfFame = []; 
let activePlayerCount = 0;

io.on('connection', (socket) => {
    console.log('Verbindung: ' + socket.id);

    // HoF senden
    socket.emit('updateHallOfFame', hallOfFame);
    
    // Wenn voll -> Zuschauer
    if (activePlayerCount >= 2) {
        socket.emit('spectator', true);
    }

    // --- EREIGNISSE ---

    socket.on('joinGame', (playerName) => {
        // Reset check: Wenn schon 2 da sind, abweisen
        if (activePlayerCount >= 2) return;

        activePlayerCount++;
        // Erster ist Weiß, Zweiter ist Schwarz
        const assignedColor = activePlayerCount === 1 ? 'white' : 'black';
        
        players[socket.id] = { color: assignedColor, name: playerName };

        // 1. Dem Spieler seine Rolle geben
        socket.emit('player-assignment', { color: assignedColor, name: playerName });
        
        // 2. Allen sagen, wer da ist
        io.emit('updatePlayerNames', Object.values(players));

        // 3. Wenn jetzt genau 2 Spieler da sind -> Startsignal für ALLE
        if (activePlayerCount === 2) {
            io.emit('gameStart', 'white'); // Weiß beginnt immer
        }
    });

    socket.on('playerAction', (data) => {
        io.emit('updateBoard', data);
    });

    socket.on('reportWin', (data) => {
        const entry = { 
            name: data.name, 
            time: new Date().toLocaleTimeString('de-DE', {
                hour: '2-digit', minute:'2-digit', timeZone: 'Europe/Berlin' 
            }) 
        };
        hallOfFame.unshift(entry); 
        if (hallOfFame.length > 10) hallOfFame.pop(); 
        io.emit('updateHallOfFame', hallOfFame);
    });

    // Manueller Neustart-Wunsch
    socket.on('requestRestart', () => {
        io.emit('gameStart', 'white');
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            activePlayerCount--;
            delete players[socket.id];
            io.emit('updatePlayerNames', Object.values(players)); 
            io.emit('opponentLeft');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Dame-Server läuft auf Port ${PORT}`);
});
