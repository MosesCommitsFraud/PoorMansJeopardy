import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  const body = await request.json();
  const { action, playerId, playerName, points } = body;

  if (action === "add") {
    gameStore.addPlayer({
      id: playerId,
      name: playerName,
      score: 0,
    });
  } else if (action === "update_score") {
    gameStore.updatePlayerScore(playerId, points);
  }

  return NextResponse.json({ success: true });
}

