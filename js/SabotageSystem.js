/**
 * SabotageSystem - Visual Disruptions for Panic Typer
 * Phase 3: The Fun Part!
 * 
 * Implements visual effects that disrupt the active typist
 */

class SabotageSystem {
	/**
	 * Available sabotage types with their costs and durations
	 */
	static Sabotages = {
		FLASHBANG: {
			id: 'flashbang',
			name: 'Flashbang',
			emoji: '💥',
			description: 'Blind them with a flash!',
			cost: 15,
			duration: 2000
		},
		EARTHQUAKE: {
			id: 'earthquake',
			name: 'Earthquake',
			emoji: '🌋',
			description: 'Shake their screen!',
			cost: 10,
			duration: 3000
		},
		DRUNK: {
			id: 'drunk',
			name: 'Drunk Mode',
			emoji: '🍺',
			description: 'Make everything blurry!',
			cost: 20,
			duration: 4000
		},
		REVERSE: {
			id: 'reverse',
			name: 'Reverse',
			emoji: '🔄',
			description: 'Type backwards!',
			cost: 25,
			duration: 5000
		},
		BLACKOUT: {
			id: 'blackout',
			name: 'Blackout',
			emoji: '🌑',
			description: 'Lights out!',
			cost: 30,
			duration: 3000
		},
		TINY_TEXT: {
			id: 'tiny_text',
			name: 'Tiny Text',
			emoji: '🔍',
			description: 'Shrink their input!',
			cost: 12,
			duration: 4000
		}
	};

	constructor() {
		this.activeEffects = new Map();
		this.chaosPoints = 0;
		this.isReverseActive = false;

		// DOM elements
		this.gameScreen = null;
		this.wordInput = null;
		this.flashbangOverlay = null;
		this.blackoutOverlay = null;

		// Callbacks
		this.callbacks = {
			onChaosPointsChange: null,
			onSabotageApplied: null,
			onSabotageEnd: null
		};
	}

	/**
	 * Initialize the sabotage system with DOM references
	 */
	init() {
		this.gameScreen = document.getElementById('gameScreen');
		this.wordInput = document.getElementById('wordInput');

		// Create flashbang overlay
		this.flashbangOverlay = document.createElement('div');
		this.flashbangOverlay.className = 'flashbang-overlay';
		this.flashbangOverlay.id = 'flashbangOverlay';
		document.body.appendChild(this.flashbangOverlay);

		// Create blackout overlay
		this.blackoutOverlay = document.createElement('div');
		this.blackoutOverlay.className = 'blackout-overlay';
		this.blackoutOverlay.id = 'blackoutOverlay';
		document.body.appendChild(this.blackoutOverlay);

		// Setup reverse input handler
		this.setupReverseHandler();

		console.log('[SabotageSystem] Initialized');
	}

