import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";
import { generatePlayerId } from "@/lib/lobby-utils";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, playerName, password } = body;

  if (!code || !playerName) {
    return NextResponse.json({ error: "Code and player name required" }, { status: 400 });
  }

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  if (!lobby.isActive) {
    return NextResponse.json({ error: "Lobby is no longer active" }, { status: 410 });
  }

  // Check password if set
  if (lobby.password && lobby.password !== password) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  // Check if player name is already taken
  const nameTaken = lobby.gameState.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (nameTaken) {
    return NextResponse.json({ error: "Player name already taken" }, { status: 409 });
  }

  const playerId = generatePlayerId();

  // Add player to lobby
  lobby.gameState.players.push({
    id: playerId,
    name: playerName,
    score: 0,
    isHost: false,
  });

  // Increment version to trigger updates for all clients
  lobby.version = (lobby.version || 0) + 1;
  lobby.lastModified = Date.now();

  await kvStore.setLobby(code.toUpperCase(), lobby, 86400);

  return NextResponse.json({ 
    success: true,
    playerId,
    code: lobby.code,
  });
}

