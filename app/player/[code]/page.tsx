"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bell, Trophy, Users, LogOut, AlertCircle, Keyboard } from "lucide-react";
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
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
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
    const isInQueue = state.buzzerQueue?.some((b: any) => b.playerId === playerId);
    if (isInQueue) {
      setHasBuzzed(true);
    } else {
      setHasBuzzed(false);
    }
  };

  const playBuzzerSound = () => {
    try {
      const audio = new Audio('/buzzer.mp3');
      audio.volume = 0.5; // 50% volume
      audio.play().catch(error => {
        console.log("Audio playback failed (may need user interaction):", error);
      });
    } catch (error) {
      console.log("Audio not available:", error);
    }
  };

  const buzz = async () => {
    if (gameState?.buzzerActive && !hasBuzzed) {
      // Play buzzer sound immediately for instant feedback
      playBuzzerSound();
      
      try {
        const response = await fetch(`/api/lobby/${resolvedParams.code}/buzz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, playerName }),
        });
        
        if (response.ok) {
          setHasBuzzed(true);
          // Force immediate update
          loadGameState();
        } else {
          const data = await response.json();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-3">
      <div className="max-w-[1800px] mx-auto">
        {/* Compact Header */}
        <div className="mb-3 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              POOR MAN&apos;S JEOPARDY
            </h1>
            <p className="text-sm text-gray-400">
              <span className="font-semibold">{playerName}</span> • {resolvedParams.code}
            </p>
          </div>
          <Button onClick={leaveGame} variant="outline" size="sm" className="backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10">
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>

        {/* Compact Buzzer Banner */}
        <Card className="border border-white/20 bg-black/20 backdrop-blur-xl mb-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-4">
              {/* Buzzer Status */}
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm border ${
                  gameState?.buzzerActive ? "bg-green-500/50 border-green-400/50 text-white animate-pulse" : "bg-gray-500/30 border-gray-400/30 text-gray-400"
                }`}>
                  {gameState?.buzzerActive ? "🔔 BUZZER ACTIVE" : "🔕 BUZZER INACTIVE"}
                </div>
                
                {hasBuzzed && (
                  <div className="px-4 py-2 bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-full">
                    <span className="text-sm font-bold text-yellow-400">
                      ✓ You buzzed in!
                    </span>
                  </div>
                )}
              </div>

              {/* Buzz Button */}
              <button
                onClick={buzz}
                disabled={!gameState?.buzzerActive || hasBuzzed}
                className={`px-8 py-3 rounded-xl text-xl font-bold transition-all backdrop-blur-sm border ${
                  gameState?.buzzerActive && !hasBuzzed
                    ? "bg-red-600/60 border-red-400/50 text-white hover:bg-red-500/70 shadow-xl cursor-pointer"
                    : "bg-gray-600/30 border-gray-500/30 text-gray-500 cursor-not-allowed"
                }`}
              >
                {hasBuzzed ? "✓ BUZZED!" : <><Bell className="inline-block h-5 w-5 mr-2" />BUZZ IN</>}
              </button>

              {/* Spacebar Hint */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                <Keyboard className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold">Press SPACEBAR</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid: Score (Left) | Board (Center) | Players (Right) */}
        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-180px)]">
          {/* Left Column: Your Score & Position */}
          <div className="col-span-1 space-y-3 flex flex-col">
            <Card className="bg-gradient-to-br from-blue-600/40 to-purple-600/40 border border-blue-400/30 backdrop-blur-xl flex-1 flex flex-col justify-center">
              <CardContent className="p-3">
                <div className="text-center space-y-4">
                  <Trophy className="h-8 w-8 text-yellow-400 mx-auto" />
                  <div>
                    <div className="text-[10px] opacity-80 uppercase tracking-wide">Score</div>
                    <div className="text-3xl font-bold">${currentPlayer?.score || 0}</div>
                  </div>
                  <div className="pt-2 border-t border-white/20">
                    <div className="text-[10px] opacity-80 uppercase tracking-wide">Rank</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      #{gameState?.players
                        .sort((a, b) => b.score - a.score)
                        .findIndex(p => p.id === playerId) + 1 || "?"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tab Focus Reminder */}
            <div className="text-[9px] text-center text-gray-500 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded p-1.5 leading-tight">
              💡 Keep focused
            </div>
          </div>

          {/* Center Column: Game Board */}
          <div className="col-span-9">
            {gameState?.categories && gameState.categories.length > 0 && (
              <Card className="border border-white/20 bg-black/20 backdrop-blur-xl h-full flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-center text-lg">Game Board</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="grid gap-2 w-full">
                    {/* Category Headers */}
                    <div className="grid grid-cols-5 gap-2">
                      {gameState.categories.map((category) => (
                        <div key={category.id} className="bg-blue-600/30 backdrop-blur-sm border border-blue-400/30 p-3 text-center rounded">
                          <h2 className="text-sm font-bold uppercase truncate">{category.name}</h2>
                        </div>
                      ))}
                    </div>
                    
                    {/* Question Grid */}
                    {[0, 1, 2, 3, 4].map((rowIndex) => (
                      <div key={rowIndex} className="grid grid-cols-5 gap-2">
                        {gameState.categories.map((category) => {
                          const question = category.questions[rowIndex];
                          return (
                            <div
                              key={question.id}
                              className={`aspect-video flex items-center justify-center text-3xl font-bold rounded text-center backdrop-blur-sm ${
                                question.answered
                                  ? "bg-gray-800/30 border border-gray-600/20 text-gray-600"
                                  : "bg-blue-600/40 border border-blue-400/30 text-yellow-400"
                              }`}
                            >
                              {question.answered ? "" : `$${question.value}`}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: All Players Scoreboard */}
          <div className="col-span-2">
            <Card className="border border-white/20 bg-black/20 backdrop-blur-xl h-full flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="flex items-center text-sm">
                  <Users className="mr-1 h-3 w-3" />
                  Scoreboard
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {gameState?.players
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div 
                        key={player.id}
                        className={`p-2 rounded-lg backdrop-blur-sm ${
                          player.id === playerId 
                            ? "bg-blue-500/30 border-2 border-blue-400/50" 
                            : "bg-white/10 border border-white/20"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className={`text-base font-bold ${
                              index === 0 ? "text-yellow-400" : 
                              index === 1 ? "text-gray-300" : 
                              index === 2 ? "text-orange-400" : "text-gray-500"
                            }`}>
                              #{index + 1}
                            </div>
                            <div className="text-base font-bold">
                              ${player.score}
                            </div>
                          </div>
                          <div className="font-semibold text-xs truncate">
                            {player.name}
                            {player.id === playerId && (
                              <span className="ml-1 text-[10px] text-blue-400">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Full-Screen Current Question Modal */}
      <Dialog open={!!gameState?.currentQuestion} onOpenChange={() => {}}>
        <DialogContent className="max-w-6xl w-full h-[80vh] border-4 border-blue-400/50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-12">
          <div className="text-center space-y-8 w-full">
            <div className="text-2xl font-bold text-blue-400 mb-6">
              ${gameState?.currentQuestion?.value}
            </div>
            <div className="text-5xl md:text-6xl font-bold leading-tight px-8">
              {gameState?.currentQuestion?.question}
            </div>
            
            {/* Show Answer if host enabled it */}
            {gameState?.showAnswerToPlayers && (
              <div className="mt-12 pt-8 border-t-4 border-green-400/50">
                <div className="text-2xl font-bold text-green-400 mb-4">ANSWER:</div>
                <div className="text-4xl md:text-5xl font-bold text-green-300">
                  {gameState?.currentQuestion?.answer}
                </div>
              </div>
            )}
            
            {!gameState?.showAnswerToPlayers && (
              <div className="mt-12 text-xl text-gray-400">
                Read the question carefully and be ready to answer!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

