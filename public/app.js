const { useState, useEffect } = React;

// --- SVG Icons ---
const Dices = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="12" height="12" x="2" y="10" rx="2" ry="2"/>
        <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/>
        <path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>
    </svg>
);
const Users = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);
const Trophy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
);
const RotateCcw = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
);

// --- Utility Functions ---
const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy: ', err);
        return false;
    }
};


// --- Main App Component ---
function App() {
    const [socket, setSocket] = useState(null);
    const [view, setView] = useState('home'); // home, gm_login, gm_dashboard, player_join, player_waiting
    const [gameId, setGameId] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [gameState, setGameState] = useState(null);
    const [isGm, setIsGm] = useState(false);

    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to server with ID:', newSocket.id);
        });

        newSocket.on('game:stateUpdate', (newGameState) => {
            setGameState(newGameState);
        });
        
        newSocket.on('error', (data) => {
            alert(data.message);
        });

        return () => {
            newSocket.off('game:stateUpdate');
            newSocket.off('error');
            newSocket.close();
        }
    }, []);

    const resetGame = () => {
        setGameState(null);
        setView('home');
        setIsGm(false);
        setGameId('');
        setPlayerName('');
    };

    const renderView = () => {
        if (gameState && gameState.gameState === 'finished') {
            return <FinishedView gameState={gameState} resetGame={resetGame} />;
        }
        if (gameState && gameState.gameState === 'playing') {
            return <Game socket={socket} gameState={gameState} isGm={isGm} />;
        }

        switch (view) {
            case 'gm_login':
                return <GMLogin setView={setView} setIsGm={setIsGm} />;
            case 'gm_dashboard':
                return <GMDashboard socket={socket} gameState={gameState} setGameState={setGameState} />;
            case 'player_join':
                return <PlayerJoin socket={socket} setView={setView} setGameId={setGameId} setPlayerName={setPlayerName} />;
            case 'player_waiting':
                return <PlayerWaitingRoom socket={socket} gameState={gameState} playerName={playerName} />;
            default:
                return <Home setView={setView} setIsGm={setIsGm} />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
            {renderView()}
        </div>
    );
}

// --- View Components ---

function Home({ setView, setIsGm }) {
    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-12 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Welcome to Dice Roulette</h1>
            <p className="text-gray-600 mb-8">How are you joining?</p>
            <div className="space-y-4">
                <button onClick={() => setView('player_join')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors">
                    Join as Player
                </button>
                <button onClick={() => { setIsGm(true); setView('gm_dashboard'); }} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors">
                    Login as Game Master
                </button>
            </div>
        </div>
    );
}



