/**
 * Main Application - Panic Typer
 * Connects UI with NetworkManager, GameManager, and SabotageSystem
 * Phase 3: Sabotage System Integration
 */

// DOM Elements
const elements = {
	// Screens
	roleScreen: document.getElementById('roleScreen'),
	hostScreen: document.getElementById('hostScreen'),
	joinScreen: document.getElementById('joinScreen'),
	lobbyScreen: document.getElementById('lobbyScreen'),
	gameScreen: document.getElementById('gameScreen'),
	gameOverScreen: document.getElementById('gameOverScreen'),

	// Connection Status
	connectionStatus: document.getElementById('connectionStatus'),

	// Role Selection
	hostBtn: document.getElementById('hostBtn'),
	joinBtn: document.getElementById('joinBtn'),

	// Host Screen
	roomCode: document.getElementById('roomCode'),
	copyCodeBtn: document.getElementById('copyCodeBtn'),
	playersList: document.getElementById('playersList'),
	startGameBtn: document.getElementById('startGameBtn'),
	hostBackBtn: document.getElementById('hostBackBtn'),

	// Join Screen
	codeInput: document.getElementById('codeInput'),
	connectBtn: document.getElementById('connectBtn'),
	joinError: document.getElementById('joinError'),
	joinBackBtn: document.getElementById('joinBackBtn'),

	// Lobby Screen
	lobbyRoomCode: document.getElementById('lobbyRoomCode'),
	lobbyPlayersList: document.getElementById('lobbyPlayersList'),
	leaveBtn: document.getElementById('leaveBtn'),

	// Game Screen
	bombTimer: document.getElementById('bombTimer'),
	timerProgress: document.getElementById('timerProgress'),
	timerText: document.getElementById('timerText'),
	currentSyllable: document.getElementById('currentSyllable'),
	wordInput: document.getElementById('wordInput'),
	submitWordBtn: document.getElementById('submitWordBtn'),
	wordFeedback: document.getElementById('wordFeedback'),
	turnIndicator: document.getElementById('turnIndicator'),
	turnAvatar: document.getElementById('turnAvatar'),
	turnName: document.getElementById('turnName'),
	playersBar: document.getElementById('playersBar'),

	// Sabotage Shop (Phase 3)
	sabotageShop: document.getElementById('sabotageShop'),
	chaosPoints: document.getElementById('chaosPoints'),
	shopItems: document.getElementById('shopItems'),
	activeEffects: document.getElementById('activeEffects'),

	// Game Over Screen
	winnerTitle: document.getElementById('winnerTitle'),
	winnerName: document.getElementById('winnerName'),
	wordsUsedStat: document.getElementById('wordsUsedStat'),
	playAgainBtn: document.getElementById('playAgainBtn'),
	exitGameBtn: document.getElementById('exitGameBtn'),

	// Explosion Overlay
	explosionOverlay: document.getElementById('explosionOverlay'),
	explosionPlayer: document.getElementById('explosionPlayer'),

	// Toast Container
	toastContainer: document.getElementById('toastContainer'),

	// Particles
	particles: document.getElementById('particles')
};

// Global instances
const network = new NetworkManager();
const sabotage = new SabotageSystem();
let game = null;
let myPlayerId = null;
let currentGameState = null;

// ==================== Screen Management ====================

function showScreen(screenId) {
	document.querySelectorAll('.screen').forEach(screen => {
		screen.classList.remove('active');
	});
	document.getElementById(screenId).classList.add('active');

	// Initialize sabotage system when game screen shows
	if (screenId === 'gameScreen') {
		sabotage.init();
		renderSabotageShop();
	}
}

// ==================== Connection Status ====================

