/**
 * Main Application - Panic Typer
 * Connects UI with NetworkManager
 */

// DOM Elements
const elements = {
	// Screens
	roleScreen: document.getElementById('roleScreen'),
	hostScreen: document.getElementById('hostScreen'),
	joinScreen: document.getElementById('joinScreen'),
	lobbyScreen: document.getElementById('lobbyScreen'),

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

	// Toast Container
	toastContainer: document.getElementById('toastContainer'),

	// Particles
	particles: document.getElementById('particles')
};

// Network Manager Instance
const network = new NetworkManager();

// ==================== Screen Management ====================

function showScreen(screenId) {
	document.querySelectorAll('.screen').forEach(screen => {
		screen.classList.remove('active');
	});
	document.getElementById(screenId).classList.add('active');
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

	setTimeout(() => {
		toast.remove();
	}, 3000);
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

	// Update start button state (need at least 2 players)
	if (isHost) {
		elements.startGameBtn.disabled = players.length < 2;
	}
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
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

		// Random colors
		const colors = ['hsl(340, 100%, 60%)', 'hsl(280, 100%, 65%)', 'hsl(200, 100%, 55%)'];
		particle.style.background = colors[Math.floor(Math.random() * colors.length)];

		container.appendChild(particle);
	}
}

// ==================== Event Handlers ====================

// Host Game Button
elements.hostBtn.addEventListener('click', async () => {
	try {
		const roomCode = await network.hostGame('Host');
		elements.roomCode.textContent = roomCode;
		showScreen('hostScreen');
		renderPlayersList(elements.playersList, network.getPlayers(), true);
		showToast('Room created successfully!', 'success');
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
	showScreen('roleScreen');
});

elements.joinBackBtn.addEventListener('click', () => {
	network.disconnect();
	showScreen('roleScreen');
});

// Leave Button
elements.leaveBtn.addEventListener('click', () => {
	network.disconnect();
	showScreen('roleScreen');
	showToast('Left the room', 'info');
});

// Start Game Button (placeholder for Phase 2)
elements.startGameBtn.addEventListener('click', () => {
	showToast('Game starting... (Coming in Phase 2)', 'info');
	network.sendGameMessage(NetworkManager.MessageType.START_GAME, {});
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

	// Handle game messages (Phase 2+)
	if (type === NetworkManager.MessageType.START_GAME) {
		showToast('Game is starting!', 'info');
	}
});

// ==================== Initialization ====================

function init() {
	createParticles();
	updateConnectionStatus(NetworkManager.ConnectionState.DISCONNECTED);
	console.log('[Panic Typer] Phase 1 - Network Foundation Ready');
}

// Handle page unload
window.addEventListener('beforeunload', () => {
	network.destroy();
});

// Start the app
init();
