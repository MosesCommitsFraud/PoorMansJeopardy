import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST() {
  gameStore.createDefaultGame();
  return NextResponse.json({ success: true });
}

