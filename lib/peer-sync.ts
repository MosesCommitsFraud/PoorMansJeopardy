// PartyKit-based real-time synchronization
// Host acts as the master, players connect to the same party room
// All state changes are broadcast instantly via WebSocket

import PartySocket from "partysocket";
import { GameState, Lobby } from "@/types/game";

// Get PartyKit host from environment - no fallback, must be set
const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;

if (!PARTYKIT_HOST) {
  throw new Error("NEXT_PUBLIC_PARTYKIT_HOST environment variable is required");
}

export type PartyMessage = 
  | { type: "state"; gameState: GameState; version: number }
  | { type: "lobby"; lobby: Lobby; version: number }
  | { type: "buzz"; playerId: string; playerName: string; timestamp: number }
  | { type: "ping" }
  | { type: "pong" }
  | { type: "request-state" }
  | { type: "request-lobby" }
  | { type: "lobby-closed" }
  | { type: "player-kicked"; playerId: string }
  | { type: "join"; role: "host" | "player"; playerId: string }
  | { type: "player-joined"; playerId: string }
  | { type: "player-left"; playerId: string };

export interface PeerSyncCallbacks {
  onStateUpdate?: (gameState: GameState, version: number) => void;
  onLobbyUpdate?: (lobby: Lobby, version: number) => void;
  onBuzz?: (playerId: string, playerName: string) => void;
  onPlayerConnected?: (playerId: string) => void;
  onPlayerDisconnected?: (playerId: string) => void;
  onConnectionStatus?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
  onLobbyClosed?: () => void;
  onPlayerKicked?: (playerId: string) => void;
  onError?: (error: Error) => void;
}

// Global manager instance cache to prevent duplicate connections
const hostManagerCache = new Map<string, { manager: HostPeerManager; refCount: number }>();
const playerManagerCache = new Map<string, { manager: PlayerPeerManager; refCount: number }>();

// Cleanup timeout to delay destruction and allow for navigation
const CLEANUP_DELAY_MS = 2000;
const cleanupTimeouts = new Map<string, NodeJS.Timeout>();

// Get room ID based on lobby code
export function getRoomId(lobbyCode: string): string {
  return `jeopardy-${lobbyCode.toUpperCase()}`;
}

// Get or create a host manager (singleton per lobby)
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
  
  const cached = hostManagerCache.get(cacheKey);
  if (cached && !cached.manager.isDestroyed) {
    cached.refCount++;
    cached.manager.updateCallbacks(callbacks);
    console.log(`[PartySync] Reusing host manager for ${cacheKey}, refCount: ${cached.refCount}`);
    return cached.manager;
  }
  
  // Create new manager
  const manager = new HostPeerManager(lobbyCode, callbacks);
  hostManagerCache.set(cacheKey, { manager, refCount: 1 });
  console.log(`[PartySync] Created new host manager for ${cacheKey}`);
  return manager;
}

// Release a host manager (with delayed cleanup)
export function releaseHostPeer(lobbyCode: string): void {
  const cacheKey = lobbyCode.toUpperCase();
  const cached = hostManagerCache.get(cacheKey);
  
  if (!cached) return;
  
  cached.refCount--;
  console.log(`[PartySync] Released host manager for ${cacheKey}, refCount: ${cached.refCount}`);
  
  if (cached.refCount <= 0) {
    // Delay destruction to allow for navigation between pages
    const timeout = setTimeout(() => {
      const current = hostManagerCache.get(cacheKey);
      if (current && current.refCount <= 0) {
        console.log(`[PartySync] Destroying host manager for ${cacheKey}`);
        current.manager.destroy();
        hostManagerCache.delete(cacheKey);
      }
      cleanupTimeouts.delete(`host-${cacheKey}`);
    }, CLEANUP_DELAY_MS);
    
    cleanupTimeouts.set(`host-${cacheKey}`, timeout);
  }
}

// Get or create a player manager (singleton per lobby+player)
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
  
  const cached = playerManagerCache.get(cacheKey);
  if (cached && !cached.manager.isDestroyed) {
    cached.refCount++;
    cached.manager.updateCallbacks(callbacks);
    console.log(`[PartySync] Reusing player manager for ${cacheKey}, refCount: ${cached.refCount}`);
    return cached.manager;
  }
  
  // Create new manager
  const manager = new PlayerPeerManager(lobbyCode, playerId, callbacks);
  playerManagerCache.set(cacheKey, { manager, refCount: 1 });
  console.log(`[PartySync] Created new player manager for ${cacheKey}`);
  return manager;
}

