// PeerJS-based real-time synchronization
// Host acts as the master peer, players connect to host
// All state changes are broadcast instantly via WebRTC

import Peer, { DataConnection } from "peerjs";
import { GameState, Lobby } from "@/types/game";

export type PeerMessage = 
  | { type: "state"; gameState: GameState; version: number }
  | { type: "lobby"; lobby: Lobby; version: number }
  | { type: "buzz"; playerId: string; playerName: string }
  | { type: "ping" }
  | { type: "pong" }
  | { type: "request-state" }
  | { type: "request-lobby" }
  | { type: "lobby-closed" };

export interface PeerSyncCallbacks {
  onStateUpdate?: (gameState: GameState, version: number) => void;
  onLobbyUpdate?: (lobby: Lobby, version: number) => void;
  onBuzz?: (playerId: string, playerName: string) => void;
  onPlayerConnected?: (peerId: string) => void;
  onPlayerDisconnected?: (peerId: string) => void;
  onConnectionStatus?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
  onLobbyClosed?: () => void;
  onError?: (error: Error) => void;
}

// Global peer instance cache to prevent duplicate connections
// Key: lobbyCode, Value: { manager, refCount }
const hostPeerCache = new Map<string, { manager: HostPeerManager; refCount: number }>();
const playerPeerCache = new Map<string, { manager: PlayerPeerManager; refCount: number }>();

// Cleanup timeout to delay destruction and allow for navigation
const CLEANUP_DELAY_MS = 2000;
const cleanupTimeouts = new Map<string, NodeJS.Timeout>();

// Generate a peer ID based on lobby code
export function getHostPeerId(lobbyCode: string): string {
  return `jeopardy-host-${lobbyCode.toUpperCase()}`;
}

export function getPlayerPeerId(lobbyCode: string, playerId: string): string {
  return `jeopardy-player-${lobbyCode.toUpperCase()}-${playerId.slice(0, 8)}`;
}

// Get or create a host peer manager (singleton per lobby)
export function getOrCreateHostPeer(
  lobbyCode: string, 
  callbacks: PeerSyncCallbacks
): HostPeerManager {
  const cacheKey = lobbyCode.toUpperCase();
  
  // Cancel any pending cleanup
  const pendingCleanup = cleanupTimeouts.get(`host-${cacheKey}`);
  if (pendingCleanup) {
    clearTimeout(pendingCleanup);
    cleanupTimeouts.delete(`host-${cacheKey}`);
  }
  
  const cached = hostPeerCache.get(cacheKey);
  if (cached && !cached.manager.isDestroyed) {
    cached.refCount++;
    cached.manager.updateCallbacks(callbacks);
    console.log(`[PeerSync] Reusing host peer for ${cacheKey}, refCount: ${cached.refCount}`);
    return cached.manager;
  }
  
  // Create new manager
  const manager = new HostPeerManager(lobbyCode, callbacks);
  hostPeerCache.set(cacheKey, { manager, refCount: 1 });
  console.log(`[PeerSync] Created new host peer for ${cacheKey}`);
  return manager;
}

// Release a host peer (with delayed cleanup)
export function releaseHostPeer(lobbyCode: string): void {
  const cacheKey = lobbyCode.toUpperCase();
  const cached = hostPeerCache.get(cacheKey);
  
  if (!cached) return;
  
  cached.refCount--;
  console.log(`[PeerSync] Released host peer for ${cacheKey}, refCount: ${cached.refCount}`);
  
  if (cached.refCount <= 0) {
    // Delay destruction to allow for navigation between pages
    const timeout = setTimeout(() => {
      const current = hostPeerCache.get(cacheKey);
      if (current && current.refCount <= 0) {
        console.log(`[PeerSync] Destroying host peer for ${cacheKey}`);
        current.manager.destroy();
        hostPeerCache.delete(cacheKey);
      }
      cleanupTimeouts.delete(`host-${cacheKey}`);
    }, CLEANUP_DELAY_MS);
    
    cleanupTimeouts.set(`host-${cacheKey}`, timeout);
  }
}

// Get or create a player peer manager (singleton per lobby+player)
export function getOrCreatePlayerPeer(
  lobbyCode: string,
  playerId: string,
  callbacks: PeerSyncCallbacks
): PlayerPeerManager {
  const cacheKey = `${lobbyCode.toUpperCase()}-${playerId}`;
  
  // Cancel any pending cleanup
  const pendingCleanup = cleanupTimeouts.get(`player-${cacheKey}`);
  if (pendingCleanup) {
    clearTimeout(pendingCleanup);
    cleanupTimeouts.delete(`player-${cacheKey}`);
  }
  
  const cached = playerPeerCache.get(cacheKey);
  if (cached && !cached.manager.isDestroyed) {
    cached.refCount++;
    cached.manager.updateCallbacks(callbacks);
    console.log(`[PeerSync] Reusing player peer for ${cacheKey}, refCount: ${cached.refCount}`);
    return cached.manager;
  }
  
  // Create new manager
  const manager = new PlayerPeerManager(lobbyCode, playerId, callbacks);
  playerPeerCache.set(cacheKey, { manager, refCount: 1 });
  console.log(`[PeerSync] Created new player peer for ${cacheKey}`);
  return manager;
}

