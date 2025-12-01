import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";
import { decompressData } from "@/lib/compression";

// Route segment config
export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';
// Note: Body size limit is handled by the deployment platform (Vercel has 4.5MB default)
// We use compression to stay under this limit

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

  try {
    const body = await request.json();
    const bodySize = JSON.stringify(body).length / (1024 * 1024);
    console.log(`[API] Received body size: ${bodySize.toFixed(2)} MB`);

    let gameState;

    // Support both compressed and uncompressed data for backward compatibility
    if (body.compressed && body.data) {
      console.log(`[API] Decompressing data...`);
      try {
        gameState = decompressData(body.data);
        console.log(`[API] Decompression successful`);
      } catch (error) {
        console.error('[API] Failed to decompress game state:', error);
        return NextResponse.json(
          { error: "Failed to decompress game state" },
          { status: 400 }
        );
      }
    } else {
      console.log(`[API] Using uncompressed data`);
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
  } catch (error) {
    console.error('[API] Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