// Release a player manager (with delayed cleanup)
export function releasePlayerPeer(lobbyCode: string, playerId: string): void {
  const cacheKey = `${lobbyCode.toUpperCase()}-${playerId}`;
  const cached = playerManagerCache.get(cacheKey);
  
  if (!cached) return;
  
  cached.refCount--;
  console.log(`[PartySync] Released player manager for ${cacheKey}, refCount: ${cached.refCount}`);
  
  if (cached.refCount <= 0) {
    // Delay destruction to allow for navigation between pages
    const timeout = setTimeout(() => {
      const current = playerManagerCache.get(cacheKey);
      if (current && current.refCount <= 0) {
        console.log(`[PartySync] Destroying player manager for ${cacheKey}`);
        current.manager.destroy();
        playerManagerCache.delete(cacheKey);
      }
      cleanupTimeouts.delete(`player-${cacheKey}`);
    }, CLEANUP_DELAY_MS);
    
    cleanupTimeouts.set(`player-${cacheKey}`, timeout);
  }
}

// Host Manager - manages the party room as host
export class HostPeerManager {
  private socket: PartySocket | null = null;
  private callbacks: PeerSyncCallbacks;
  private lobbyCode: string;
  private currentState: GameState | null = null;
  private currentLobby: Lobby | null = null;
  private currentVersion: number = 0;
  public isDestroyed: boolean = false;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private connectedPlayerIds: Set<string> = new Set();
  private hostId: string;

  constructor(lobbyCode: string, callbacks: PeerSyncCallbacks) {
    this.lobbyCode = lobbyCode;
    this.callbacks = callbacks;
    // Generate or retrieve host ID
    this.hostId = typeof window !== 'undefined' 
      ? localStorage.getItem("jeopardy_host_id") || `host-${Date.now()}`
      : `host-${Date.now()}`;
  }

  // Update callbacks (used when reusing singleton)
  updateCallbacks(callbacks: PeerSyncCallbacks) {
    this.callbacks = callbacks;
    // Notify new callback of current status
    if (this.isInitialized && this.socket?.readyState === WebSocket.OPEN) {
      this.callbacks.onConnectionStatus?.("connected");
    }
  }

  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Already initialized with open connection
    if (this.isInitialized && this.socket?.readyState === WebSocket.OPEN) {
      this.callbacks.onConnectionStatus?.("connected");
      return Promise.resolve();
    }
    
    if (this.isDestroyed) return;
    
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const roomId = getRoomId(this.lobbyCode);
        console.log(`[PartySync Host] Connecting to room: ${roomId}`);
        
        this.callbacks.onConnectionStatus?.("connecting");
        
        this.socket = new PartySocket({
          host: PARTYKIT_HOST!,
          room: roomId,
        });

        this.socket.addEventListener("open", () => {
          console.log(`[PartySync Host] Connected to room: ${roomId}`);
          this.isInitialized = true;
          this.callbacks.onConnectionStatus?.("connected");
          
          // Identify as host
          this.send({ type: "join", role: "host", playerId: this.hostId });
          
          resolve();
        });

        this.socket.addEventListener("message", (event) => {
          try {
            const message: PartyMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("[PartySync Host] Error parsing message:", error);
          }
        });

        this.socket.addEventListener("error", (error) => {
          console.error("[PartySync Host] Socket error:", error);
          this.callbacks.onError?.(new Error("WebSocket error"));
          this.callbacks.onConnectionStatus?.("error");
        });

        this.socket.addEventListener("close", () => {
          console.log("[PartySync Host] Socket closed");
          this.callbacks.onConnectionStatus?.("disconnected");
        });

      } catch (error) {
        console.error("[PartySync Host] Failed to create socket:", error);
        this.callbacks.onError?.(error as Error);
        this.callbacks.onConnectionStatus?.("error");
        reject(error);
      }
    });
    
    return this.initPromise;
  }

  private handleMessage(message: PartyMessage) {
    switch (message.type) {
      case "buzz":
        console.log(`[PartySync Host] Received buzz from ${message.playerName}`);
        this.callbacks.onBuzz?.(message.playerId, message.playerName);
        break;
        
      case "player-joined":
        console.log(`[PartySync Host] Player joined: ${message.playerId}`);
        this.connectedPlayerIds.add(message.playerId);
        this.callbacks.onPlayerConnected?.(message.playerId);
        break;
        
      case "player-left":
        console.log(`[PartySync Host] Player left: ${message.playerId}`);
        this.connectedPlayerIds.delete(message.playerId);
        this.callbacks.onPlayerDisconnected?.(message.playerId);
        break;
        
      case "request-state":
        // Player requested current state - send it
        if (this.currentState) {
          this.send({
            type: "state",
            gameState: this.currentState,
            version: this.currentVersion
          });
        }
        break;
        
      case "request-lobby":
        // Player requested current lobby - send it
        if (this.currentLobby) {
          this.send({
            type: "lobby",
            lobby: this.currentLobby,
            version: this.currentVersion
          });
        }
        break;
        
      case "pong":
        // Connection is alive
        break;
    }
  }

  private send(message: PartyMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Broadcast game state to all connected players
  broadcastState(gameState: GameState, version: number) {
    this.currentState = gameState;
    this.currentVersion = version;
    
    this.send({
      type: "state",
      gameState,
      version
    });
  }

  // Broadcast lobby state to all connected players
  broadcastLobby(lobby: Lobby, version: number) {
    this.currentLobby = lobby;
    this.currentVersion = version;
    
    this.send({
      type: "lobby",
      lobby,
      version
    });
  }

  // Broadcast lobby closed to all connected players
  broadcastLobbyClosed() {
    console.log("[PartySync Host] Broadcasting lobby closed");
    this.send({ type: "lobby-closed" });
  }

  // Broadcast player kicked to all connected players
  broadcastPlayerKicked(playerId: string) {
    console.log("[PartySync Host] Broadcasting player kicked:", playerId);
    this.send({ type: "player-kicked", playerId });
  }

  getConnectedCount(): number {
    return this.connectedPlayerIds.size;
  }

  getPeerId(): string | undefined {
    return this.hostId;
  }

  destroy() {
    console.log("[PartySync Host] Destroying manager");
    this.isDestroyed = true;
    this.isInitialized = false;
    this.initPromise = null;
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connectedPlayerIds.clear();
  }
}

