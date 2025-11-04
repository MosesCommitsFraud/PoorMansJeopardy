import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";
import { generateLobbyCode, generateHostId } from "@/lib/lobby-utils";
import { Lobby } from "@/types/game";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  // Generate unique lobby code
  let code = generateLobbyCode();
  let attempts = 0;
  while (await kvStore.getLobby(code) && attempts < 10) {
    code = generateLobbyCode();
    attempts++;
  }

  if (attempts >= 10) {
    return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
  }

  const hostId = generateHostId();

  const lobby: Lobby = {
    code,
    hostId,
    password: password || undefined,
    createdAt: Date.now(),
    isActive: true,
    gameState: {
      categories: [],
      players: [],
      currentQuestion: null,
      buzzerActive: false,
      buzzerQueue: [],
      gameStarted: false,
    },
  };

  // Store lobby for 24 hours
  await kvStore.setLobby(code, lobby, 86400);

  return NextResponse.json({ 
    code, 
    hostId,
    lobbyUrl: `/lobby/${code}`
  });
}

