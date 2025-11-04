"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Trophy, Users, LogOut, AlertCircle } from "lucide-react";
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
import { GameState } from "@/types/game";

export default function PlayerView({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzerPosition, setBuzzerPosition] = useState<number | null>(null);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const savedPlayerId = localStorage.getItem("jeopardy_player_id");
    const savedPlayerName = localStorage.getItem("jeopardy_player_name");
    
    if (savedPlayerId && savedPlayerName) {
      setPlayerId(savedPlayerId);
      setPlayerName(savedPlayerName);
    }
  }, []);

  useEffect(() => {
    if (playerId) {
      loadGameState();
      
      // Smart polling: only check lightweight version endpoint
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/lobby/${resolvedParams.code}/version`);
          const data = await response.json();
          
          // Only fetch full state if version changed
          if (data.version !== currentVersion) {
            loadGameState();
          }
        } catch (error) {
          console.error("Error checking version:", error);
        }
      }, 1500); // Check version every 1.5s (tiny payload)
      
      return () => clearInterval(interval);
    }
  }, [playerId, currentVersion]);

  const loadGameState = async () => {
    const response = await fetch(`/api/lobby/${resolvedParams.code}`);
    
    // If lobby not found (404), host probably closed it
    if (response.status === 404) {
      setAlertMessage("The lobby has been closed by the host.");
      setShowAlert(true);
      return;
    }
    
    const data = await response.json();
    
    if (response.ok) {
      setGameState(data.gameState);
      setCurrentVersion(data.version || 0);
      checkBuzzerStatus(data.gameState);
    }
  };

  const checkBuzzerStatus = (state: GameState) => {
    const position = state.buzzerQueue?.findIndex((b: any) => b.playerId === playerId);
    if (position !== -1 && position !== undefined) {
      setBuzzerPosition(position + 1);
      setHasBuzzed(true);
    } else {
      setBuzzerPosition(null);
      setHasBuzzed(false);
    }
  };

  const buzz = async () => {
    if (gameState?.buzzerActive && !hasBuzzed) {
      try {
        const response = await fetch(`/api/lobby/${resolvedParams.code}/buzz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, playerName }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setHasBuzzed(true);
          setBuzzerPosition(data.position);
          // Force immediate update
          loadGameState();
        } else {
          console.error("Buzz error:", data.error);
        }
      } catch (error) {
        console.error("Buzz failed:", error);
      }
    }
  };

  // Handle keyboard buzzer (spacebar)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && gameState?.buzzerActive && !hasBuzzed) {
        e.preventDefault();
        buzz();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState?.buzzerActive, hasBuzzed]);

  const leaveGame = () => {
    setAlertMessage("Are you sure you want to leave the game?");
    setShowConfirm(true);
  };

  const confirmLeaveGame = async () => {
    setShowConfirm(false);
    
    try {
      await fetch(`/api/lobby/${resolvedParams.code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, isHost: false }),
      });

      localStorage.removeItem("jeopardy_player_id");
      localStorage.removeItem("jeopardy_player_name");
      localStorage.removeItem("jeopardy_lobby_code");
      router.push("/");
    } catch (error) {
      setAlertMessage("Failed to leave game");
      setShowAlert(true);
    }
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    
    // If lobby was closed, redirect to home
    if (alertMessage.includes("closed by the host")) {
      localStorage.removeItem("jeopardy_player_id");
      localStorage.removeItem("jeopardy_player_name");
      localStorage.removeItem("jeopardy_lobby_code");
      router.push("/");
    }
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 tracking-wider">POOR MAN&apos;S JEOPARDY</h1>
              <p className="text-gray-300 text-xl">Player: {playerName}</p>
              <p className="text-gray-400 text-sm font-mono">Lobby: {resolvedParams.code}</p>
            </div>
            <Button onClick={leaveGame} variant="outline" size="sm" className="backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10">
              <LogOut className="mr-2 h-4 w-4" />
              Leave
            </Button>
          </div>
        </div>

        {/* Player Score */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600/40 to-purple-600/40 border border-blue-400/30 backdrop-blur-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Trophy className="h-12 w-12 text-yellow-400" />
                  <div>
                    <div className="text-sm opacity-90">Your Score</div>
                    <div className="text-5xl font-bold">${currentPlayer?.score || 0}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">Position</div>
                  <div className="text-3xl font-bold">
                    #{gameState?.players
                      .sort((a, b) => b.score - a.score)
                      .findIndex(p => p.id === playerId) + 1 || "?"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Question Display */}
        {gameState?.currentQuestion && (
          <div className="mb-8">
            <Card className="border border-white/20 bg-black/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-center">Current Question</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-8 rounded-lg text-center">
                  <div className="text-sm font-semibold text-blue-300 mb-4">
                    ${gameState.currentQuestion.value}
                  </div>
                  <div className="text-2xl font-bold">
                    {gameState.currentQuestion.question}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Buzzer */}
        <div className="mb-8">
          <Card className="border border-white/20 bg-black/20 backdrop-blur-xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className={`inline-block px-6 py-3 rounded-full text-lg font-bold backdrop-blur-sm border ${
                    gameState?.buzzerActive ? "bg-green-500/50 border-green-400/50 text-white animate-pulse" : "bg-gray-500/30 border-gray-400/30 text-gray-400"
                  }`}>
                    {gameState?.buzzerActive ? "BUZZER ACTIVE" : "BUZZER INACTIVE"}
                  </div>
                </div>

                {buzzerPosition !== null && (
                  <div className="mb-6 p-4 bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-lg">
                    <div className="text-xl font-bold text-yellow-400">
                      You are #{buzzerPosition} in the buzzer queue!
                    </div>
                  </div>
                )}

                <button
                  onClick={buzz}
                  disabled={!gameState?.buzzerActive || hasBuzzed}
                  className={`w-full h-48 rounded-2xl text-4xl font-bold transition-all transform backdrop-blur-sm border ${
                    gameState?.buzzerActive && !hasBuzzed
                      ? "bg-red-600/60 border-red-400/50 text-white hover:scale-105 active:scale-95 shadow-2xl cursor-pointer hover:bg-red-500/70"
                      : "bg-gray-600/30 border-gray-500/30 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {hasBuzzed ? (
                    <div>
                      <Bell className="inline-block h-16 w-16 mb-2" />
                      <div>BUZZED!</div>
                    </div>
                  ) : (
                    <div>
                      <Bell className="inline-block h-16 w-16 mb-2" />
                      <div>BUZZ IN</div>
                    </div>
                  )}
                </button>
                
                <div className="mt-4 text-sm text-gray-400">
                  Press SPACEBAR or click button to buzz in
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Other Players */}
        <Card className="border border-white/20 bg-black/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              All Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameState?.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div 
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg backdrop-blur-sm ${
                      player.id === playerId ? "bg-blue-500/30 border-2 border-blue-400/50" : "bg-white/10 border border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <div className="font-semibold text-lg">
                          {player.name}
                          {player.id === playerId && (
                            <span className="ml-2 text-sm text-blue-400">(You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      ${player.score}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirm Leave
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeaveGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Leave Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}