function updateConnectionStatus(state) {
	const status = elements.connectionStatus;
	const textEl = status.querySelector('.status-text');

	status.classList.remove('connected', 'connecting');

	switch (state) {
		case NetworkManager.ConnectionState.CONNECTED:
			status.classList.add('connected');
			textEl.textContent = 'Connected';
			break;
		case NetworkManager.ConnectionState.CONNECTING:
			status.classList.add('connecting');
			textEl.textContent = 'Connecting...';
			break;
		case NetworkManager.ConnectionState.ERROR:
			textEl.textContent = 'Error';
			break;
		default:
			textEl.textContent = 'Disconnected';
	}
}

// ==================== Toast Notifications ====================

function showToast(message, type = 'info') {
	const toast = document.createElement('div');
	toast.className = `toast ${type}`;
	toast.textContent = message;
	elements.toastContainer.appendChild(toast);

	setTimeout(() => toast.remove(), 3000);
}

// ==================== Player List Rendering ====================

function renderPlayersList(container, players, isHost = false) {
	container.innerHTML = '';

	players.forEach(player => {
		const li = document.createElement('li');
		li.className = `player-item ${player.isHost ? 'host' : ''}`;
		li.innerHTML = `
            <span class="player-avatar">${player.isHost ? '👑' : '🎮'}</span>
            <span class="player-name">${escapeHtml(player.name)}${player.isHost ? ' (Host)' : ''}</span>
            <span class="player-status ready">Ready</span>
        `;
		container.appendChild(li);
	});

	if (isHost) {
		elements.startGameBtn.disabled = players.length < 2;
	}
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// ==================== Game UI Updates ====================

function updateGameUI(state) {
	if (!state) return;

	currentGameState = state;

	// Update syllable
	elements.currentSyllable.textContent = state.currentSyllable;

	// Update timer
	const timeSeconds = (state.timeRemaining / 1000).toFixed(1);
	elements.timerText.textContent = timeSeconds;

	// Update timer ring
	const progress = state.timeRemaining / state.maxTime;
	const circumference = 2 * Math.PI * 45;
	const offset = circumference * (1 - progress);
	elements.timerProgress.style.strokeDashoffset = offset;

	// Danger mode when < 3 seconds
	if (state.timeRemaining < 3000) {
		elements.bombTimer.classList.add('danger');
	} else {
		elements.bombTimer.classList.remove('danger');
	}

	// Update turn indicator
	const currentPlayer = state.players[state.currentPlayerIndex];
	if (currentPlayer) {
		elements.turnAvatar.textContent = currentPlayer.isHost ? '👑' : '🎮';
		elements.turnName.textContent = currentPlayer.name;

		const isMyTurn = currentPlayer.id === myPlayerId;
		elements.turnIndicator.classList.toggle('your-turn', isMyTurn);
		elements.wordInput.disabled = !isMyTurn;
		elements.submitWordBtn.disabled = !isMyTurn;

		if (isMyTurn) {
			elements.wordInput.focus();
		}

		// Update sabotage shop visibility (can't sabotage when it's your turn)
		updateSabotageShopState(!isMyTurn);
	}

	// Update players bar
	renderPlayersBar(state.players, state.currentPlayerIndex);
}

function renderPlayersBar(players, currentIndex) {
	elements.playersBar.innerHTML = '';

	players.forEach((player, index) => {
		const card = document.createElement('div');
		card.className = 'player-card';
		if (index === currentIndex) card.classList.add('active');
		if (player.isEliminated) card.classList.add('eliminated');

		let livesHtml = '<div class="lives">';
		for (let i = 0; i < 3; i++) {
			livesHtml += `<div class="life ${i >= player.lives ? 'lost' : ''}"></div>`;
		}
		livesHtml += '</div>';

		card.innerHTML = `
            <div class="avatar">${player.isHost ? '👑' : '🎮'}</div>
            <div class="name">${escapeHtml(player.name)}</div>
            ${livesHtml}
        `;

		elements.playersBar.appendChild(card);
	});
}

function showExplosion(playerName) {
	elements.explosionPlayer.textContent = `${playerName} lost a life!`;
	elements.explosionOverlay.classList.add('active');

	setTimeout(() => {
		elements.explosionOverlay.classList.remove('active');
	}, 2000);
}

function showWordFeedback(message, isSuccess) {
	elements.wordFeedback.textContent = message;
	elements.wordFeedback.className = `word-feedback ${isSuccess ? 'success' : 'error'}`;

	setTimeout(() => {
		elements.wordFeedback.textContent = '';
		elements.wordFeedback.className = 'word-feedback';
	}, 2000);
}

function showGameOver(winner, wordsUsed) {
	if (winner) {
		elements.winnerTitle.textContent = '🏆 Winner!';
		elements.winnerName.textContent = winner.name;
	} else {
		elements.winnerTitle.textContent = 'Game Over';
		elements.winnerName.textContent = 'No winner';
	}

	elements.wordsUsedStat.textContent = wordsUsed || 0;
	showScreen('gameOverScreen');
}

// ==================== Phase 3: Sabotage System ====================

function renderSabotageShop() {
	elements.shopItems.innerHTML = '';

	const sabotages = sabotage.getAllSabotages();

	sabotages.forEach(sab => {
		const btn = document.createElement('button');
		btn.className = 'sabotage-btn';
		btn.dataset.sabotageId = sab.id;
		btn.title = sab.description;

		btn.innerHTML = `
            <span class="sabotage-emoji">${sab.emoji}</span>
            <span class="sabotage-name">${sab.name}</span>
            <span class="sabotage-cost">${sab.cost}</span>
        `;

		btn.addEventListener('click', () => useSabotage(sab.id));

		elements.shopItems.appendChild(btn);
	});

	updateSabotageShopState(true);
}

function updateSabotageShopState(canUse) {
	const buttons = elements.shopItems.querySelectorAll('.sabotage-btn');

	buttons.forEach(btn => {
		const sabotageId = btn.dataset.sabotageId;
		const canAfford = sabotage.canAfford(sabotageId);

		btn.disabled = !canUse || !canAfford;
		btn.classList.toggle('affordable', canAfford);
	});
}

function updateChaosPointsDisplay(points, delta) {
	elements.chaosPoints.textContent = points;

	// Show floating points animation for earned points
	if (delta > 0) {
		showPointsEarned(delta);
	}
}

function showPointsEarned(points) {
	const floater = document.createElement('div');
	floater.className = 'points-earned';
	floater.textContent = `+${points} 💀`;

	// Position near the word input
	const inputRect = elements.wordInput.getBoundingClientRect();
	floater.style.left = `${inputRect.left + inputRect.width / 2}px`;
	floater.style.top = `${inputRect.top}px`;

	document.body.appendChild(floater);

	setTimeout(() => floater.remove(), 1000);
}

function useSabotage(sabotageId) {
	if (!currentGameState) return;

	const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];

	// Can't sabotage yourself
	if (currentPlayer.id === myPlayerId) {
		showToast("Can't sabotage yourself!", 'error');
		return;
	}

	// Check if can afford
	if (!sabotage.canAfford(sabotageId)) {
		showToast("Not enough Chaos Points!", 'error');
		return;
	}

	// Spend points
	sabotage.spendPoints(sabotageId);

	// Send sabotage to host for forwarding
	network.sendGameMessage(NetworkManager.MessageType.SABOTAGE, {
		sabotageId,
		target: currentPlayer.id,
		senderName: network.isHost ? 'Host' : 'Player'
	});

	showToast(`Sent ${sabotage.getSabotageById(sabotageId).name}!`, 'success');
	updateSabotageShopState(true);
}

