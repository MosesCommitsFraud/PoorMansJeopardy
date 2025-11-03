import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  const body = await request.json();
  const { action, playerId, playerName } = body;

  if (action === "activate") {
    gameStore.activateBuzzer();
  } else if (action === "deactivate") {
    gameStore.deactivateBuzzer();
  } else if (action === "buzz") {
    gameStore.addBuzzer({
      playerId,
      playerName,
      timestamp: Date.now(),
    });
  } else if (action === "clear") {
    gameStore.clearBuzzerQueue();
  }

  const buzzerQueue = gameStore.getBuzzerQueue();
  const state = gameStore.getState();

  return NextResponse.json({ 
    success: true, 
    buzzerActive: state.buzzerActive,
    buzzerQueue 
  });
}

export async function GET() {
  const state = gameStore.getState();
  const buzzerQueue = gameStore.getBuzzerQueue();
  
  return NextResponse.json({
    buzzerActive: state.buzzerActive,
    buzzerQueue,
  });
}

