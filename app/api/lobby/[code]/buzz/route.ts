import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";

// Instant buzzer registration - no polling needed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, playerName } = body;

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  // Check if buzzer is active
  if (!lobby.gameState.buzzerActive) {
    return NextResponse.json({ error: "Buzzer not active" }, { status: 400 });
  }

  // Check if player already buzzed
  const alreadyBuzzed = lobby.gameState.buzzerQueue?.some(b => b.playerId === playerId);
  if (alreadyBuzzed) {
    return NextResponse.json({ error: "Already buzzed" }, { status: 400 });
  }

  // Add to buzzer queue with server timestamp for fairness
  const buzzerEvent = {
    playerId,
    playerName,
    timestamp: Date.now(), // Server timestamp ensures fairness
  };

  lobby.gameState.buzzerQueue = [...(lobby.gameState.buzzerQueue || []), buzzerEvent];
  lobby.version = (lobby.version || 0) + 1;
  lobby.lastModified = Date.now();

  await kvStore.setLobby(code.toUpperCase(), lobby, 86400);

  // Sort by timestamp and return position
  const sortedQueue = lobby.gameState.buzzerQueue.sort((a, b) => a.timestamp - b.timestamp);
  const position = sortedQueue.findIndex(b => b.playerId === playerId) + 1;

  return NextResponse.json({ 
    success: true,
    position,
    timestamp: buzzerEvent.timestamp,
  });
}

