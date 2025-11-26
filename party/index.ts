import type * as Party from "partykit/server";

// Message types for communication
type PartyMessage =
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

// Simplified types (these should match your game types)
interface GameState {
  [key: string]: unknown;
}

interface Lobby {
  [key: string]: unknown;
}

interface ConnectionInfo {
  role: "host" | "player";
  playerId: string;
  joinedAt: number;
}

export default class JeopardyParty implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Store connection info by connection ID
  connections: Map<string, ConnectionInfo> = new Map();
  
  // Store current state
  currentState: GameState | null = null;
  currentLobby: Lobby | null = null;
  currentVersion: number = 0;
  hostConnectionId: string | null = null;

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`[Party ${this.room.id}] New connection: ${conn.id}`);
    // Connection will identify itself via a "join" message
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data: PartyMessage = JSON.parse(message);
      
      switch (data.type) {
        case "join":
          this.handleJoin(sender, data);
          break;
          
        case "state":
          this.handleState(sender, data);
          break;
          
        case "lobby":
          this.handleLobby(sender, data);
          break;
          
        case "buzz":
          this.handleBuzz(sender, data);
          break;
          
        case "request-state":
          this.sendCurrentState(sender);
          break;
          
        case "request-lobby":
          this.sendCurrentLobby(sender);
          break;
          
        case "lobby-closed":
          this.broadcastLobbyClosed(sender);
          break;
          
        case "player-kicked":
          this.broadcastPlayerKicked(sender, data.playerId);
          break;
          
        case "ping":
          sender.send(JSON.stringify({ type: "pong" }));
          break;
      }
    } catch (error) {
      console.error(`[Party ${this.room.id}] Error processing message:`, error);
    }
  }

  async onClose(conn: Party.Connection) {
    const info = this.connections.get(conn.id);
    if (info) {
      console.log(`[Party ${this.room.id}] Connection closed: ${conn.id} (${info.role})`);
      
      // If host left, clear host connection
      if (info.role === "host" && this.hostConnectionId === conn.id) {
        this.hostConnectionId = null;
      }
      
      // Notify others that player left
      this.broadcast(JSON.stringify({
        type: "player-left",
        playerId: info.playerId
      }), [conn.id]);
      
      this.connections.delete(conn.id);
    }
  }

  private handleJoin(sender: Party.Connection, data: { role: "host" | "player"; playerId: string }) {
    const info: ConnectionInfo = {
      role: data.role,
      playerId: data.playerId,
      joinedAt: Date.now()
    };
    
    this.connections.set(sender.id, info);
    
    if (data.role === "host") {
      this.hostConnectionId = sender.id;
      console.log(`[Party ${this.room.id}] Host joined: ${data.playerId}`);
    } else {
      console.log(`[Party ${this.room.id}] Player joined: ${data.playerId}`);
      
      // Notify host that a player connected
      if (this.hostConnectionId) {
        const hostConn = this.room.getConnection(this.hostConnectionId);
        if (hostConn) {
          hostConn.send(JSON.stringify({
            type: "player-joined",
            playerId: data.playerId
          }));
        }
      }
      
      // Send current state to new player
      this.sendCurrentState(sender);
      this.sendCurrentLobby(sender);
    }
  }

  private handleState(sender: Party.Connection, data: { gameState: GameState; version: number }) {
    const info = this.connections.get(sender.id);
    
    // Only host can update state
    if (info?.role !== "host") {
      console.log(`[Party ${this.room.id}] Non-host tried to update state`);
      return;
    }
    
    this.currentState = data.gameState;
    this.currentVersion = data.version;
    
    // Broadcast to all except sender
    this.broadcast(JSON.stringify({
      type: "state",
      gameState: data.gameState,
      version: data.version
    }), [sender.id]);
  }

  private handleLobby(sender: Party.Connection, data: { lobby: Lobby; version: number }) {
    const info = this.connections.get(sender.id);
    
    // Only host can update lobby
    if (info?.role !== "host") {
      console.log(`[Party ${this.room.id}] Non-host tried to update lobby`);
      return;
    }
    
    this.currentLobby = data.lobby;
    this.currentVersion = data.version;
    
    // Broadcast to all except sender
    this.broadcast(JSON.stringify({
      type: "lobby",
      lobby: data.lobby,
      version: data.version
    }), [sender.id]);
  }

  private handleBuzz(sender: Party.Connection, data: { playerId: string; playerName: string; timestamp: number }) {
    const info = this.connections.get(sender.id);
    
    // Only players can buzz
    if (info?.role !== "player") {
      return;
    }
    
    console.log(`[Party ${this.room.id}] Buzz from: ${data.playerName}`);
    
    // Forward buzz to host
    if (this.hostConnectionId) {
      const hostConn = this.room.getConnection(this.hostConnectionId);
      if (hostConn) {
        hostConn.send(JSON.stringify({
          type: "buzz",
          playerId: data.playerId,
          playerName: data.playerName,
          timestamp: data.timestamp
        }));
      }
    }
  }

  private sendCurrentState(conn: Party.Connection) {
    if (this.currentState) {
      conn.send(JSON.stringify({
        type: "state",
        gameState: this.currentState,
        version: this.currentVersion
      }));
    }
  }

  private sendCurrentLobby(conn: Party.Connection) {
    if (this.currentLobby) {
      conn.send(JSON.stringify({
        type: "lobby",
        lobby: this.currentLobby,
        version: this.currentVersion
      }));
    }
  }

  private broadcastLobbyClosed(sender: Party.Connection) {
    const info = this.connections.get(sender.id);
    
    // Only host can close lobby
    if (info?.role !== "host") {
      return;
    }
    
    console.log(`[Party ${this.room.id}] Lobby closed by host`);
    
    // Broadcast to all except sender
    this.broadcast(JSON.stringify({ type: "lobby-closed" }), [sender.id]);
  }

  private broadcastPlayerKicked(sender: Party.Connection, playerId: string) {
    const info = this.connections.get(sender.id);
    
    // Only host can kick players
    if (info?.role !== "host") {
      return;
    }
    
    console.log(`[Party ${this.room.id}] Player kicked: ${playerId}`);
    
    // Broadcast to all except sender
    this.broadcast(JSON.stringify({ type: "player-kicked", playerId }), [sender.id]);
  }

  private broadcast(message: string, excludeIds: string[] = []) {
    for (const conn of this.room.getConnections()) {
      if (!excludeIds.includes(conn.id)) {
        conn.send(message);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