function PlayerJoin({ socket, setView, setGameId, setPlayerName }) {
    const [name, setName] = useState('');
    const [id, setId] = useState('');

    const handleJoin = () => {
        if (!name || !id) {
            alert('Please enter your name and a game ID.');
            return;
        }
        setPlayerName(name);
        setGameId(id.toUpperCase());
        socket.emit('player:joinGame', { gameId: id.toUpperCase(), playerName: name });
        setView('player_waiting');
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-12">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Join a Game</h1>
            <div className="space-y-4">
                <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                <input type="text" placeholder="Game ID" value={id} onChange={e => setId(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                <button onClick={handleJoin} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors">
                    Join Waiting Room
                </button>
            </div>
        </div>
    );
}

function GMDashboard({ socket, gameState, setGameState }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!socket) return;
        socket.on('game:created', (data) => setGameState(data.gameState));
        return () => socket.off('game:created');
    }, [socket]);

    const createGame = () => socket.emit('gm:createGame');

    const handleSettingsChange = (e) => {
        const { name, value, type } = e.target;
        let parsedValue = type === 'number' ? parseFloat(value) : value;

        let newSettings = { ...gameState.settings };
        if (name === 'highLow' || name === 'oddEven') {
            newSettings.points = { ...newSettings.points, [name]: parsedValue };
        } else if (name === 'numberBetPenaltyMode') {
            newSettings.numberBetPenalty = { ...newSettings.numberBetPenalty, mode: parsedValue };
        } else if (name === 'numberBetPenaltyValue') {
            newSettings.numberBetPenalty = { ...newSettings.numberBetPenalty, value: parseInt(value, 10) }; // Ensure integer for penalty value
        }
        else {
            newSettings[name] = parsedValue;
        }
        
        socket.emit('gm:updateSettings', { gameId: gameState.gameId, newSettings });
    };

    const handleStartGame = () => socket.emit('gm:startGame', { gameId: gameState.gameId });

    const handleCopyClick = async () => {
        const success = await copyToClipboard(gameState.gameId);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!gameState) {
        return (
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-12 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Game Master Dashboard</h1>
                <button onClick={createGame} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors">
                    Create New Game
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Game Room Code</h1>
                <div className="flex items-center justify-center gap-2">
                    <p className="text-5xl font-mono tracking-widest text-indigo-600 bg-gray-100 rounded-lg p-4 inline-block">{gameState.gameId}</p>
                    <button onClick={handleCopyClick} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <p className="text-gray-600 mt-2">Share this code with your players.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users /> Players</h2>
                    {gameState.players.length === 0 ? <p className="text-gray-500">Waiting for players to join...</p> :
                        <ul className="space-y-2">{gameState.players.map(p => <li key={p.playerId} className="text-lg bg-gray-50 p-2 rounded-md">{p.name}</li>)}</ul>
                    }
                </div>
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Roll Mode</label>
                            <select name="rollMode" value={gameState.settings.rollMode} onChange={handleSettingsChange} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none">
                                <option value="individual">Individual Roll</option>
                                <option value="shared">Shared Roll</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Base Points</label>
                            <input type="number" name="basePoints" value={gameState.settings.basePoints} onChange={handleSettingsChange} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Winning Score</label>
                            <input type="number" name="winningScore" value={gameState.settings.winningScore} onChange={handleSettingsChange} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Dice Sides</label>
                            <input type="number" name="diceSides" value={gameState.settings.diceSides} onChange={handleSettingsChange} min="2" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <hr/>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">High/Low Points (+/-)</label>
                            <input type="number" name="highLow" value={gameState.settings.points.highLow} onChange={handleSettingsChange} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Odd/Even Points (+/-)</label>
                            <input type="number" name="oddEven" value={gameState.settings.points.oddEven} onChange={handleSettingsChange} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Number Bet Multiplier (e.g., 1.5)</label>
                            <input type="number" name="numberBetMultiplier" value={gameState.settings.numberBetMultiplier} onChange={handleSettingsChange} step="0.1" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <hr/>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Incorrect Number Bet Penalty</label>
                            <select name="numberBetPenaltyMode" value={gameState.settings.numberBetPenalty.mode} onChange={(e) => handleSettingsChange({ target: { name: 'numberBetPenaltyMode', value: e.target.value } })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none">
                                <option value="fixed">Fixed Points Deduction</option>
                                <option value="deductRoll">Deduct Roll Value</option>
                            </select>
                            {gameState.settings.numberBetPenalty.mode === 'fixed' && (
                                <input type="number" name="numberBetPenaltyValue" value={gameState.settings.numberBetPenalty.value} onChange={(e) => handleSettingsChange({ target: { name: 'numberBetPenaltyValue', value: parseInt(e.target.value, 10) } })} className="w-full px-4 py-2 mt-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6">
                <button onClick={handleStartGame} disabled={gameState.players.length < 2} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Start Game ({gameState.players.length}/2+ players)
                </button>
            </div>
        </div>
    );
}

function PlayerWaitingRoom({ gameState, playerName }) {
    if (!gameState) {
        return (
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-12 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Joining game...</h1>
                <p className="text-gray-600">Waiting for server...</p>
            </div>
        );
    }
    const penaltyDisplay = gameState.settings.numberBetPenalty.mode === 'fixed'
        ? `-${gameState.settings.numberBetPenalty.value} points`
        : 'Deduct Roll Value';

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome, {playerName}!</h1>
                <p className="text-gray-600">You have joined game <span className="font-bold text-indigo-600">{gameState.gameId}</span>.</p>
                <p className="text-xl mt-4">Waiting for the Game Master to start the game...</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users /> Players</h2>
                    <ul className="space-y-2">{gameState.players.map(p => <li key={p.playerId} className={`text-lg bg-gray-50 p-2 rounded-md ${p.name === playerName ? 'font-bold' : ''}`}>{p.name}</li>)}</ul>
                </div>
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Settings</h2>
                    <div className="space-y-2">
                        <p><strong>Roll Mode:</strong> {gameState.settings.rollMode}</p>
                        <p><strong>Base Points:</strong> {gameState.settings.basePoints}</p>
                        <p><strong>Winning Score:</strong> {gameState.settings.winningScore}</p>
                        <p><strong>Dice Sides:</strong> {gameState.settings.diceSides}</p>
                        <hr/>
                        <p><strong>High/Low Points:</strong> +/-{gameState.settings.points.highLow}</p>
                        <p><strong>Odd/Even Points:</strong> +/-{gameState.settings.points.oddEven}</p>
                        <p><strong>Number Bet Bonus:</strong> x{gameState.settings.numberBetMultiplier}</p>
                        <p><strong>Incorrect Number Bet:</strong> {penaltyDisplay}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Game({ socket, gameState, isGm }) {
    const [diceRoll, setDiceRoll] = useState('');
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMyTurn = !isGm && currentPlayer.playerId === socket.id;

    const handlePlaceBet = (betType) => {
        let bet = { type: betType, number: null };
        if (betType === 'Number') {
            const num = parseInt(prompt(`Enter specific number (1-${gameState.settings.diceSides}):`));
            if (num >= 1 && num <= gameState.settings.diceSides) {
                bet.number = num;
            } else {
                alert('Invalid number');
                return;
            }
        }
        socket.emit('player:placeBet', { gameId: gameState.gameId, bet });
    };

    const handleRoll = () => {
        const roll = parseInt(diceRoll);
        if (isNaN(roll) || roll < 1 || roll > gameState.settings.diceSides) {
            alert(`Please enter a valid roll between 1 and ${gameState.settings.diceSides}`);
            return;
        }
        socket.emit('gm:rollDice', { gameId: gameState.gameId, roll });
        setDiceRoll('');
    };

    const handleUseReroll = () => socket.emit('player:useReroll', { gameId: gameState.gameId });
    const handleAcceptRoll = () => socket.emit('player:acceptRoll', { gameId: gameState.gameId });
    const handleChooseReward = (rewardType) => socket.emit('player:chooseReward', { gameId: gameState.gameId, rewardType });

    const renderTurnContent = () => {
        const { points } = gameState.settings;

        if (gameState.settings.rollMode === 'shared') {
            const myPlayer = gameState.players.find(p => p.playerId === socket.id);
            const hasBet = myPlayer && myPlayer.bet !== null;

            switch (gameState.turnPhase) {
                case 'betting':
                    return (
                        <div className="text-center">
                            <h3 className="text-xl font-semibold mb-4">Shared Roll Mode: Place Your Bets!</h3>
                            <div className="mb-4">
                                <h4 className="font-bold mb-2">Players' Bet Status:</h4>
                                <ul className="list-disc list-inside mx-auto w-fit">
                                    {gameState.players.map(p => (
                                        <li key={p.playerId} className={p.bet ? 'text-green-600' : 'text-red-600'}>
                                            {p.name}: {p.bet ? `Bet Placed (${p.bet.type}${p.bet.number ? ' ' + p.bet.number : ''})` : 'Waiting to Bet'}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {!hasBet && !isGm && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-4 text-center">Place Your Bet</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <button onClick={() => handlePlaceBet('High')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                            <div>High</div>
                                            <div className="text-sm">(+/- {points.highLow} pts)</div>
                                        </button>
                                        <button onClick={() => handlePlaceBet('Low')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                            <div>Low</div>
                                            <div className="text-sm">(+/- {points.highLow} pts)</div>
                                        </button>
                                        <button onClick={() => handlePlaceBet('Odd')} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                            <div>Odd</div>
                                            <div className="text-sm">(+/- {points.oddEven} pts)</div>
                                        </button>
                                        <button onClick={() => handlePlaceBet('Even')} className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                            <div>Even</div>
                                            <div className="text-sm">(+/- {points.oddEven} pts)</div>
                                        </button>
                                        <button onClick={() => handlePlaceBet('Number')} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 px-4 rounded-lg transition-colors col-span-2 md:col-span-1">
                                            Specific Number
                                        </button>
                                    </div>
                                </div>
                            )}
                            {hasBet && !isGm && <p className="text-xl text-center mt-4">You have placed your bet. Waiting for other players...</p>}
                            {isGm && <p className="text-xl text-center mt-4">Waiting for all players to place their bets...</p>}
                        </div>
                    );

                case 'rolling':
                    if (isGm) {
                        return (
                            <div className="text-center">
                                <h3 className="text-xl font-semibold mb-4">Enter Shared Dice Roll</h3>
                                <div className="flex gap-4 items-end max-w-sm mx-auto">
                                    <input type="number" min="1" max={gameState.settings.diceSides} value={diceRoll} onChange={(e) => setDiceRoll(e.target.value)} placeholder={`Roll (1-${gameState.settings.diceSides})`} className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"/>
                                    <button onClick={handleRoll} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors">Submit</button>
                                </div>
                            </div>
                        );
                    }
                    return <p className="text-xl text-center">Waiting for the Game Master to roll the shared dice...</p>;
                
                default:
                    return <p className="text-xl text-center">Shared Roll Mode: Current phase not applicable or waiting...</p>;
            }
        } else { // Individual Roll Mode
            switch (gameState.turnPhase) {
                case 'betting':
                    if (isMyTurn) {
                        return (
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-center">Place Your Bet</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <button onClick={() => handlePlaceBet('High')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                        <div>High</div>
                                        <div className="text-sm">(+/- {points.highLow} pts)</div>
                                    </button>
                                    <button onClick={() => handlePlaceBet('Low')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                        <div>Low</div>
                                        <div className="text-sm">(+/- {points.highLow} pts)</div>
                                    </button>
                                    <button onClick={() => handlePlaceBet('Odd')} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                        <div>Odd</div>
                                        <div className="text-sm">(+/- {points.oddEven} pts)</div>
                                    </button>
                                    <button onClick={() => handlePlaceBet('Even')} className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-6 px-4 rounded-lg transition-colors">
                                        <div>Even</div>
                                        <div className="text-sm">(+/- {points.oddEven} pts)</div>
                                    </button>
                                    <button onClick={() => handlePlaceBet('Number')} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 px-4 rounded-lg transition-colors col-span-2 md:col-span-1">
                                        Specific Number
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    return <p className="text-xl text-center">Waiting for {currentPlayer.name} to place a bet...</p>;

                case 'rolling':
                    const bet = currentPlayer.bet;
                    if (isGm) {
                        return (
                            <div className="text-center">
                                <p className="text-lg mb-4">{currentPlayer.name} bet on <span className="font-bold text-indigo-600">{bet.type}{bet.number ? ` ${bet.number}` : ''}</span>.</p>
                                <div className="flex gap-4 items-end max-w-sm mx-auto">
                                    <input type="number" min="1" max={gameState.settings.diceSides} value={diceRoll} onChange={(e) => setDiceRoll(e.target.value)} placeholder={`Roll (1-${gameState.settings.diceSides})`} className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"/>
                                    <button onClick={handleRoll} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors">Submit</button>
                                </div>
                            </div>
                        );
                    }
                    return <p className="text-xl text-center">Waiting for the Game Master to roll the dice...</p>;

                case 'reroll':
                    if (isMyTurn) {
                        return (
                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
                                <p className="text-xl font-semibold mb-2">{gameState.betResult}</p>
                                <p className="text-gray-700 mb-6">You have {currentPlayer.rerolls} reroll(s) remaining.</p>
                                <div className="flex gap-4">
                                    <button onClick={handleAcceptRoll} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg transition-colors">Accept Result</button>
                                    <button onClick={handleUseReroll} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition-colors">Use Reroll</button>
                                </div>
                            </div>
                        );
                    }
                    return <p className="text-xl text-center">{currentPlayer.name} is deciding whether to use a reroll...</p>;
                
                case 'reward':
                    if (isMyTurn) {
                        return (
                            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
                                <p className="text-2xl font-bold text-green-700 mb-2">Number Bet Won!</p>
                                <p className="text-lg mb-6">Choose your reward:</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => handleChooseReward('points')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-8 px-6 rounded-lg transition-colors">
                                        <div className="text-3xl mb-2">+{Math.round(currentPlayer.bet.number * gameState.settings.numberBetMultiplier)}</div>
                                        <div className="text-sm">Points</div>
                                    </button>
                                    <button onClick={() => handleChooseReward('reroll')} disabled={currentPlayer.rerolls >= 3} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-8 px-6 rounded-lg transition-colors disabled:bg-gray-400">
                                        <div className="text-3xl mb-2">+1</div>
                                        <div className="text-sm">Reroll {currentPlayer.rerolls >= 3 ? '(Max)' : ''}</div>
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    return <p className="text-xl text-center">{currentPlayer.name} is choosing a reward...</p>;

                default:
                    return null;
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users /> Scoreboard</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {gameState.players.map((player, i) => (
                        <div key={i} className={`p-4 rounded-lg border-4 ${i === gameState.currentPlayerIndex ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="font-bold text-lg mb-1">{player.name}</div>
                            <div className="text-3xl font-bold text-indigo-600 mb-2">{player.score}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-600"><RotateCcw /><span>{player.rerolls} rerolls</span></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-xl p-8">
                <div className="mb-6 text-center">
                    {gameState.settings.rollMode !== 'shared' && <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentPlayer.name}'s Turn</h2>}
                </div>
                {renderTurnContent()}
            </div>
        </div>
    );
}

function FinishedView({ gameState, resetGame }) {
    return (
        <div className="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="flex justify-center mb-6"><Trophy /></div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">{gameState.winner} Wins!</h1>
            <p className="text-xl text-gray-600 mb-8">Congratulations on reaching {gameState.settings.winningScore} points!</p>
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">Final Scores</h2>
                {gameState.players.map((player, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <span className="text-lg font-semibold">{player.name}</span>
                        <span className="text-2xl font-bold text-indigo-600">{player.score}</span>
                    </div>
                ))}
            </div>
            <button onClick={resetGame} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors">
                New Game
            </button>
        </div>
    );
}

// --- Render App ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
