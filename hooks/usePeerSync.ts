"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GameState, Lobby } from "@/types/game";
import { 
  HostPeerManager, 
  PlayerPeerManager, 
  PeerSyncCallbacks 
} from "@/lib/peer-sync";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseHostPeerSyncOptions {
  lobbyCode: string;
  enabled?: boolean;
  onBuzz?: (playerId: string, playerName: string) => void;
  onPlayerConnected?: () => void;
}

interface UsePlayerPeerSyncOptions {
  lobbyCode: string;
  playerId: string;
  enabled?: boolean;
  onStateUpdate?: (gameState: GameState, version: number) => void;
  onLobbyUpdate?: (lobby: Lobby, version: number) => void;
}

// Hook for host - manages connections from all players
export function useHostPeerSync({ 
  lobbyCode, 
  enabled = true,
  onBuzz,
  onPlayerConnected: onPlayerConnectedCallback,
}: UseHostPeerSyncOptions) {
  const managerRef = useRef<HostPeerManager | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [connectedPlayers, setConnectedPlayers] = useState(0);
  const [peerId, setPeerId] = useState<string | undefined>();
  const onPlayerConnectedRef = useRef(onPlayerConnectedCallback);

  // Keep callback ref updated
  useEffect(() => {
    onPlayerConnectedRef.current = onPlayerConnectedCallback;
  }, [onPlayerConnectedCallback]);

  useEffect(() => {
    if (!enabled || !lobbyCode) return;

    const callbacks: PeerSyncCallbacks = {
      onConnectionStatus: setStatus,
      onBuzz: onBuzz,
      onPlayerConnected: () => {
        setConnectedPlayers(managerRef.current?.getConnectedCount() ?? 0);
        onPlayerConnectedRef.current?.();
      },
      onPlayerDisconnected: () => {
        setConnectedPlayers(managerRef.current?.getConnectedCount() ?? 0);
      },
      onError: (err) => console.error("[useHostPeerSync] Error:", err),
    };

    const manager = new HostPeerManager(lobbyCode, callbacks);
    managerRef.current = manager;

    manager.initialize().then(() => {
      setPeerId(manager.getPeerId());
    }).catch((err) => {
      console.error("[useHostPeerSync] Failed to initialize:", err);
    });

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [lobbyCode, enabled]);

  // Update onBuzz callback ref
  useEffect(() => {
    if (managerRef.current && onBuzz) {
      // The manager stores callbacks, so we need to update them
      // For now, the callback is set on initialization
    }
  }, [onBuzz]);

  const broadcastState = useCallback((gameState: GameState, version: number) => {
    managerRef.current?.broadcastState(gameState, version);
  }, []);

  const broadcastLobby = useCallback((lobby: Lobby, version: number) => {
    managerRef.current?.broadcastLobby(lobby, version);
  }, []);

  return {
    status,
    connectedPlayers,
    peerId,
    broadcastState,
    broadcastLobby,
    isConnected: status === "connected",
  };
}

// Hook for player - connects to host
export function usePlayerPeerSync({
  lobbyCode,
  playerId,
  enabled = true,
  onStateUpdate,
  onLobbyUpdate,
}: UsePlayerPeerSyncOptions) {
  const managerRef = useRef<PlayerPeerManager | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const onStateUpdateRef = useRef(onStateUpdate);
  const onLobbyUpdateRef = useRef(onLobbyUpdate);

  // Keep callback refs updated
  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
  }, [onStateUpdate]);

  useEffect(() => {
    onLobbyUpdateRef.current = onLobbyUpdate;
  }, [onLobbyUpdate]);

  useEffect(() => {
    if (!enabled || !lobbyCode || !playerId) return;

    const callbacks: PeerSyncCallbacks = {
      onConnectionStatus: setStatus,
      onStateUpdate: (gameState, version) => {
        onStateUpdateRef.current?.(gameState, version);
      },
      onLobbyUpdate: (lobby, version) => {
        onLobbyUpdateRef.current?.(lobby, version);
      },
      onError: (err) => console.error("[usePlayerPeerSync] Error:", err),
    };

    const manager = new PlayerPeerManager(lobbyCode, playerId, callbacks);
    managerRef.current = manager;

    manager.initialize().catch((err) => {
      console.error("[usePlayerPeerSync] Failed to initialize:", err);
    });

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [lobbyCode, playerId, enabled]);

  const buzz = useCallback((playerId: string, playerName: string) => {
    managerRef.current?.buzz(playerId, playerName);
  }, []);

  return {
    status,
    buzz,
    isConnected: status === "connected",
  };
}

