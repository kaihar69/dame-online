const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Bereitstellen der HTML-Dateien im Ordner 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Speicher für die Spieler
let players = {}; // Speichert: { socketId: 'white' oder 'black' }
let activePlayerCount = 0;

io.on('connection', (socket) => {
    console.log('Ein neuer Spieler hat sich verbunden: ' + socket.id);

    // Wenn schon 2 Spieler da sind, müssen wir den neuen abweisen oder zum Zuschauer machen
    if (activePlayerCount >= 2) {
        socket.emit('spectator', true); // Sagen wir ihm, er darf nur zugucken
    } else {
        activePlayerCount++;
        // Einfache Zuweisung: Erster ist Weiß, Zweiter ist Schwarz
        // (Das verbessern wir später mit deiner Auswahl-Logik)
        const assignedColor = activePlayerCount === 1 ? 'white' : 'black';
        players[socket.id] = assignedColor;
        
        // Dem Spieler sagen, welche Farbe er hat
        socket.emit('player-assignment', assignedColor);
        console.log(`Spieler ${socket.id} ist jetzt ${assignedColor}`);
    }

    // --- EREIGNISSE VOM CLIENT EMPFANGEN ---

    // Ein Spieler will einen Zug machen
    socket.on('playerAction', (data) => {
        // data enthält: { type: 'place'/'move'/'remove', index: 12, ... }
        
        // Wir senden diese Aktion an ALLE Clients weiter (Broadcast)
        // Damit bewegen sich die Steine auf beiden Bildschirmen
        io.emit('updateBoard', data);
    });

    // Ein Spieler startet das Spiel neu / Wählt Startspieler
    socket.on('gameStart', (startColor) => {
        io.emit('resetGame', startColor);
    });

    // Wenn ein Spieler die Verbindung trennt
    socket.on('disconnect', () => {
        console.log('Spieler getrennt: ' + socket.id);
        if (players[socket.id]) {
            activePlayerCount--;
            delete players[socket.id];
            // Optional: Dem anderen Spieler sagen, dass der Gegner weg ist
            io.emit('opponentLeft');
        }
    });
});

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Der Mühle-Server läuft auf Port ${PORT}`);
    console.log(`Lokal erreichbar unter: http://localhost:${PORT}`);
    console.log(`Im Netzwerk erreichbar über deine IP-Adresse:3000`);
});