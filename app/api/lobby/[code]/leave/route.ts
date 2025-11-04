import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, isHost } = body;

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  // If host is leaving, delete entire lobby
  if (isHost && lobby.hostId === playerId) {
    await kvStore.deleteLobby(code.toUpperCase());
    return NextResponse.json({ 
      success: true, 
      lobbyDeleted: true,
      message: "Lobby closed by host" 
    });
  }

  // If player is leaving, remove them from the lobby
  lobby.gameState.players = lobby.gameState.players.filter(p => p.id !== playerId);
  
  // Increment version to notify all clients
  lobby.version = (lobby.version || 0) + 1;
  lobby.lastModified = Date.now();
  
  await kvStore.setLobby(code.toUpperCase(), lobby, 86400);

  return NextResponse.json({ 
    success: true,
    lobbyDeleted: false,
  });
}

