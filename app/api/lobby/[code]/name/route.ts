import { NextRequest, NextResponse } from "next/server";
import { kvStore } from "@/lib/kv-store";
import { Lobby } from "@/types/game";

// Test handler to verify route exists
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  return NextResponse.json({ message: "Name route exists", code });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    console.log("Name update request for lobby:", code);
    
    const { lobbyName, hostId } = await request.json();
    console.log("Lobby name:", lobbyName, "Host ID:", hostId);

    const lobby = await kvStore.getLobby(code);
    console.log("Found lobby:", lobby ? "yes" : "no");

    if (!lobby) {
      console.log("Lobby not found for code:", code);
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

    await kvStore.setLobby(code, lobby, 86400); // 24 hours

    return NextResponse.json({ success: true, lobbyName: lobby.lobbyName });
  } catch (error) {
    console.error("Error updating lobby name:", error);
    return NextResponse.json({ error: "Failed to update lobby name" }, { status: 500 });
  }
}

