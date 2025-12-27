/**
 * NetworkManager - P2P Networking for Panic Typer
 * Uses PeerJS for peer-to-peer multiplayer
 */

class NetworkManager {
    static MessageType = {
        GAME_STATE: 'GAME_STATE',
        INPUT: 'INPUT',
        SABOTAGE: 'SABOTAGE',
        PLAYER_JOIN: 'PLAYER_JOIN',
        PLAYER_LEAVE: 'PLAYER_LEAVE',
        PLAYER_LIST: 'PLAYER_LIST',
        PING: 'PING',
        PONG: 'PONG',
        START_GAME: 'START_GAME',
        ERROR: 'ERROR'
    };

    static ConnectionState = {
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        ERROR: 'error'
    };

    constructor() {
        this.peer = null;
        this.roomCode = null;
        this.isHost = false;
        this.connections = new Map();
        this.players = new Map();
        this.connectionState = NetworkManager.ConnectionState.DISCONNECTED;
        this.playerName = 'Player';
        this.heartbeatInterval = null;
        this.lastPongTime = new Map();
        this.HEARTBEAT_INTERVAL = 5000;
        this.HEARTBEAT_TIMEOUT = 15000;
        
        this.callbacks = {
            onStateChange: null,
            onPlayerJoin: null,
            onPlayerLeave: null,
            onMessage: null,
            onError: null,
            onRoomCreated: null,
            onJoinedRoom: null,
            onPlayerListUpdate: null
        };
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    roomCodeToPeerId(code) {
        return `panic-typer-${code.toLowerCase()}`;
    }

    setConnectionState(state) {
        this.connectionState = state;
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange(state);
        }
    }

    createPacket(type, payload = null) {
        return { type, payload, timestamp: Date.now(), sender: this.peer?.id || null };
    }

    async hostGame(playerName = 'Host') {
        this.playerName = playerName;
        this.isHost = true;
        this.roomCode = this.generateRoomCode();
        
        return new Promise((resolve, reject) => {
            this.setConnectionState(NetworkManager.ConnectionState.CONNECTING);
            
            const peerId = this.roomCodeToPeerId(this.roomCode);
            this.peer = new Peer(peerId, { debug: 1 });
            
            this.peer.on('open', (id) => {
                console.log(`[Host] Peer opened: ${id}`);
                this.setConnectionState(NetworkManager.ConnectionState.CONNECTED);
                this.players.set(id, { name: this.playerName, isHost: true });
                this.startHeartbeat();
                if (this.callbacks.onRoomCreated) this.callbacks.onRoomCreated(this.roomCode);
                resolve(this.roomCode);
            });
            
            this.peer.on('connection', (conn) => this.handleIncomingConnection(conn));
            this.peer.on('error', (err) => { this.handleError(err); reject(err); });
            this.peer.on('disconnected', () => this.peer.reconnect());
        });
    }