function showSabotageIncoming(sabotageInfo, senderName) {
	// Show dramatic toast
	const toast = document.createElement('div');
	toast.className = 'sabotage-toast';
	toast.innerHTML = `
        <span class="toast-emoji">${sabotageInfo.emoji}</span>
        <span class="toast-text">${sabotageInfo.name}!</span>
        <span class="toast-sender">from ${senderName}</span>
    `;

	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 2000);

	// Apply the effect
	sabotage.applySabotage(sabotageInfo.id);

	// Show active effect badge
	showActiveEffect(sabotageInfo);
}

function showActiveEffect(sabotageInfo) {
	const badge = document.createElement('div');
	badge.className = 'effect-badge';
	badge.dataset.effectId = sabotageInfo.id;
	badge.innerHTML = `
        <span class="effect-emoji">${sabotageInfo.emoji}</span>
        <span>${sabotageInfo.name}</span>
    `;

	elements.activeEffects.appendChild(badge);
}

function removeActiveEffect(sabotageId) {
	const badge = elements.activeEffects.querySelector(`[data-effect-id="${sabotageId}"]`);
	if (badge) badge.remove();
}

// ==================== Background Particles ====================

function createParticles() {
	const container = elements.particles;
	const particleCount = 30;

	for (let i = 0; i < particleCount; i++) {
		const particle = document.createElement('div');
		particle.className = 'particle';
		particle.style.left = `${Math.random() * 100}%`;
		particle.style.animationDelay = `${Math.random() * 20}s`;
		particle.style.animationDuration = `${15 + Math.random() * 10}s`;

		const colors = ['hsl(340, 100%, 60%)', 'hsl(280, 100%, 65%)', 'hsl(200, 100%, 55%)'];
		particle.style.background = colors[Math.floor(Math.random() * colors.length)];

		container.appendChild(particle);
	}
}

