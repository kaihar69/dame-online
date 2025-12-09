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
    console.log('Neuer Dame-Spieler: ' + socket.id);

    // Hall of Fame & Status sofort senden
    socket.emit('updateHallOfFame', hallOfFame);
    
    // Prüfen ob voll
    if (activePlayerCount >= 2) {
        socket.emit('spectator', true);
    }

    // --- EREIGNISSE ---

    socket.on('joinGame', (playerName) => {
        if (activePlayerCount >= 2) return;

        activePlayerCount++;
        // Standard bei Dame: Weiß beginnt unten, Schwarz oben
        const assignedColor = activePlayerCount === 1 ? 'white' : 'black';
        
        players[socket.id] = { color: assignedColor, name: playerName };

        socket.emit('player-assignment', { color: assignedColor, name: playerName });
        io.emit('updatePlayerNames', Object.values(players));
    });

    socket.on('playerAction', (data) => {
        // Leitet Züge an alle weiter
        io.emit('updateBoard', data);
    });

    socket.on('reportWin', (winnerColor) => {
        let winnerName = "Unbekannt";
        for (let id in players) {
            if (players[id].color === winnerColor) {
                winnerName = players[id].name;
                break;
            }
        }

        const entry = { 
            name: winnerName, 
            time: new Date().toLocaleTimeString('de-DE', {
                hour: '2-digit', 
                minute:'2-digit', 
                timeZone: 'Europe/Berlin' 
            }) 
        };
        
        hallOfFame.unshift(entry); 
        if (hallOfFame.length > 10) hallOfFame.pop(); 

        io.emit('updateHallOfFame', hallOfFame);
    });

    socket.on('gameStart', (startColor) => {
        io.emit('resetGame', startColor);
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
