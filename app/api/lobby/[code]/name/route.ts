import { NextRequest, NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();
    
    const { lobbyName, hostId } = await request.json();

    const lobby = await kvStore.getLobby(code);

    if (!lobby) {
      return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
    }

    // Verify that the requester is the host
    if (lobby.hostId !== hostId) {
      return NextResponse.json({ error: "Only the host can rename the lobby" }, { status: 403 });
    }

    // Update lobby name
    lobby.lobbyName = lobbyName || undefined;
    lobby.version += 1;
    lobby.lastModified = Date.now();

    await kvStore.setLobby(code, lobby, 86400);

    return NextResponse.json({ success: true, lobbyName: lobby.lobbyName });
  } catch (error) {
    console.error("Error updating lobby name:", error);
    return NextResponse.json({ error: "Failed to update lobby name" }, { status: 500 });
  }
}