// ==================== Word Submission ====================

function submitWord() {
	const word = elements.wordInput.value.trim().toUpperCase();

	if (!word) return;

	if (network.isHost && game) {
		// Host validates locally
		const result = game.handleWordSubmission(word, myPlayerId);
		showWordFeedback(result.reason, result.valid);
		if (result.valid) {
			elements.wordInput.value = '';
			// Award chaos points
			const points = sabotage.awardPoints(word);
		}
	} else {
		// Client sends to host
		network.sendGameMessage(NetworkManager.MessageType.INPUT, { word });
		elements.wordInput.value = '';
	}
}

// ==================== Event Handlers ====================

// Host Game Button
elements.hostBtn.addEventListener('click', async () => {
	try {
		const roomCode = await network.hostGame('Host');
		myPlayerId = network.peer.id;
		elements.roomCode.textContent = roomCode;
		showScreen('hostScreen');
		renderPlayersList(elements.playersList, network.getPlayers(), true);
		showToast('Room created successfully!', 'success');

		// Initialize GameManager for host
		game = new GameManager(network);
		await game.loadDictionary();
		console.log('[Main] GameManager initialized');
	} catch (error) {
		showToast(error.message || 'Failed to create room', 'error');
	}
});

// Join Game Button
elements.joinBtn.addEventListener('click', () => {
	showScreen('joinScreen');
	elements.codeInput.value = '';
	elements.codeInput.focus();
	elements.joinError.textContent = '';
	elements.connectBtn.disabled = true;
});

// Code Input
elements.codeInput.addEventListener('input', (e) => {
	const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
	e.target.value = value;
	elements.connectBtn.disabled = value.length !== 4;
	elements.joinError.textContent = '';
});

elements.codeInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter' && !elements.connectBtn.disabled) {
		elements.connectBtn.click();
	}
});

// Connect Button
elements.connectBtn.addEventListener('click', async () => {
	const code = elements.codeInput.value.toUpperCase();

	if (code.length !== 4) {
		elements.joinError.textContent = 'Please enter a 4-letter code';
		return;
	}

	elements.connectBtn.disabled = true;
	elements.joinError.textContent = '';

	try {
		await network.joinGame(code, 'Player');
		myPlayerId = network.peer.id;
		elements.lobbyRoomCode.textContent = code;
		showScreen('lobbyScreen');
		showToast('Joined room successfully!', 'success');
	} catch (error) {
		elements.joinError.textContent = error.message || 'Failed to join room';
		elements.connectBtn.disabled = false;
	}
});

