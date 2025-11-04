import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";

// Lightweight endpoint - only returns version number
// Clients poll this (tiny payload) instead of full state
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  return NextResponse.json({ 
    version: lobby.version || 0,
    lastModified: lobby.lastModified || lobby.createdAt,
    buzzerActive: lobby.gameState.buzzerActive,
    buzzerQueueLength: lobby.gameState.buzzerQueue?.length || 0,
  });
}

