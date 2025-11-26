import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { hostId, playerIdToKick } = body;

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  // Verify that the requester is the host
  if (lobby.hostId !== hostId) {
    return NextResponse.json({ error: "Only the host can kick players" }, { status: 403 });
  }

  // Can't kick the host
  if (playerIdToKick === lobby.hostId) {
    return NextResponse.json({ error: "Cannot kick the host" }, { status: 400 });
  }

  // Find the player being kicked
  const playerToKick = lobby.gameState.players.find(p => p.id === playerIdToKick);
  
  if (!playerToKick) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Remove player from the lobby
  lobby.gameState.players = lobby.gameState.players.filter(p => p.id !== playerIdToKick);
  
  // Increment version to notify all clients
  lobby.version = (lobby.version || 0) + 1;
  lobby.lastModified = Date.now();
  
  await kvStore.setLobby(code.toUpperCase(), lobby, 86400);

  return NextResponse.json({ 
    success: true,
    kickedPlayer: playerToKick.name,
    version: lobby.version
  });
}