// Copy Room Code
elements.copyCodeBtn.addEventListener('click', async () => {
	const code = elements.roomCode.textContent;
	try {
		await navigator.clipboard.writeText(code);
		showToast('Code copied to clipboard!', 'success');
	} catch (error) {
		showToast('Failed to copy code', 'error');
	}
});

// Back Buttons
elements.hostBackBtn.addEventListener('click', () => {
	network.disconnect();
	game = null;
	sabotage.reset();
	showScreen('roleScreen');
});

elements.joinBackBtn.addEventListener('click', () => {
	network.disconnect();
	sabotage.reset();
	showScreen('roleScreen');
});

// Leave Button
elements.leaveBtn.addEventListener('click', () => {
	network.disconnect();
	sabotage.reset();
	showScreen('roleScreen');
	showToast('Left the room', 'info');
});

// Start Game Button
elements.startGameBtn.addEventListener('click', () => {
	if (!game || !network.isHost) return;

	// Initialize game with current players
	game.initGame(network.getPlayers());

	// Setup game callbacks
	setupGameCallbacks();

	// Reset sabotage system
	sabotage.reset();

	// Start the game
	if (game.startGame()) {
		showScreen('gameScreen');
		showToast('Game started!', 'success');

		// Notify all clients
		network.broadcast(NetworkManager.MessageType.START_GAME, {});
	} else {
		showToast('Failed to start game', 'error');
	}
});

// Word Input
elements.wordInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		submitWord();
	}
});

elements.submitWordBtn.addEventListener('click', submitWord);

// Play Again Button
elements.playAgainBtn.addEventListener('click', () => {
	if (network.isHost && game) {
		game.initGame(network.getPlayers());
		sabotage.reset();
		game.startGame();
		showScreen('gameScreen');
		network.broadcast(NetworkManager.MessageType.START_GAME, {});
	}
});

// Exit Game Button
elements.exitGameBtn.addEventListener('click', () => {
	sabotage.reset();
	sabotage.clearAllEffects();

	if (network.isHost) {
		game?.reset();
		showScreen('hostScreen');
		renderPlayersList(elements.playersList, network.getPlayers(), true);
	} else {
		showScreen('lobbyScreen');
	}
});

// ==================== Game Callbacks (Host Only) ====================

function setupGameCallbacks() {
	game.on('onStateUpdate', (state) => {
		updateGameUI(state);
	});

	game.on('onExplosion', (player) => {
		showExplosion(player.name);
		network.broadcast('EXPLOSION', { playerName: player.name });
	});

	game.on('onGameOver', (winner) => {
		showGameOver(winner, game.state.usedWords.size);
		network.broadcast('GAME_OVER', {
			winner: winner ? { name: winner.name } : null,
			wordsUsed: game.state.usedWords.size
		});
	});

	game.on('onWordValidated', (word, result, playerId) => {
		// Send feedback to the player who submitted
		const conn = network.connections.get(playerId);
		if (conn) {
			network.send(conn, 'WORD_RESULT', { word, ...result });
		}

		// If valid word from a client, send them their chaos points
		if (result.valid && playerId !== myPlayerId) {
			const pointsEarned = Math.max(1, word.length - 2) + (word.length >= 8 ? 5 : word.length >= 6 ? 2 : 0);
			network.send(conn, 'CHAOS_POINTS', { points: pointsEarned });
		}

		// Host also earns points for valid words
		if (result.valid && playerId === myPlayerId) {
			sabotage.awardPoints(word);
		}
	});
}

// ==================== Sabotage Callbacks ====================

sabotage.on('onChaosPointsChange', (points, delta) => {
	updateChaosPointsDisplay(points, delta);
});

sabotage.on('onSabotageEnd', (sabotageId) => {
	removeActiveEffect(sabotageId);
});

