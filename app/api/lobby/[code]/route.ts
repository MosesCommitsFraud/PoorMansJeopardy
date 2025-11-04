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

  // Don't send password in response
  const { password, ...lobbyData } = lobby;

  return NextResponse.json({
    ...lobbyData,
    hasPassword: !!password,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { hostId } = body;

  const lobby = await kvStore.getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  if (lobby.hostId !== hostId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await kvStore.deleteLobby(code.toUpperCase());

  return NextResponse.json({ success: true });
}