// Player Manager - connects to party room as player
export class PlayerPeerManager {
  private socket: PartySocket | null = null;
  private callbacks: PeerSyncCallbacks;
  private lobbyCode: string;
  private playerId: string;
  public isDestroyed: boolean = false;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(lobbyCode: string, playerId: string, callbacks: PeerSyncCallbacks) {
    this.lobbyCode = lobbyCode;
    this.playerId = playerId;
    this.callbacks = callbacks;
  }

  // Update callbacks (used when reusing singleton)
  updateCallbacks(callbacks: PeerSyncCallbacks) {
    this.callbacks = callbacks;
    // Notify new callback of current status
    if (this.socket?.readyState === WebSocket.OPEN) {
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
    if (this.isInitialized && this.socket?.readyState === WebSocket.OPEN) {
      this.callbacks.onConnectionStatus?.("connected");
      return Promise.resolve();
    }
    
    if (this.isDestroyed) return;
    
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const roomId = getRoomId(this.lobbyCode);
        console.log(`[PartySync Player] Connecting to room: ${roomId}`);
        
        this.callbacks.onConnectionStatus?.("connecting");
        
        this.socket = new PartySocket({
          host: PARTYKIT_HOST!,
          room: roomId,
        });

        this.socket.addEventListener("open", () => {
          console.log(`[PartySync Player] Connected to room: ${roomId}`);
          this.isInitialized = true;
          this.callbacks.onConnectionStatus?.("connected");
          
          // Identify as player
          this.send({ type: "join", role: "player", playerId: this.playerId });
          
          // Request current state
          this.send({ type: "request-state" });
          this.send({ type: "request-lobby" });
          
          resolve();
        });

        this.socket.addEventListener("message", (event) => {
          try {
            const message: PartyMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("[PartySync Player] Error parsing message:", error);
          }
        });

        this.socket.addEventListener("error", (error) => {
          console.error("[PartySync Player] Socket error:", error);
          this.callbacks.onError?.(new Error("WebSocket error"));
          this.callbacks.onConnectionStatus?.("error");
        });

        this.socket.addEventListener("close", () => {
          console.log("[PartySync Player] Socket closed");
          this.callbacks.onConnectionStatus?.("disconnected");
        });

      } catch (error) {
        console.error("[PartySync Player] Failed to create socket:", error);
        this.callbacks.onError?.(error as Error);
        this.callbacks.onConnectionStatus?.("error");
        reject(error);
      }
    });
    
    return this.initPromise;
  }

  private handleMessage(message: PartyMessage) {
    switch (message.type) {
      case "state":
        this.callbacks.onStateUpdate?.(message.gameState, message.version);
        break;
        
      case "lobby":
        this.callbacks.onLobbyUpdate?.(message.lobby, message.version);
        break;
        
      case "lobby-closed":
        console.log("[PartySync Player] Received lobby-closed message");
        this.callbacks.onLobbyClosed?.();
        break;
        
      case "player-kicked":
        console.log("[PartySync Player] Received player-kicked message for:", message.playerId);
        this.callbacks.onPlayerKicked?.(message.playerId);
        break;
        
      case "pong":
        // Connection is alive
        break;
    }
  }

  private send(message: PartyMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Send buzz to host via party server
  buzz(playerId: string, playerName: string) {
    console.log(`[PartySync Player] Sending buzz: ${playerName}`);
    this.send({
      type: "buzz",
      playerId,
      playerName,
      timestamp: Date.now()
    });
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  destroy() {
    console.log("[PartySync Player] Destroying manager");
    this.isDestroyed = true;
    this.isInitialized = false;
    this.initPromise = null;
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
