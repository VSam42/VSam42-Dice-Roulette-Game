const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for games
const games = {};


function generateGameId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// --- Game Logic Helpers ---
const checkBet = (roll, player, diceSides) => {
    if (!player.bet) return false;
    const betType = player.bet.type;
    const betNumber = player.bet.number;

    // For a 6-sided die, High is 4, 5, 6. Low is 1, 2, 3.
    // The logic roll > diceSides / 2 correctly implements this.
    // e.g. 3 > 6 / 2 is false. 4 > 6 / 2 is true.
    if (betType === 'High') return roll > diceSides / 2;
    if (betType === 'Low') return roll <= diceSides / 2;
    if (betType === 'Odd') return roll % 2 === 1;
    if (betType === 'Even') return roll % 2 === 0;
    if (betType === 'Number') return roll === betNumber;
    return false;
};

const getBetMessage = (betWon, player) => {
    if (!player.bet) return '';
    const betType = player.bet.type;
    if (betType === 'High') return betWon ? 'High bet correct!' : 'High bet incorrect!';
    if (betType === 'Low') return betWon ? 'Low bet correct!' : 'Low bet incorrect!';
    if (betType === 'Odd') return betWon ? 'Odd bet correct!' : 'Odd bet incorrect!';
    if (betType === 'Even') return betWon ? 'Even bet correct!' : 'Even bet incorrect!';
    if (betType === 'Number') return betWon ? 'Number bet correct!' : 'Number bet incorrect!';
    return '';
};

const advanceTurn = (game) => {
    const currentPlayer = game.players[game.currentPlayerIndex];
    // Check for winner
    if (currentPlayer.score >= game.settings.winningScore) {
        game.gameState = 'finished';
        game.winner = currentPlayer.name;
        io.to(game.gameId).emit('game:stateUpdate', game);
        return;
    }

    // Reset current player's bet before advancing
    currentPlayer.bet = null;

    // Advance to next player
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    game.turnPhase = 'betting';
    game.lastRoll = null;
    game.betResult = null;
    io.to(game.gameId).emit('game:stateUpdate', game);
};

const applyScore = (game) => {
    const currentPlayer = game.players[game.currentPlayerIndex];
    const betWon = checkBet(currentPlayer.roll, currentPlayer, game.settings.diceSides);
    const { points, numberBetPenalty } = game.settings;

    if (currentPlayer.bet.type === 'High' || currentPlayer.bet.type === 'Low') {
        currentPlayer.score += betWon ? points.highLow : -points.highLow;
    } else if (currentPlayer.bet.type === 'Odd' || currentPlayer.bet.type === 'Even') {
        currentPlayer.score += betWon ? points.oddEven : -points.oddEven;
    } else if (currentPlayer.bet.type === 'Number') {
        if (betWon) {
            if (game.settings.rollMode === 'shared') {
                const rewardPoints = Math.round(currentPlayer.bet.number * game.settings.numberBetMultiplier);
                currentPlayer.score += rewardPoints;
                advanceTurn(game); // Automatically advance turn in shared mode
                return;
            } else {
                game.turnPhase = 'reward';
                io.to(game.gameId).emit('game:stateUpdate', game);
                return; // Don't advance turn yet, wait for player's reward choice
            }
        } else {
            if (numberBetPenalty.mode === 'deductRoll') {
                currentPlayer.score -= currentPlayer.roll;
            } else {
                currentPlayer.score -= numberBetPenalty.value;
            }
        }
    }
    advanceTurn(game);
};


// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('gm:createGame', () => {
        const gameId = generateGameId();
        games[gameId] = {
            gameId,
            gmSocketId: socket.id,
            gameState: 'waiting',
            players: [],
            settings: {
                rollMode: 'individual',
                basePoints: 10,
                winningScore: 20,
                diceSides: 6,
                points: {
                    highLow: 1,
                    oddEven: 2,
                },
                numberBetMultiplier: 1.0,
                numberBetPenalty: {
                    mode: 'fixed', // 'fixed' or 'deductRoll'
                    value: 2,
                },
            },
        };
        socket.join(gameId);
        socket.emit('game:created', { gameId, gameState: games[gameId] });
    });

    socket.on('player:joinGame', ({ gameId, playerName }) => {
        if (games[gameId]) {
            const newPlayer = {
                playerId: socket.id,
                name: playerName,
                score: games[gameId].settings.basePoints,
                rerolls: 3,
                bet: null,
                roll: null,
            };
            games[gameId].players.push(newPlayer);
            socket.join(gameId);
            io.to(gameId).emit('game:stateUpdate', games[gameId]);
        } else {
            socket.emit('error', { message: 'Game not found.' });
        }
    });

    socket.on('gm:updateSettings', ({ gameId, newSettings }) => {
        if (games[gameId] && games[gameId].gmSocketId === socket.id) {
            games[gameId].settings = newSettings;
            if (newSettings.rollMode === 'shared') {
                games[gameId].players.forEach(player => player.rerolls = 0);
            }
            io.to(gameId).emit('game:stateUpdate', games[gameId]);
        }
    });

    socket.on('gm:startGame', ({ gameId }) => {
        if (games[gameId] && games[gameId].gmSocketId === socket.id) {
            if (games[gameId].players.length >= 2) {
                games[gameId].gameState = 'playing';
                games[gameId].currentPlayerIndex = 0;
                games[gameId].turnPhase = 'betting';
                io.to(gameId).emit('game:stateUpdate', games[gameId]);
            } else {
                socket.emit('error', { message: 'You need at least 2 players to start the game.' });
            }
        }
    });

    socket.on('player:placeBet', ({ gameId, bet }) => {
        const game = games[gameId];
        if (!game || game.turnPhase !== 'betting') return;

        const player = game.players.find(p => p.playerId === socket.id);
        if (player) {
            player.bet = bet;

            if (game.settings.rollMode === 'shared') {
                const allPlayersHaveBet = game.players.every(p => p.bet !== null);
                if (allPlayersHaveBet) {
                    game.turnPhase = 'rolling';
                }
            } else {
                // In individual mode, only the current player can bet
                if (player.playerId === game.players[game.currentPlayerIndex].playerId) {
                    game.turnPhase = 'rolling';
                }
            }
            io.to(gameId).emit('game:stateUpdate', game);
        }
    });

    socket.on('gm:rollDice', ({ gameId, roll }) => {
        const game = games[gameId];
        if (!game || game.gmSocketId !== socket.id || game.turnPhase !== 'rolling') return;

        game.lastRoll = roll;

        if (game.settings.rollMode === 'shared') {
            game.players.forEach(player => {
                if (player.bet) {
                    player.roll = roll;
                    // Simplified score application for shared mode
                    const betWon = checkBet(roll, player, game.settings.diceSides);
                    const { points, numberBetPenalty } = game.settings;
                    if (player.bet.type === 'High' || player.bet.type === 'Low') {
                        player.score += betWon ? points.highLow : -points.highLow;
                    } else if (player.bet.type === 'Odd' || player.bet.type === 'Even') {
                        player.score += betWon ? points.oddEven : -points.oddEven;
                    } else if (player.bet.type === 'Number') {
                        if (betWon) {
                            player.score += Math.round(player.bet.number * game.settings.numberBetMultiplier);
                        } else {
                            if (numberBetPenalty.mode === 'deductRoll') {
                                player.score -= roll;
                            } else {
                                player.score -= numberBetPenalty.value;
                            }
                        }
                    }
                }
            });

            // Check for a winner after all scores are updated
            const winner = game.players.find(p => p.score >= game.settings.winningScore);
            if (winner) {
                game.gameState = 'finished';
                game.winner = winner.name;
            } else {
                // Reset for next round
                game.players.forEach(p => {
                    p.bet = null;
                    p.roll = null;
                });
                game.turnPhase = 'betting';
                game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            }
            io.to(gameId).emit('game:stateUpdate', game);

        } else { // Individual roll mode
            const currentPlayer = game.players[game.currentPlayerIndex];
            currentPlayer.roll = roll;
            game.betResult = getBetMessage(checkBet(roll, currentPlayer, game.settings.diceSides), currentPlayer);

            if (!checkBet(roll, currentPlayer, game.settings.diceSides) && currentPlayer.rerolls > 0) {
                game.turnPhase = 'reroll';
                io.to(gameId).emit('game:stateUpdate', game);
            } else {
                applyScore(game);
            }
        }
    });

    socket.on('player:useReroll', ({ gameId }) => {
        const game = games[gameId];
        if (game && game.turnPhase === 'reroll') {
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (currentPlayer.playerId === socket.id && currentPlayer.rerolls > 0) {
                currentPlayer.rerolls--;
                game.turnPhase = 'rolling';
                game.betResult = null;
                io.to(gameId).emit('game:stateUpdate', game);
            }
        }
    });

    socket.on('player:acceptRoll', ({ gameId }) => {
        const game = games[gameId];
        if (game && game.turnPhase === 'reroll') {
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (currentPlayer.playerId === socket.id) {
                applyScore(game);
            }
        }
    });

    socket.on('player:chooseReward', ({ gameId, rewardType }) => {
        const game = games[gameId];
        if (game && game.turnPhase === 'reward') {
            const currentPlayer = game.players[game.currentPlayerIndex];
            if (currentPlayer.playerId === socket.id) {
                if (rewardType === 'points') {
                    const rewardPoints = Math.round(currentPlayer.bet.number * game.settings.numberBetMultiplier);
                    currentPlayer.score += rewardPoints;
                } else if (rewardType === 'reroll') {
                    if (currentPlayer.rerolls < 3) { // Cap rerolls at 3
                        currentPlayer.rerolls++;
                    }
                }
                advanceTurn(game);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        // TODO: Handle user disconnection (e.g., remove from a game)
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