// ==================== Network Callbacks ====================

network.on('onStateChange', (state) => {
	updateConnectionStatus(state);
});

network.on('onPlayerJoin', (player) => {
	showToast(`${player.name} joined the game!`, 'info');
	renderPlayersList(elements.playersList, network.getPlayers(), true);
});

network.on('onPlayerLeave', (player) => {
	showToast(`${player.name} left the game`, 'info');
	if (network.isHost) {
		renderPlayersList(elements.playersList, network.getPlayers(), true);
	} else {
		renderPlayersList(elements.lobbyPlayersList, network.getPlayers(), false);
	}
});

network.on('onPlayerListUpdate', (players) => {
	const playerList = players.map(([id, info]) => ({ id, ...info }));
	renderPlayersList(elements.lobbyPlayersList, playerList, false);
});

network.on('onError', (error) => {
	showToast(error.message || 'Connection error', 'error');

	if (network.connectionState === NetworkManager.ConnectionState.DISCONNECTED) {
		showScreen('roleScreen');
	}
});

network.on('onMessage', (type, payload, sender) => {
	console.log(`[Main] Received ${type}:`, payload);

	switch (type) {
		case NetworkManager.MessageType.START_GAME:
			sabotage.reset();
			showScreen('gameScreen');
			showToast('Game is starting!', 'info');
			break;

		case NetworkManager.MessageType.GAME_STATE:
			updateGameUI(payload);
			break;

		case NetworkManager.MessageType.INPUT:
			// Host receives word submission from client
			if (network.isHost && game) {
				const result = game.handleWordSubmission(payload.word, sender);
				const conn = network.connections.get(sender);
				if (conn) {
					network.send(conn, 'WORD_RESULT', { word: payload.word, ...result });

					// Send chaos points if valid
					if (result.valid) {
						const pointsEarned = Math.max(1, payload.word.length - 2) +
							(payload.word.length >= 8 ? 5 : payload.word.length >= 6 ? 2 : 0);
						network.send(conn, 'CHAOS_POINTS', { points: pointsEarned });
					}
				}
			}
			break;

		case NetworkManager.MessageType.SABOTAGE:
			// Host receives sabotage request, forward to target
			if (network.isHost) {
				const targetId = payload.target;
				const sabotageInfo = sabotage.getSabotageById(payload.sabotageId);

				if (targetId === myPlayerId) {
					// Host is the target
					showSabotageIncoming(sabotageInfo, payload.senderName);
				} else {
					// Forward to target client
					const targetConn = network.connections.get(targetId);
					if (targetConn) {
						network.send(targetConn, 'SABOTAGE_APPLY', {
							sabotageId: payload.sabotageId,
							senderName: payload.senderName
						});
					}
				}
			}
			break;

		case 'SABOTAGE_APPLY':
			// Client receives sabotage to apply
			const sabotageInfo = sabotage.getSabotageById(payload.sabotageId);
			if (sabotageInfo) {
				showSabotageIncoming(sabotageInfo, payload.senderName);
			}
			break;

		case 'CHAOS_POINTS':
			// Client receives chaos points award
			sabotage.setChaosPoints(sabotage.chaosPoints + payload.points);
			showPointsEarned(payload.points);
			break;

		case 'WORD_RESULT':
			showWordFeedback(payload.reason, payload.valid);
			break;

		case 'EXPLOSION':
			showExplosion(payload.playerName);
			break;

		case 'GAME_OVER':
			showGameOver(payload.winner, payload.wordsUsed);
			break;
	}
});

// ==================== Initialization ====================

function init() {
	createParticles();
	updateConnectionStatus(NetworkManager.ConnectionState.DISCONNECTED);
	console.log('[Panic Typer] Phase 3 - Sabotage System Ready! 💥');
}

// Handle page unload
window.addEventListener('beforeunload', () => {
	network.destroy();
	game?.reset();
	sabotage.clearAllEffects();
});

// Start the app
init();