// Release a player peer (with delayed cleanup)
export function releasePlayerPeer(lobbyCode: string, playerId: string): void {
  const cacheKey = `${lobbyCode.toUpperCase()}-${playerId}`;
  const cached = playerPeerCache.get(cacheKey);
  
  if (!cached) return;
  
  cached.refCount--;
  console.log(`[PeerSync] Released player peer for ${cacheKey}, refCount: ${cached.refCount}`);
  
  if (cached.refCount <= 0) {
    // Delay destruction to allow for navigation between pages
    const timeout = setTimeout(() => {
      const current = playerPeerCache.get(cacheKey);
      if (current && current.refCount <= 0) {
        console.log(`[PeerSync] Destroying player peer for ${cacheKey}`);
        current.manager.destroy();
        playerPeerCache.delete(cacheKey);
      }
      cleanupTimeouts.delete(`player-${cacheKey}`);
    }, CLEANUP_DELAY_MS);
    
    cleanupTimeouts.set(`player-${cacheKey}`, timeout);
  }
}

// Host Peer Manager - handles multiple player connections
export class HostPeerManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private callbacks: PeerSyncCallbacks;
  private lobbyCode: string;
  private currentState: GameState | null = null;
  private currentLobby: Lobby | null = null;
  private currentVersion: number = 0;
  public isDestroyed: boolean = false;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastReconnectAttempt: number = 0;
  private reconnectBackoff: number = 1000; // Start with 1 second

  constructor(lobbyCode: string, callbacks: PeerSyncCallbacks) {
    this.lobbyCode = lobbyCode;
    this.callbacks = callbacks;
  }

  // Update callbacks (used when reusing singleton)
  updateCallbacks(callbacks: PeerSyncCallbacks) {
    this.callbacks = callbacks;
    // Notify new callback of current status
    if (this.isInitialized && this.peer?.open) {
      this.callbacks.onConnectionStatus?.("connected");
    }
  }

  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Already initialized
    if (this.isInitialized && this.peer?.open) {
      this.callbacks.onConnectionStatus?.("connected");
      return Promise.resolve();
    }
    
    if (this.isDestroyed) return;
    
    this.initPromise = new Promise((resolve, reject) => {
      const peerId = getHostPeerId(this.lobbyCode);
      
      this.peer = new Peer(peerId, {
        debug: 0, // Minimal logging
      });

      this.peer.on("open", (id) => {
        console.log("[PeerSync Host] Connected with ID:", id);
        this.isInitialized = true;
        this.reconnectBackoff = 1000; // Reset backoff on success
        this.callbacks.onConnectionStatus?.("connected");
        resolve();
      });

      this.peer.on("connection", (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on("error", (err) => {
        console.error("[PeerSync Host] Error:", err);
        // If ID is taken, wait and retry with same ID (let old connection time out)
        if (err.type === "unavailable-id") {
          console.log("[PeerSync Host] ID unavailable, will retry after backoff");
          this.peer?.destroy();
          this.peer = null;
          
          // Exponential backoff retry
          this.scheduleReconnect(() => {
            if (!this.isDestroyed) {
              this.initPromise = null; // Allow re-initialization
              this.initialize().then(resolve).catch(reject);
            }
          });
        } else {
          this.callbacks.onError?.(err);
          this.callbacks.onConnectionStatus?.("error");
          reject(err);
        }
      });

      this.peer.on("disconnected", () => {
        console.log("[PeerSync Host] Disconnected from signaling server");
        this.callbacks.onConnectionStatus?.("disconnected");
        if (!this.isDestroyed && this.peer) {
          // Use backoff for reconnection
          this.scheduleReconnect(() => {
            if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
            }
          });
        }
      });
    });
    
    return this.initPromise;
  }

  private scheduleReconnect(action: () => void) {
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Rate limit: don't reconnect more than once per second
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastReconnectAttempt;
    const delay = Math.max(this.reconnectBackoff, this.reconnectBackoff - timeSinceLastAttempt);
    
    console.log(`[PeerSync Host] Scheduling reconnect in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.lastReconnectAttempt = Date.now();
      // Increase backoff for next time (max 30 seconds)
      this.reconnectBackoff = Math.min(this.reconnectBackoff * 1.5, 30000);
      action();
    }, delay);
  }

  private handleNewConnection(conn: DataConnection) {
    console.log("[PeerSync Host] New player connection:", conn.peer);
    
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);
      this.callbacks.onPlayerConnected?.(conn.peer);
      
      // Send current lobby state to new player
      if (this.currentLobby) {
        this.sendTo(conn, {
          type: "lobby",
          lobby: this.currentLobby,
          version: this.currentVersion
        });
      }
      // Also send game state if available
      if (this.currentState) {
        this.sendTo(conn, {
          type: "state",
          gameState: this.currentState,
          version: this.currentVersion
        });
      }
    });

    conn.on("data", (data) => {
      const message = data as PeerMessage;
      this.handleMessage(conn.peer, message);
    });

    conn.on("close", () => {
      console.log("[PeerSync Host] Player disconnected:", conn.peer);
      this.connections.delete(conn.peer);
      this.callbacks.onPlayerDisconnected?.(conn.peer);
    });

    conn.on("error", (err) => {
      console.error("[PeerSync Host] Connection error:", err);
      this.connections.delete(conn.peer);
    });
  }

  private handleMessage(peerId: string, message: PeerMessage) {
    switch (message.type) {
      case "buzz":
        this.callbacks.onBuzz?.(message.playerId, message.playerName);
        break;
      case "request-state":
        const stateConn = this.connections.get(peerId);
        if (stateConn && this.currentState) {
          this.sendTo(stateConn, {
            type: "state",
            gameState: this.currentState,
            version: this.currentVersion
          });
        }
        break;
      case "request-lobby":
        const lobbyConn = this.connections.get(peerId);
        if (lobbyConn && this.currentLobby) {
          this.sendTo(lobbyConn, {
            type: "lobby",
            lobby: this.currentLobby,
            version: this.currentVersion
          });
        }
        break;
      case "ping":
        const pongConn = this.connections.get(peerId);
        if (pongConn) {
          this.sendTo(pongConn, { type: "pong" });
        }
        break;
    }
  }

  private sendTo(conn: DataConnection, message: PeerMessage) {
    if (conn.open) {
      conn.send(message);
    }
  }

  // Broadcast game state to all connected players
  broadcastState(gameState: GameState, version: number) {
    this.currentState = gameState;
    this.currentVersion = version;
    
    const message: PeerMessage = { type: "state", gameState, version };
    this.connections.forEach((conn) => {
      this.sendTo(conn, message);
    });
  }

  // Broadcast lobby state to all connected players
  broadcastLobby(lobby: Lobby, version: number) {
    this.currentLobby = lobby;
    this.currentVersion = version;
    
    const message: PeerMessage = { type: "lobby", lobby, version };
    this.connections.forEach((conn) => {
      this.sendTo(conn, message);
    });
  }

  // Broadcast lobby closed to all connected players
  broadcastLobbyClosed() {
    console.log("[PeerSync Host] Broadcasting lobby closed to all players");
    const message: PeerMessage = { type: "lobby-closed" };
    this.connections.forEach((conn) => {
      this.sendTo(conn, message);
    });
  }

  getConnectedCount(): number {
    return this.connections.size;
  }

  getPeerId(): string | undefined {
    return this.peer?.id;
  }

  destroy() {
    console.log("[PeerSync Host] Destroying peer manager");
    this.isDestroyed = true;
    this.isInitialized = false;
    this.initPromise = null;
    
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
    }
    this.peer = null;
  }
}

// Player Peer Manager - connects to host
export class PlayerPeerManager {
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private callbacks: PeerSyncCallbacks;
  private lobbyCode: string;
  private playerId: string;
  public isDestroyed: boolean = false;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectBackoff: number = 1000;
  private lastReconnectAttempt: number = 0;
  private isConnectingToHost: boolean = false;

  constructor(lobbyCode: string, playerId: string, callbacks: PeerSyncCallbacks) {
    this.lobbyCode = lobbyCode;
    this.playerId = playerId;
    this.callbacks = callbacks;
  }

  // Update callbacks (used when reusing singleton)
  updateCallbacks(callbacks: PeerSyncCallbacks) {
    this.callbacks = callbacks;
    // Notify new callback of current status
    if (this.hostConnection?.open) {
      this.callbacks.onConnectionStatus?.("connected");
    } else if (this.isInitialized) {
      this.callbacks.onConnectionStatus?.("connecting");
    }
  }

  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Already initialized with open connection
    if (this.isInitialized && this.peer?.open) {
      // If we have a host connection, we're good
      if (this.hostConnection?.open) {
        this.callbacks.onConnectionStatus?.("connected");
      } else {
        // Peer is open but no host connection, try to connect
        this.connectToHost();
      }
      return Promise.resolve();
    }
    
    if (this.isDestroyed) return;
    
    this.initPromise = new Promise((resolve, reject) => {
      const peerId = getPlayerPeerId(this.lobbyCode, this.playerId);
      
      this.peer = new Peer(peerId, {
        debug: 0,
      });

      this.peer.on("open", (id) => {
        console.log("[PeerSync Player] Connected with ID:", id);
        this.isInitialized = true;
        this.reconnectBackoff = 1000; // Reset backoff
        this.connectToHost();
        resolve();
      });

      this.peer.on("error", (err) => {
        console.error("[PeerSync Player] Error:", err);
        if (err.type === "unavailable-id") {
          // Wait and retry with same ID (let old connection time out)
          console.log("[PeerSync Player] ID unavailable, will retry after backoff");
          this.peer?.destroy();
          this.peer = null;
          
          this.scheduleReconnect(() => {
            if (!this.isDestroyed) {
              this.initPromise = null;
              this.initialize().then(resolve).catch(reject);
            }
          });
        } else if (err.type === "peer-unavailable") {
          // Host not available yet, will retry connecting to host
          this.callbacks.onConnectionStatus?.("connecting");
          this.scheduleHostReconnect();
        } else {
          this.callbacks.onError?.(err);
          this.callbacks.onConnectionStatus?.("error");
        }
      });

      this.peer.on("disconnected", () => {
        console.log("[PeerSync Player] Disconnected from server");
        this.callbacks.onConnectionStatus?.("disconnected");
        if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
          this.scheduleReconnect(() => {
            if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
            }
          });
        }
      });
    });
    
    return this.initPromise;
  }

  private connectToHost() {
    if (this.isDestroyed || !this.peer || this.isConnectingToHost) return;
    
    // If already connected, don't reconnect
    if (this.hostConnection?.open) {
      console.log("[PeerSync Player] Already connected to host");
      return;
    }
    
    this.isConnectingToHost = true;
    const hostPeerId = getHostPeerId(this.lobbyCode);
    console.log("[PeerSync Player] Connecting to host:", hostPeerId);
    this.callbacks.onConnectionStatus?.("connecting");
    
    const conn = this.peer.connect(hostPeerId, {
      reliable: true,
    });

    conn.on("open", () => {
      console.log("[PeerSync Player] Connected to host!");
      this.hostConnection = conn;
      this.reconnectAttempts = 0;
      this.reconnectBackoff = 1000;
      this.isConnectingToHost = false;
      this.callbacks.onConnectionStatus?.("connected");
      
      // Request current state
      this.send({ type: "request-state" });
    });

    conn.on("data", (data) => {
      const message = data as PeerMessage;
      this.handleMessage(message);
    });

    conn.on("close", () => {
      console.log("[PeerSync Player] Connection to host closed");
      this.hostConnection = null;
      this.isConnectingToHost = false;
      this.callbacks.onConnectionStatus?.("disconnected");
      if (!this.isDestroyed) {
        this.scheduleHostReconnect();
      }
    });

    conn.on("error", (err) => {
      console.error("[PeerSync Player] Connection error:", err);
      this.hostConnection = null;
      this.isConnectingToHost = false;
      this.scheduleHostReconnect();
    });
  }

  private scheduleReconnect(action: () => void) {
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Rate limit
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastReconnectAttempt;
    const delay = Math.max(this.reconnectBackoff, this.reconnectBackoff - timeSinceLastAttempt);
    
    console.log(`[PeerSync Player] Scheduling reconnect in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.lastReconnectAttempt = Date.now();
      this.reconnectBackoff = Math.min(this.reconnectBackoff * 1.5, 30000);
      action();
    }, delay);
  }

  private scheduleHostReconnect() {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[PeerSync Player] Max reconnect attempts reached");
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 10000);
    console.log(`[PeerSync Player] Reconnecting to host in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.scheduleReconnect(() => {
      if (!this.isDestroyed && this.peer?.open) {
        this.connectToHost();
      }
    });
  }

  private handleMessage(message: PeerMessage) {
    switch (message.type) {
      case "state":
        this.callbacks.onStateUpdate?.(message.gameState, message.version);
        break;
      case "lobby":
        this.callbacks.onLobbyUpdate?.(message.lobby, message.version);
        break;
      case "lobby-closed":
        console.log("[PeerSync Player] Received lobby-closed message");
        this.callbacks.onLobbyClosed?.();
        break;
      case "pong":
        // Connection is alive
        break;
    }
  }

  send(message: PeerMessage) {
    if (this.hostConnection?.open) {
      this.hostConnection.send(message);
    }
  }

  // Send buzz to host
  buzz(playerId: string, playerName: string) {
    this.send({ type: "buzz", playerId, playerName });
  }

  isConnected(): boolean {
    return this.hostConnection?.open ?? false;
  }

  destroy() {
    console.log("[PeerSync Player] Destroying peer manager");
    this.isDestroyed = true;
    this.isInitialized = false;
    this.initPromise = null;
    this.isConnectingToHost = false;
    
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
    }
    this.peer = null;
  }
}

