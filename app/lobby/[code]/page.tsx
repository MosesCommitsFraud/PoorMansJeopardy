"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, Copy, Check, Settings, Play } from "lucide-react";

export default function LobbyRoom({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [lobby, setLobby] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hostId = localStorage.getItem("jeopardy_host_id");
    loadLobby(hostId);
    
    const interval = setInterval(() => loadLobby(hostId), 2000);
    return () => clearInterval(interval);
  }, []);

  const loadLobby = async (hostId: string | null) => {
    try {
      const response = await fetch(`/api/lobby/${resolvedParams.code}`);
      const data = await response.json();

      if (response.ok) {
        setLobby(data);
        setIsHost(data.hostId === hostId);
        setError("");
        
        // If game has started, redirect to game page
        if (data.gameState.gameStarted) {
          if (data.hostId === hostId) {
            router.push(`/host/game/${resolvedParams.code}`);
          } else {
            router.push(`/player/${resolvedParams.code}`);
          }
        }
      } else {
        setError(data.error || "Lobby not found");
      }
    } catch (error) {
      console.error("Error loading lobby:", error);
      setError("Failed to load lobby");
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/lobby/join?code=${resolvedParams.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(resolvedParams.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToSetup = () => {
    router.push(`/host/setup/${resolvedParams.code}`);
  };

  const startGame = async () => {
    if (!lobby?.gameState?.categories?.length) {
      alert("Please set up the game first!");
      return;
    }

    try {
      const gameState = { ...lobby.gameState, gameStarted: true };
      await fetch(`/api/lobby/${resolvedParams.code}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameState }),
      });

      router.push(`/host/game/${resolvedParams.code}`);
    } catch (error) {
      alert("Failed to start game");
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8">
            <p className="text-lg">Loading lobby...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const playerName = localStorage.getItem("jeopardy_player_name");

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-wider">JEOPARDY!</h1>
          <p className="text-xl text-blue-200">
            {isHost ? "Host Lobby" : "Player Lobby"}
          </p>
        </div>

        {/* Lobby Code Card */}
        <Card className="mb-6 bg-gradient-to-br from-yellow-400 to-yellow-600 border-0">
          <CardContent className="p-6 text-center">
            <div className="text-sm font-semibold text-yellow-900 mb-2">LOBBY CODE</div>
            <div className="text-6xl font-bold text-white tracking-widest mb-4 font-mono">
              {resolvedParams.code}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={copyCode} variant="secondary" size="sm">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy Code
              </Button>
              <Button onClick={copyLink} variant="secondary" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Players Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Players in Lobby ({lobby.gameState.players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lobby.gameState.players.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Waiting for players to join...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lobby.gameState.players.map((player: any) => (
                  <div 
                    key={player.id}
                    className={`p-4 rounded-lg flex items-center ${
                      player.name === playerName ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-100"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      player.id === lobby.hostId ? "bg-yellow-500" : "bg-blue-500"
                    }`}>
                      {player.id === lobby.hostId ? (
                        <Crown className="w-5 h-5 text-white" />
                      ) : (
                        <Users className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {player.name}
                        {player.name === playerName && (
                          <span className="ml-2 text-xs text-blue-600">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {player.id === lobby.hostId ? "Host" : "Player"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Host Controls */}
        {isHost && (
          <Card>
            <CardHeader>
              <CardTitle>Host Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Setup:</strong> {lobby.gameState.categories.length > 0 
                    ? `${lobby.gameState.categories.length} categories configured`
                    : "No categories configured"}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Players:</strong> {lobby.gameState.players.length} joined
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={goToSetup} variant="outline" className="flex-1">
                  <Settings className="mr-2 h-4 w-4" />
                  {lobby.gameState.categories.length > 0 ? "Edit Game" : "Setup Game"}
                </Button>
                <Button 
                  onClick={startGame} 
                  className="flex-1"
                  disabled={!lobby.gameState.categories.length}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Game
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Player Waiting */}
        {!isHost && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2">Waiting for host...</h3>
              <p className="text-gray-600">
                The host will start the game when ready. Share the lobby code with your friends!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

