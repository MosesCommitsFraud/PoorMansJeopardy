"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Crown, Users, Copy, Check, Settings, Play, LogOut, XCircle, AlertCircle, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@heroui/spinner";
import { 
  AlertDialog, 
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent, 
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

export default function LobbyRoom({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [lobby, setLobby] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState("");
  const [currentVersion, setCurrentVersion] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [lobbyName, setLobbyName] = useState("");

  useEffect(() => {
    const hostId = localStorage.getItem("jeopardy_host_id");
    loadLobby(hostId);
    
    // Smart polling: only check version endpoint (tiny payload)
    const interval = setInterval(async () => {
      if (lobby?.gameState?.gameStarted) return; // Stop when game starts
      
      try {
        const response = await fetch(`/api/lobby/${resolvedParams.code}/version`);
        const data = await response.json();
        
        // Only fetch full lobby if version changed
        if (data.version !== currentVersion) {
          loadLobby(hostId);
        }
      } catch (error) {
        console.error("Error checking version:", error);
      }
    }, 2000); // Check version every 2 seconds (super lightweight)
    
    return () => clearInterval(interval);
  }, [currentVersion, lobby?.gameState?.gameStarted]);

  const loadLobby = async (hostId: string | null) => {
    try {
      const response = await fetch(`/api/lobby/${resolvedParams.code}`);
      
      // If lobby not found (404), it was probably closed or doesn't exist
      if (response.status === 404) {
        // Check if this is a stale lobby code in storage
        const storedLobbyCode = localStorage.getItem("jeopardy_lobby_code");
        
        // Only show alert and redirect if this was a valid lobby they were in
        if (storedLobbyCode === resolvedParams.code) {
          setAlertMessage("This lobby is no longer available.");
          setShowAlert(true);
        } else {
          // Different lobby, just show error
          setError("Lobby not found");
        }
        return;
      }
      
      const data = await response.json();

      if (response.ok) {
        setLobby(data);
        setCurrentVersion(data.version || 0);
        setIsHost(data.hostId === hostId);
        setLobbyName(data.lobbyName || "");
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
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(resolvedParams.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const goToSetup = () => {
    router.push(`/host/setup/${resolvedParams.code}`);
  };

  const startGame = async () => {
    if (!lobby?.gameState?.categories?.length) {
      setAlertMessage("Please set up the game first!");
      setShowAlert(true);
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
      setAlertMessage("Failed to start game");
      setShowAlert(true);
    }
  };

  const updateLobbyName = async () => {
    if (!isHost) return;
    
    try {
      const hostId = localStorage.getItem("jeopardy_host_id");
      const trimmedName = lobbyName.trim();
      
      const response = await fetch(`/api/lobby/${resolvedParams.code}/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyName: trimmedName, hostId }),
      });

      if (response.ok) {
        setEditingName(false);
        // Reload lobby to get updated data
        loadLobby(hostId);
      }
    } catch (error) {
      console.error("Error updating lobby name:", error);
    }
  };

  const leaveLobby = () => {
    const message = isHost 
      ? "Are you sure you want to close the lobby? This will end the game for all players."
      : "Are you sure you want to leave this lobby?";
    
    setAlertMessage(message);
    setConfirmAction(() => async () => {
      const hostId = localStorage.getItem("jeopardy_host_id");
      const playerId = localStorage.getItem("jeopardy_player_id");
      
      try {
        await fetch(`/api/lobby/${resolvedParams.code}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            playerId: isHost ? hostId : playerId,
            isHost 
          }),
        });

        // Clear local storage
        if (isHost) {
          localStorage.removeItem("jeopardy_host_id");
          localStorage.removeItem("jeopardy_lobby_code");
        } else {
          localStorage.removeItem("jeopardy_player_id");
          localStorage.removeItem("jeopardy_player_name");
          localStorage.removeItem("jeopardy_lobby_code");
        }

        router.push("/");
      } catch (error) {
        setAlertMessage("Failed to leave lobby");
        setShowAlert(true);
      }
    });
    setShowConfirm(true);
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    
    // If lobby was closed, redirect to home
    if (alertMessage.includes("no longer available")) {
      localStorage.removeItem("jeopardy_player_id");
      localStorage.removeItem("jeopardy_player_name");
      localStorage.removeItem("jeopardy_lobby_code");
      localStorage.removeItem("jeopardy_host_id");
      router.push("/");
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (confirmAction) {
      confirmAction();
      setConfirmAction(null);
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    setConfirmAction(null);
  };

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-destructive text-lg mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Spinner color="primary" label="Loading lobby..." labelColor="foreground" />
          </CardContent>
        </Card>
      </main>
    );
  }

  const playerName = localStorage.getItem("jeopardy_player_name");

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              {/* Lobby Name */}
              {!editingName ? (
                <>
                  <div className="bg-card/60 backdrop-blur-md border border-border px-6 py-3 rounded-lg flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                      {lobbyName || `Lobby ${resolvedParams.code}`}
                    </h1>
                    {isHost && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingName(true);
                          setLobbyName(lobby?.lobbyName || "");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 text-sm backdrop-blur-md">
                    {isHost ? "Host View" : playerName}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-sm font-mono backdrop-blur-md">
                    {resolvedParams.code}
                  </Badge>
                </>
              ) : (
                /* Edit Lobby Name (Host Only) */
                <div className="flex items-center gap-2">
                  <Input
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    placeholder="Edit lobby name"
                    className="max-w-md"
                    maxLength={50}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateLobbyName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setLobbyName(lobby?.lobbyName || "");
                      }
                    }}
                  />
                  <Button onClick={updateLobbyName} size="sm">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingName(false);
                      setLobbyName(lobby?.lobbyName || "");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lobby Code Card */}
        <Card className="mb-6 bg-card/60 backdrop-blur-md border shadow-2xl">
          <CardContent className="p-6 text-center">
            <div className="text-sm font-semibold mb-2">LOBBY CODE</div>
            <div className="text-6xl font-bold text-white tracking-widest mb-4 font-mono" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
              {resolvedParams.code}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={copyCode} variant="secondary" size="sm">
                {copiedCode ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy Code
              </Button>
              <Button onClick={copyLink} variant="secondary" size="sm">
                {copiedLink ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
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
              <p className="text-muted-foreground text-center py-8">Waiting for players to join...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lobby.gameState.players.map((player: any) => {
                  const isWinner = lobby.gameState.winnerId && player.id === lobby.gameState.winnerId;
                  const winCount = lobby.gameState.playerWins?.[player.id] || 0;
                  return (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg flex items-center border-2 transition-colors ${
                        player.name === playerName
                          ? "bg-primary/10 border-primary dark:bg-primary/20"
                          : "bg-muted/50 border-border hover:bg-muted"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        player.id === lobby.hostId
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                          : "bg-gradient-to-br from-blue-500 to-purple-600"
                      }`}>
                        {player.id === lobby.hostId ? (
                          <Crown className="w-5 h-5 text-white" />
                        ) : (
                          <Users className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {player.name}
                          {isWinner && (
                            <span title="Last Game Winner">
                              <Crown className="w-4 h-4 text-yellow-500" />
                            </span>
                          )}
                          {winCount > 0 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {winCount} {winCount === 1 ? "win" : "wins"}
                            </Badge>
                          )}
                          {player.name === playerName && (
                            <span className="text-xs text-primary font-normal">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {player.id === lobby.hostId ? "Host" : "Player"}
                          {isWinner && player.id !== lobby.hostId && " • Last Winner"}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Game Setup Status:</p>
                  {lobby.gameState.categories.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {lobby.gameState.categories.length} {lobby.gameState.categories.length === 1 ? "Category" : "Categories"}
                        </Badge>
                        <Badge variant="secondary">
                          {lobby.gameState.categories.reduce((total: number, cat: any) => total + cat.questions.length, 0)} Questions
                        </Badge>
                        <Badge variant="default" className="bg-green-600">
                          ✓ Ready to Start
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Categories: {lobby.gameState.categories.map((cat: any) => cat.name).join(", ")}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">⚠️ Not Configured</Badge>
                      <span className="text-xs text-muted-foreground">Click "Setup Game" to add categories</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-sm font-semibold text-foreground mb-1">Players in Lobby:</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {lobby.gameState.players.length} {lobby.gameState.players.length === 1 ? "Player" : "Players"}
                    </Badge>
                    {lobby.gameState.players.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {lobby.gameState.players.map((p: any) => p.name).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
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

              <Button onClick={leaveLobby} variant="destructive" className="w-full">
                <XCircle className="mr-2 h-4 w-4" />
                Close Lobby
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Player Waiting */}
        {!isHost && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2">Waiting for host...</h3>
              <p className="text-muted-foreground mb-6">
                The host will start the game when ready. Share the lobby code with your friends!
              </p>
              <Button onClick={leaveLobby} variant="outline" className="mx-auto">
                <LogOut className="mr-2 h-4 w-4" />
                Leave Lobby
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Notice
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAlertClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirm Action
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

