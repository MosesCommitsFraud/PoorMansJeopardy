"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Trophy, Users, LogOut, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">POOR MAN&apos;S JEOPARDY</h1>
              <p className="text-blue-200 text-xl">Player: {playerName}</p>
              <p className="text-blue-300 text-sm font-mono">Lobby: {resolvedParams.code}</p>
            </div>
            <Button onClick={leaveGame} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Leave
            </Button>
          </div>
        </div>

        {/* Player Score */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0">
            <CardContent className="p-8">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <Trophy className="h-12 w-12" />
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
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Current Question</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-100 p-8 rounded-lg text-center">
                  <div className="text-sm font-semibold text-gray-600 mb-4">
                    ${gameState.currentQuestion.value}
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {gameState.currentQuestion.question}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Buzzer */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className={`inline-block px-6 py-3 rounded-full text-lg font-bold ${
                    gameState?.buzzerActive ? "bg-green-500 text-white animate-pulse" : "bg-gray-300 text-gray-600"
                  }`}>
                    {gameState?.buzzerActive ? "BUZZER ACTIVE" : "BUZZER INACTIVE"}
                  </div>
                </div>

                {buzzerPosition !== null && (
                  <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
                    <div className="text-xl font-bold text-yellow-900">
                      You are #{buzzerPosition} in the buzzer queue!
                    </div>
                  </div>
                )}

                <button
                  onClick={buzz}
                  disabled={!gameState?.buzzerActive || hasBuzzed}
                  className={`w-full h-48 rounded-2xl text-4xl font-bold transition-all transform ${
                    gameState?.buzzerActive && !hasBuzzed
                      ? "bg-gradient-to-br from-red-500 to-red-700 text-white hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
                
                <div className="mt-4 text-sm text-gray-600">
                  Press SPACEBAR or click button to buzz in
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Other Players */}
        <Card>
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
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      player.id === playerId ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
                      <div>
                        <div className="font-semibold text-lg">
                          {player.name}
                          {player.id === playerId && (
                            <span className="ml-2 text-sm text-blue-600">(You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
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
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <AlertDialogTitle>Confirm Leave</AlertDialogTitle>
            </div>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowConfirm(false)} variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={confirmLeaveGame} variant="destructive" className="w-full sm:w-auto">
              Leave Game
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-6 w-6 text-blue-600" />
              <AlertDialogTitle>Notice</AlertDialogTitle>
            </div>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleAlertClose} className="w-full sm:w-auto">
              OK
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

