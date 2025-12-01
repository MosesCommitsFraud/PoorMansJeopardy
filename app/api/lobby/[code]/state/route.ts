import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";
import { decompressData } from "@/lib/compression";

// Increase body size limit to 50MB for large templates with images
export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  return NextResponse.json(lobby.gameState);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();

  let gameState;

  // Support both compressed and uncompressed data for backward compatibility
  if (body.compressed && body.data) {
    try {
      gameState = decompressData(body.data);
    } catch (error) {
      console.error('Failed to decompress game state:', error);
      return NextResponse.json(
        { error: "Failed to decompress game state" },
        { status: 400 }
      );
    }
  } else {
    gameState = body.gameState;
  }

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  lobby.gameState = gameState;
  // Increment version to trigger updates for all clients
  lobby.version = (lobby.version || 0) + 1;
  lobby.lastModified = Date.now();

  await kvStore.setLobby(code.toUpperCase(), lobby, 86400);

  return NextResponse.json({ success: true, version: lobby.version });
}

