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
  | { type: "request-lobby" };

export interface PeerSyncCallbacks {
  onStateUpdate?: (gameState: GameState, version: number) => void;
  onLobbyUpdate?: (lobby: Lobby, version: number) => void;
  onBuzz?: (playerId: string, playerName: string) => void;
  onPlayerConnected?: (peerId: string) => void;
  onPlayerDisconnected?: (peerId: string) => void;
  onConnectionStatus?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
  onError?: (error: Error) => void;
}

// Generate a peer ID based on lobby code
export function getHostPeerId(lobbyCode: string): string {
  return `jeopardy-host-${lobbyCode.toUpperCase()}`;
}

export function getPlayerPeerId(lobbyCode: string, playerId: string): string {
  return `jeopardy-player-${lobbyCode.toUpperCase()}-${playerId.slice(0, 8)}`;
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
  private isDestroyed: boolean = false;

  constructor(lobbyCode: string, callbacks: PeerSyncCallbacks) {
    this.lobbyCode = lobbyCode;
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    if (this.isDestroyed) return;
    
    return new Promise((resolve, reject) => {
      const peerId = getHostPeerId(this.lobbyCode);
      
      this.peer = new Peer(peerId, {
        debug: 0, // Minimal logging
      });

      this.peer.on("open", (id) => {
        console.log("[PeerSync Host] Connected with ID:", id);
        this.callbacks.onConnectionStatus?.("connected");
        resolve();
      });

      this.peer.on("connection", (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on("error", (err) => {
        console.error("[PeerSync Host] Error:", err);
        // If ID is taken, the host might already exist (stale connection)
        if (err.type === "unavailable-id") {
          // Try to reconnect with a random suffix
          this.peer?.destroy();
          this.peer = new Peer(`${peerId}-${Date.now()}`, { debug: 0 });
          this.peer.on("open", () => {
            this.callbacks.onConnectionStatus?.("connected");
            resolve();
          });
          this.peer.on("connection", (conn) => this.handleNewConnection(conn));
        } else {
          this.callbacks.onError?.(err);
          this.callbacks.onConnectionStatus?.("error");
          reject(err);
        }
      });

      this.peer.on("disconnected", () => {
        console.log("[PeerSync Host] Disconnected, attempting reconnect...");
        this.callbacks.onConnectionStatus?.("disconnected");
        if (!this.isDestroyed) {
          this.peer?.reconnect();
        }
      });
    });
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

  getConnectedCount(): number {
    return this.connections.size;
  }

  getPeerId(): string | undefined {
    return this.peer?.id;
  }

  destroy() {
    this.isDestroyed = true;
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer?.destroy();
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
  private isDestroyed: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(lobbyCode: string, playerId: string, callbacks: PeerSyncCallbacks) {
    this.lobbyCode = lobbyCode;
    this.playerId = playerId;
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    if (this.isDestroyed) return;
    
    return new Promise((resolve, reject) => {
      const peerId = getPlayerPeerId(this.lobbyCode, this.playerId);
      
      this.peer = new Peer(peerId, {
        debug: 0,
      });

      this.peer.on("open", (id) => {
        console.log("[PeerSync Player] Connected with ID:", id);
        this.connectToHost();
        resolve();
      });

      this.peer.on("error", (err) => {
        console.error("[PeerSync Player] Error:", err);
        if (err.type === "unavailable-id") {
          // Try with random suffix
          this.peer?.destroy();
          this.peer = new Peer(`${peerId}-${Date.now()}`, { debug: 0 });
          this.peer.on("open", () => {
            this.connectToHost();
            resolve();
          });
        } else if (err.type === "peer-unavailable") {
          // Host not available yet, will retry
          this.callbacks.onConnectionStatus?.("connecting");
          this.scheduleReconnect();
        } else {
          this.callbacks.onError?.(err);
          this.callbacks.onConnectionStatus?.("error");
        }
      });

      this.peer.on("disconnected", () => {
        console.log("[PeerSync Player] Disconnected from server");
        this.callbacks.onConnectionStatus?.("disconnected");
        if (!this.isDestroyed) {
          this.peer?.reconnect();
        }
      });
    });
  }

  private connectToHost() {
    if (this.isDestroyed || !this.peer) return;
    
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
      this.callbacks.onConnectionStatus?.("disconnected");
      if (!this.isDestroyed) {
        this.scheduleReconnect();
      }
    });

    conn.on("error", (err) => {
      console.error("[PeerSync Player] Connection error:", err);
      this.hostConnection = null;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * this.reconnectAttempts, 5000);
    console.log(`[PeerSync Player] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.connectToHost();
      }
    }, delay);
  }

  private handleMessage(message: PeerMessage) {
    switch (message.type) {
      case "state":
        this.callbacks.onStateUpdate?.(message.gameState, message.version);
        break;
      case "lobby":
        this.callbacks.onLobbyUpdate?.(message.lobby, message.version);
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
    this.isDestroyed = true;
    this.hostConnection?.close();
    this.hostConnection = null;
    this.peer?.destroy();
    this.peer = null;
  }
}

