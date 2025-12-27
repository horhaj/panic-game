/**
 * GameManager - Core Game Loop for Panic Typer
 * Runs exclusively on the Host's browser
 */

class GameManager {
	static GameState = {
		WAITING: 'waiting',
		PLAYING: 'playing',
		ROUND_END: 'round_end',
		GAME_OVER: 'game_over'
	};

	constructor(networkManager) {
		this.network = networkManager;
		this.dictionary = [];
		this.dictionaryLoaded = false;

		// Game configuration
		this.config = {
			initialLives: 3,
			turnDuration: 10000, // 10 seconds
			bonusTime: 2000, // 2 seconds bonus for correct word
			minWordsForSyllable: 20,
			tickInterval: 100 // Update every 100ms
		};

		// Game state
		this.state = {
			status: GameManager.GameState.WAITING,
			players: [], // [{id, name, lives, isEliminated}]
			currentPlayerIndex: 0,
			currentSyllable: '',
			timeRemaining: 0,
			usedWords: new Set(),
			roundNumber: 1
		};

		// Timer
		this.turnTimer = null;
		this.tickTimer = null;

		// Syllable patterns (common 2-3 letter combos)
		this.syllablePatterns = [
			// 2-letter
			'AB', 'AC', 'AD', 'AG', 'AL', 'AM', 'AN', 'AP', 'AR', 'AS', 'AT', 'AW',
			'BA', 'BE', 'BI', 'BO', 'BR', 'BU',
			'CA', 'CE', 'CH', 'CI', 'CK', 'CO', 'CR', 'CU',
			'DA', 'DE', 'DI', 'DO', 'DR', 'DU',
			'EA', 'ED', 'EE', 'EL', 'EM', 'EN', 'ER', 'ES', 'ET', 'EV', 'EW', 'EX',
			'FA', 'FE', 'FI', 'FL', 'FO', 'FR', 'FU',
			'GA', 'GE', 'GH', 'GI', 'GL', 'GO', 'GR', 'GU',
			'HA', 'HE', 'HI', 'HO', 'HU',
			'IC', 'ID', 'IF', 'IG', 'IL', 'IM', 'IN', 'IO', 'IR', 'IS', 'IT', 'IV',
			'JA', 'JE', 'JO', 'JU',
			'KE', 'KI', 'KN',
			'LA', 'LE', 'LI', 'LL', 'LO', 'LU', 'LY',
			'MA', 'ME', 'MI', 'MO', 'MU',
			'NA', 'NE', 'NI', 'NO', 'NU',
			'OA', 'OB', 'OC', 'OD', 'OF', 'OI', 'OK', 'OL', 'OM', 'ON', 'OO', 'OP', 'OR', 'OS', 'OT', 'OU', 'OV', 'OW',
			'PA', 'PE', 'PH', 'PI', 'PL', 'PO', 'PR', 'PU',
			'QU',
			'RA', 'RE', 'RI', 'RO', 'RU',
			'SA', 'SC', 'SE', 'SH', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'ST', 'SU', 'SW',
			'TA', 'TE', 'TH', 'TI', 'TO', 'TR', 'TU', 'TW',
			'UB', 'UC', 'UD', 'UE', 'UG', 'UL', 'UM', 'UN', 'UP', 'UR', 'US', 'UT',
			'VA', 'VE', 'VI', 'VO',
			'WA', 'WE', 'WH', 'WI', 'WO', 'WR',
			'YA', 'YE', 'YO',
			'ZA', 'ZE', 'ZO',
			// 3-letter (common)
			'ACE', 'ACT', 'AGE', 'AID', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARE', 'ARK', 'ARM', 'ART', 'ASH', 'ATE',
			'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BED', 'BIG', 'BIT', 'BOX', 'BOY', 'BUS', 'BUT', 'BUY',
			'CAN', 'CAP', 'CAR', 'CAT', 'COW', 'CRY', 'CUP', 'CUT',
			'DAD', 'DAY', 'DID', 'DIG', 'DOG', 'DOT', 'DRY',
			'EAR', 'EAT', 'EGG', 'END', 'EYE',
			'FAN', 'FAR', 'FAT', 'FEW', 'FIT', 'FLY', 'FOR', 'FOX', 'FUN',
			'GAP', 'GAS', 'GET', 'GOT', 'GUN', 'GUY',
			'HAD', 'HAM', 'HAS', 'HAT', 'HER', 'HID', 'HIM', 'HIS', 'HIT', 'HOT', 'HOW',
			'ICE', 'ILL', 'INK',
			'JAM', 'JAR', 'JET', 'JOB', 'JOY',
			'KEY', 'KID', 'KIT',
			'LAP', 'LAW', 'LAY', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW',
			'MAD', 'MAN', 'MAP', 'MAT', 'MAY', 'MEN', 'MET', 'MIX', 'MOM', 'MUD',
			'NAP', 'NET', 'NEW', 'NIT', 'NOT', 'NOW', 'NUT',
			'OAK', 'ODD', 'OFF', 'OFT', 'OIL', 'OLD', 'ONE', 'OUR', 'OUT', 'OWE', 'OWL', 'OWN',
			'PAN', 'PAT', 'PAY', 'PEN', 'PET', 'PIE', 'PIG', 'PIN', 'PIT', 'POT', 'PUT',
			'RAN', 'RAT', 'RAW', 'RAY', 'RED', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROT', 'ROW', 'RUB', 'RUG', 'RUN',
			'SAD', 'SAT', 'SAW', 'SAY', 'SEA', 'SET', 'SHE', 'SIT', 'SIX', 'SKY', 'SON', 'SUN',
			'TAN', 'TAP', 'TAX', 'TEA', 'TEN', 'THE', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP', 'TOY', 'TRY', 'TUB', 'TWO',
			'URN', 'USE',
			'VAN', 'VAT', 'VET',
			'WAR', 'WAS', 'WAX', 'WAY', 'WEB', 'WED', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WON', 'WOO',
			'YAM', 'YAP', 'YES', 'YET', 'YOU',
			'ZAP', 'ZEN', 'ZIP', 'ZOO',
			// Common endings
			'ING', 'TER', 'TIO', 'ION', 'ENT', 'ATE', 'OUS', 'IVE', 'LY', 'ED', 'ER', 'EST', 'ISH', 'FUL', 'LESS', 'NESS', 'MENT', 'ABLE', 'IBLE'
		];

		// Callbacks
		this.callbacks = {
			onStateUpdate: null,
			onTurnStart: null,
			onWordValidated: null,
			onExplosion: null,
			onGameOver: null,
			onRoundEnd: null
		};
	}

