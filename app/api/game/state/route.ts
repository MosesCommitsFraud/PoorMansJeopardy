import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function GET() {
  const state = gameStore.getState();
  return NextResponse.json(state);
}