    async joinGame(roomCode, playerName = 'Player') {
        this.playerName = playerName;
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase();
        
        return new Promise((resolve, reject) => {
            this.setConnectionState(NetworkManager.ConnectionState.CONNECTING);
            
            const clientId = `panic-typer-client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            this.peer = new Peer(clientId, { debug: 1 });
            
            this.peer.on('open', (id) => {
                const hostId = this.roomCodeToPeerId(this.roomCode);
                const conn = this.peer.connect(hostId, { reliable: true, metadata: { playerName: this.playerName } });
                
                conn.on('open', () => {
                    this.connections.set(hostId, conn);
                    this.setupConnectionHandlers(conn);
                    this.send(conn, NetworkManager.MessageType.PLAYER_JOIN, { name: this.playerName });
                    this.setConnectionState(NetworkManager.ConnectionState.CONNECTED);
                    this.startHeartbeat();
                    if (this.callbacks.onJoinedRoom) this.callbacks.onJoinedRoom(this.roomCode);
                    resolve();
                });
                
                conn.on('error', (err) => { this.handleError(new Error('Failed to connect')); reject(err); });
                
                setTimeout(() => {
                    if (this.connectionState !== NetworkManager.ConnectionState.CONNECTED) {
                        const err = new Error('Connection timeout');
                        this.handleError(err);
                        reject(err);
                    }
                }, 10000);
            });
            
            this.peer.on('error', (err) => {
                const msg = err.type === 'peer-unavailable' ? 'Room not found' : err.message;
                this.handleError(new Error(msg));
                reject(err);
            });
        });
    }

    handleIncomingConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.lastPongTime.set(conn.peer, Date.now());
            this.setupConnectionHandlers(conn);
        });
    }

    setupConnectionHandlers(conn) {
        conn.on('data', (data) => this.handleMessage(conn, data));
        conn.on('close', () => this.handleDisconnection(conn.peer));
    }

    handleMessage(conn, data) {
        switch (data.type) {
            case NetworkManager.MessageType.PING:
                this.send(conn, NetworkManager.MessageType.PONG, { timestamp: data.payload?.timestamp });
                break;
            case NetworkManager.MessageType.PONG:
                this.lastPongTime.set(conn.peer, Date.now());
                break;
            case NetworkManager.MessageType.PLAYER_JOIN:
                if (this.isHost) {
                    this.players.set(conn.peer, { name: data.payload.name, isHost: false });
                    this.send(conn, NetworkManager.MessageType.PLAYER_LIST, {
                        players: Array.from(this.players.entries()).map(([id, info]) => ({ id, ...info }))
                    });
                    this.broadcast(NetworkManager.MessageType.PLAYER_JOIN, { id: conn.peer, name: data.payload.name }, conn.peer);
                    if (this.callbacks.onPlayerJoin) this.callbacks.onPlayerJoin({ id: conn.peer, name: data.payload.name });
                }
                break;
            case NetworkManager.MessageType.PLAYER_LIST:
                this.players.clear();
                data.payload.players.forEach(p => this.players.set(p.id, { name: p.name, isHost: p.isHost }));
                if (this.callbacks.onPlayerListUpdate) this.callbacks.onPlayerListUpdate(Array.from(this.players.entries()));
                break;
            case NetworkManager.MessageType.PLAYER_LEAVE:
                if (!this.isHost) {
                    this.players.delete(data.payload.id);
                    if (this.callbacks.onPlayerLeave) this.callbacks.onPlayerLeave(data.payload);
                }
                break;
            default:
                if (this.callbacks.onMessage) this.callbacks.onMessage(data.type, data.payload, conn.peer);
        }
    }

    handleDisconnection(peerId) {
        const player = this.players.get(peerId);
        this.connections.delete(peerId);
        this.players.delete(peerId);
        this.lastPongTime.delete(peerId);
        
        if (this.isHost && player) {
            this.broadcast(NetworkManager.MessageType.PLAYER_LEAVE, { id: peerId, name: player.name });
            if (this.callbacks.onPlayerLeave) this.callbacks.onPlayerLeave({ id: peerId, name: player.name });
        } else if (!this.isHost && peerId === this.roomCodeToPeerId(this.roomCode)) {
            this.handleError(new Error('Host disconnected'));
            this.disconnect();
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            this.connections.forEach((conn, peerId) => {
                this.send(conn, NetworkManager.MessageType.PING, { timestamp: now });
                if (this.isHost) {
                    const lastPong = this.lastPongTime.get(peerId) || 0;
                    if (now - lastPong > this.HEARTBEAT_TIMEOUT) {
                        conn.close();
                        this.handleDisconnection(peerId);
                    }
                }
            });
        }, this.HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    }

    send(conn, type, payload = null) {
        if (conn && conn.open) conn.send(this.createPacket(type, payload));
    }

    broadcast(type, payload = null, excludePeer = null) {
        this.connections.forEach((conn, peerId) => {
            if (peerId !== excludePeer) this.send(conn, type, payload);
        });
    }

    sendGameMessage(type, payload) {
        if (this.isHost) {
            this.broadcast(type, payload);
        } else {
            const hostConn = this.connections.get(this.roomCodeToPeerId(this.roomCode));
            if (hostConn) this.send(hostConn, type, payload);
        }
    }

    handleError(err) {
        console.error('[NetworkManager] Error:', err);
        this.setConnectionState(NetworkManager.ConnectionState.ERROR);
        if (this.callbacks.onError) this.callbacks.onError(err);
    }

    on(event, callback) {
        if (event in this.callbacks) this.callbacks[event] = callback;
    }

    getPlayers() {
        return Array.from(this.players.entries()).map(([id, info]) => ({ id, ...info }));
    }

    getPlayerCount() { return this.players.size; }

    disconnect() {
        this.stopHeartbeat();
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        this.players.clear();
        this.lastPongTime.clear();
        if (this.peer) { this.peer.destroy(); this.peer = null; }
        this.roomCode = null;
        this.isHost = false;
        this.setConnectionState(NetworkManager.ConnectionState.DISCONNECTED);
    }

    destroy() { this.disconnect(); this.callbacks = {}; }
}