	/**
	 * Load dictionary from the dictionary.js file
	 */
	async loadDictionary() {
		if (this.dictionaryLoaded) return true;

		try {
			// Dictionary should be loaded as a global variable DICTIONARY
			if (typeof DICTIONARY !== 'undefined' && Array.isArray(DICTIONARY)) {
				this.dictionary = DICTIONARY.map(w => w.toUpperCase());
				this.dictionaryLoaded = true;
				console.log(`[GameManager] Dictionary loaded: ${this.dictionary.length} words`);
				return true;
			} else {
				throw new Error('Dictionary not found');
			}
		} catch (error) {
			console.error('[GameManager] Failed to load dictionary:', error);
			return false;
		}
	}

	/**
	 * Initialize game with players
	 */
	initGame(players) {
		this.state = {
			status: GameManager.GameState.PLAYING,
			players: players.map(p => ({
				id: p.id,
				name: p.name,
				lives: this.config.initialLives,
				isEliminated: false,
				isHost: p.isHost
			})),
			currentPlayerIndex: 0,
			currentSyllable: '',
			timeRemaining: this.config.turnDuration,
			usedWords: new Set(),
			roundNumber: 1
		};

		// Shuffle player order (host goes first for simplicity)
		this.shufflePlayers();

		console.log('[GameManager] Game initialized with players:', this.state.players);
	}