	/**
	 * Setup keydown handler for reverse effect
	 */
	setupReverseHandler() {
		if (!this.wordInput) return;

		this.wordInput.addEventListener('keydown', (e) => {
			if (!this.isReverseActive) return;

			// Only intercept printable characters
			if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();

				const start = this.wordInput.selectionStart;
				const end = this.wordInput.selectionEnd;
				const value = this.wordInput.value;

				// Insert character at the beginning instead of cursor position
				this.wordInput.value = e.key.toUpperCase() + value.substring(0, start) + value.substring(end);
				this.wordInput.setSelectionRange(1, 1);
			}
		});
	}

	/**
	 * Award chaos points based on word length
	 * @param {string} word - The valid word typed
	 */
	awardPoints(word) {
		// Points = word length - 2 (minimum 1 point for 3-letter words)
		const points = Math.max(1, word.length - 2);

		// Bonus for longer words
		let bonus = 0;
		if (word.length >= 8) bonus = 5;
		else if (word.length >= 6) bonus = 2;

		const totalPoints = points + bonus;
		this.chaosPoints += totalPoints;

		console.log(`[SabotageSystem] Awarded ${totalPoints} chaos points. Total: ${this.chaosPoints}`);

		if (this.callbacks.onChaosPointsChange) {
			this.callbacks.onChaosPointsChange(this.chaosPoints, totalPoints);
		}

		return totalPoints;
	}

	/**
	 * Check if player can afford a sabotage
	 */
	canAfford(sabotageId) {
		const sabotage = this.getSabotageById(sabotageId);
		return sabotage && this.chaosPoints >= sabotage.cost;
	}

	/**
	 * Get sabotage info by ID
	 */
	getSabotageById(id) {
		return Object.values(SabotageSystem.Sabotages).find(s => s.id === id);
	}

	/**
	 * Spend points to use a sabotage
	 * @returns {boolean} Whether the purchase was successful
	 */
	spendPoints(sabotageId) {
		const sabotage = this.getSabotageById(sabotageId);

		if (!sabotage || this.chaosPoints < sabotage.cost) {
			return false;
		}

		this.chaosPoints -= sabotage.cost;

		if (this.callbacks.onChaosPointsChange) {
			this.callbacks.onChaosPointsChange(this.chaosPoints, -sabotage.cost);
		}

		return true;
	}

	/**
	 * Apply a sabotage effect to the local player
	 * @param {string} sabotageId - The sabotage type to apply
	 */
	applySabotage(sabotageId) {
		const sabotage = this.getSabotageById(sabotageId);
		if (!sabotage) return;

		console.log(`[SabotageSystem] Applying ${sabotage.name}!`);

		// Clear any existing effect of the same type
		this.clearEffect(sabotageId);

		// Apply the effect
		switch (sabotageId) {
			case 'flashbang':
				this.applyFlashbang(sabotage.duration);
				break;
			case 'earthquake':
				this.applyEarthquake(sabotage.duration);
				break;
			case 'drunk':
				this.applyDrunk(sabotage.duration);
				break;
			case 'reverse':
				this.applyReverse(sabotage.duration);
				break;
			case 'blackout':
				this.applyBlackout(sabotage.duration);
				break;
			case 'tiny_text':
				this.applyTinyText(sabotage.duration);
				break;
		}

		if (this.callbacks.onSabotageApplied) {
			this.callbacks.onSabotageApplied(sabotage);
		}
	}

	/**
	 * Flashbang - Full screen white flash that fades out
	 */
	applyFlashbang(duration) {
		this.flashbangOverlay.classList.add('active');

		const timerId = setTimeout(() => {
			this.flashbangOverlay.classList.remove('active');
			this.activeEffects.delete('flashbang');
			this.notifyEffectEnd('flashbang');
		}, duration);

		this.activeEffects.set('flashbang', timerId);
	}

	/**
	 * Earthquake - Shake the game screen violently
	 */
	applyEarthquake(duration) {
		this.gameScreen?.classList.add('effect-earthquake');

		const timerId = setTimeout(() => {
			this.gameScreen?.classList.remove('effect-earthquake');
			this.activeEffects.delete('earthquake');
			this.notifyEffectEnd('earthquake');
		}, duration);

		this.activeEffects.set('earthquake', timerId);
	}

	/**
	 * Drunk Mode - Blur and rotate the input
	 */
	applyDrunk(duration) {
		this.wordInput?.classList.add('effect-drunk');
		this.gameScreen?.classList.add('effect-drunk-screen');

		const timerId = setTimeout(() => {
			this.wordInput?.classList.remove('effect-drunk');
			this.gameScreen?.classList.remove('effect-drunk-screen');
			this.activeEffects.delete('drunk');
			this.notifyEffectEnd('drunk');
		}, duration);

		this.activeEffects.set('drunk', timerId);
	}

	/**
	 * Reverse - Type backwards
	 */
	applyReverse(duration) {
		this.isReverseActive = true;
		this.wordInput?.classList.add('effect-reverse');

		const timerId = setTimeout(() => {
			this.isReverseActive = false;
			this.wordInput?.classList.remove('effect-reverse');
			this.activeEffects.delete('reverse');
			this.notifyEffectEnd('reverse');
		}, duration);

		this.activeEffects.set('reverse', timerId);
	}

	/**
	 * Blackout - Screen goes dark
	 */
	applyBlackout(duration) {
		this.blackoutOverlay.classList.add('active');

		const timerId = setTimeout(() => {
			this.blackoutOverlay.classList.remove('active');
			this.activeEffects.delete('blackout');
			this.notifyEffectEnd('blackout');
		}, duration);

		this.activeEffects.set('blackout', timerId);
	}

	/**
	 * Tiny Text - Shrink the input text
	 */
	applyTinyText(duration) {
		this.wordInput?.classList.add('effect-tiny');

		const timerId = setTimeout(() => {
			this.wordInput?.classList.remove('effect-tiny');
			this.activeEffects.delete('tiny_text');
			this.notifyEffectEnd('tiny_text');
		}, duration);

		this.activeEffects.set('tiny_text', timerId);
	}

	/**
	 * Notify when an effect ends
	 */
	notifyEffectEnd(sabotageId) {
		if (this.callbacks.onSabotageEnd) {
			this.callbacks.onSabotageEnd(sabotageId);
		}
	}

	/**
	 * Clear a specific effect
	 */
	clearEffect(sabotageId) {
		const timerId = this.activeEffects.get(sabotageId);
		if (timerId) {
			clearTimeout(timerId);
			this.activeEffects.delete(sabotageId);
		}

		// Remove CSS classes
		switch (sabotageId) {
			case 'flashbang':
				this.flashbangOverlay?.classList.remove('active');
				break;
			case 'earthquake':
				this.gameScreen?.classList.remove('effect-earthquake');
				break;
			case 'drunk':
				this.wordInput?.classList.remove('effect-drunk');
				this.gameScreen?.classList.remove('effect-drunk-screen');
				break;
			case 'reverse':
				this.isReverseActive = false;
				this.wordInput?.classList.remove('effect-reverse');
				break;
			case 'blackout':
				this.blackoutOverlay?.classList.remove('active');
				break;
			case 'tiny_text':
				this.wordInput?.classList.remove('effect-tiny');
				break;
		}
	}

	/**
	 * Clear all active effects
	 */
	clearAllEffects() {
		for (const [id, timerId] of this.activeEffects) {
			clearTimeout(timerId);
			this.clearEffect(id);
		}
		this.activeEffects.clear();
		this.isReverseActive = false;
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
	 * Get all available sabotages
	 */
	getAllSabotages() {
		return Object.values(SabotageSystem.Sabotages);
	}

	/**
	 * Reset system
	 */
	reset() {
		this.clearAllEffects();
		this.chaosPoints = 0;

		if (this.callbacks.onChaosPointsChange) {
			this.callbacks.onChaosPointsChange(0, 0);
		}
	}

	/**
	 * Set chaos points (for syncing from host)
	 */
	setChaosPoints(points) {
		this.chaosPoints = points;
		if (this.callbacks.onChaosPointsChange) {
			this.callbacks.onChaosPointsChange(points, 0);
		}
	}
}
