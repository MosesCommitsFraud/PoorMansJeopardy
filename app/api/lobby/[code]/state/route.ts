import { NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";

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
  const { gameState } = body;

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  lobby.gameState = gameState;
  await kvStore.setLobby(code.toUpperCase(), lobby, 86400);

  return NextResponse.json({ success: true });
}