	/**
	 * Shuffle players array
	 */
	shufflePlayers() {
		for (let i = this.state.players.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.state.players[i], this.state.players[j]] = [this.state.players[j], this.state.players[i]];
		}
	}

	/**
	 * Generate a valid syllable that has at least minWordsForSyllable matching words
	 */
	generateSyllable() {
		const shuffled = [...this.syllablePatterns].sort(() => Math.random() - 0.5);

		for (const syllable of shuffled) {
			const matchingWords = this.dictionary.filter(word =>
				word.includes(syllable) && !this.state.usedWords.has(word)
			);

			if (matchingWords.length >= this.config.minWordsForSyllable) {
				console.log(`[GameManager] Selected syllable "${syllable}" with ${matchingWords.length} available words`);
				return syllable;
			}
		}

		// Fallback: pick any 2-letter combo
		const fallback = shuffled[0] || 'IN';
		console.log(`[GameManager] Fallback syllable: ${fallback}`);
		return fallback;
	}

	/**
	 * Start the game
	 */
	startGame() {
		if (!this.dictionaryLoaded) {
			console.error('[GameManager] Dictionary not loaded');
			return false;
		}

		this.state.status = GameManager.GameState.PLAYING;
		this.state.currentSyllable = this.generateSyllable();
		this.startTurn(this.getCurrentPlayer().id);

		return true;
	}

	/**
	 * Get current player
	 */
	getCurrentPlayer() {
		return this.state.players[this.state.currentPlayerIndex];
	}

	/**
	 * Get next active player index
	 */
	getNextPlayerIndex() {
		let nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
		let attempts = 0;

		while (this.state.players[nextIndex].isEliminated && attempts < this.state.players.length) {
			nextIndex = (nextIndex + 1) % this.state.players.length;
			attempts++;
		}

		return nextIndex;
	}

	/**
	 * Start a player's turn
	 */
	startTurn(playerId) {
		this.stopTimers();

		this.state.timeRemaining = this.config.turnDuration;

		// Find player index
		const playerIndex = this.state.players.findIndex(p => p.id === playerId);
		if (playerIndex !== -1) {
			this.state.currentPlayerIndex = playerIndex;
		}

		console.log(`[GameManager] Starting turn for ${this.getCurrentPlayer().name}`);

		// Start the turn timer
		this.startTimer();

		// Broadcast state
		this.broadcastState();

		if (this.callbacks.onTurnStart) {
			this.callbacks.onTurnStart(this.getCurrentPlayer());
		}
	}

	/**
	 * Start the countdown timer
	 */
	startTimer() {
		this.tickTimer = setInterval(() => {
			this.state.timeRemaining -= this.config.tickInterval;

			if (this.state.timeRemaining <= 0) {
				this.explode();
			} else {
				this.broadcastState();
			}
		}, this.config.tickInterval);
	}

	/**
	 * Stop all timers
	 */
	stopTimers() {
		if (this.turnTimer) {
			clearTimeout(this.turnTimer);
			this.turnTimer = null;
		}
		if (this.tickTimer) {
			clearInterval(this.tickTimer);
			this.tickTimer = null;
		}
	}

	/**
	 * Validate a word submission
	 * @param {string} word - The word to validate
	 * @param {string} playerId - The player who submitted
	 * @returns {{valid: boolean, reason: string}}
	 */
	validateWord(word, playerId) {
		const upperWord = word.toUpperCase().trim();
		const currentPlayer = this.getCurrentPlayer();

		// Check if it's the correct player's turn
		if (currentPlayer.id !== playerId) {
			return { valid: false, reason: 'Not your turn!' };
		}

		// Check minimum length
		if (upperWord.length < 3) {
			return { valid: false, reason: 'Word too short!' };
		}

		// Check if word contains the syllable
		if (!upperWord.includes(this.state.currentSyllable)) {
			return { valid: false, reason: `Must contain "${this.state.currentSyllable}"!` };
		}

		// Check if word exists in dictionary
		if (!this.dictionary.includes(upperWord)) {
			return { valid: false, reason: 'Not a valid word!' };
		}

		// Check if word has been used
		if (this.state.usedWords.has(upperWord)) {
			return { valid: false, reason: 'Already used!' };
		}

		// Word is valid!
		return { valid: true, reason: 'Correct!' };
	}

	/**
	 * Handle a word submission
	 */
	handleWordSubmission(word, playerId) {
		const result = this.validateWord(word, playerId);

		if (this.callbacks.onWordValidated) {
			this.callbacks.onWordValidated(word, result, playerId);
		}

		if (result.valid) {
			this.state.usedWords.add(word.toUpperCase());
			this.passTurn();
		}

		return result;
	}

	/**
	 * Pass turn to next player
	 */
	passTurn() {
		this.stopTimers();

		// Generate new syllable
		this.state.currentSyllable = this.generateSyllable();

		// Move to next player
		this.state.currentPlayerIndex = this.getNextPlayerIndex();

		// Start their turn
		this.startTurn(this.getCurrentPlayer().id);
	}

	/**
	 * Handle bomb explosion
	 */
	explode() {
		this.stopTimers();

		const currentPlayer = this.getCurrentPlayer();
		currentPlayer.lives--;

		console.log(`[GameManager] 💥 ${currentPlayer.name} exploded! Lives remaining: ${currentPlayer.lives}`);

		if (this.callbacks.onExplosion) {
			this.callbacks.onExplosion(currentPlayer);
		}

		// Check if player is eliminated
		if (currentPlayer.lives <= 0) {
			currentPlayer.isEliminated = true;
			console.log(`[GameManager] ${currentPlayer.name} has been eliminated!`);
		}

		// Check for game over
		const activePlayers = this.state.players.filter(p => !p.isEliminated);

		if (activePlayers.length <= 1) {
			this.endGame(activePlayers[0] || null);
			return;
		}

		// Continue game - new syllable and next player
		this.state.currentSyllable = this.generateSyllable();
		this.state.currentPlayerIndex = this.getNextPlayerIndex();

		// Short delay before starting next turn
		setTimeout(() => {
			this.startTurn(this.getCurrentPlayer().id);
		}, 2000);

		this.broadcastState();
	}

	/**
	 * End the game
	 */
	endGame(winner) {
		this.stopTimers();
		this.state.status = GameManager.GameState.GAME_OVER;

		console.log(`[GameManager] Game Over! Winner: ${winner ? winner.name : 'No one'}`);

		if (this.callbacks.onGameOver) {
			this.callbacks.onGameOver(winner);
		}

		this.broadcastState();
	}

	/**
	 * Broadcast game state to all clients
	 */
	broadcastState() {
		const stateToSend = {
			status: this.state.status,
			players: this.state.players,
			currentPlayerIndex: this.state.currentPlayerIndex,
			currentPlayerId: this.getCurrentPlayer()?.id,
			currentSyllable: this.state.currentSyllable,
			timeRemaining: this.state.timeRemaining,
			maxTime: this.config.turnDuration,
			usedWordsCount: this.state.usedWords.size,
			roundNumber: this.state.roundNumber
		};

		// Send via network
		this.network.broadcast(NetworkManager.MessageType.GAME_STATE, stateToSend);

		// Also trigger local callback
		if (this.callbacks.onStateUpdate) {
			this.callbacks.onStateUpdate(stateToSend);
		}
	}

	/**
	 * Register callback
	 */
	on(event, callback) {
		if (event in this.callbacks) {
			this.callbacks[event] = callback;
		}
	}

	/**
	 * Get serializable state
	 */
	getState() {
		return {
			status: this.state.status,
			players: this.state.players,
			currentPlayerIndex: this.state.currentPlayerIndex,
			currentPlayerId: this.getCurrentPlayer()?.id,
			currentSyllable: this.state.currentSyllable,
			timeRemaining: this.state.timeRemaining,
			maxTime: this.config.turnDuration,
			usedWordsCount: this.state.usedWords.size,
			roundNumber: this.state.roundNumber
		};
	}

	/**
	 * Reset game
	 */
	reset() {
		this.stopTimers();
		this.state = {
			status: GameManager.GameState.WAITING,
			players: [],
			currentPlayerIndex: 0,
			currentSyllable: '',
			timeRemaining: 0,
			usedWords: new Set(),
			roundNumber: 1
		};
	}
}
