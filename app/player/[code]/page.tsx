"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bell, Trophy, Users, LogOut, AlertCircle, Keyboard, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { EndGameScreen } from "@/components/EndGameScreen";
import { useSettings } from "@/contexts/SettingsContext";
import { usePlayerPeerSync } from "@/hooks/usePeerSync";
import { Wifi, WifiOff } from "lucide-react";

export default function PlayerView({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { settings } = useSettings();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const lastBuzzerCountRef = useRef(0);
  const justBuzzedLocallyRef = useRef(false);
  const [lobbyName, setLobbyName] = useState("");
  const [currentTime, setCurrentTime] = useState<number>(0);
  // Synchronized display states - wait for reveal timestamps
  const [questionVisible, setQuestionVisible] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);
  const gameStateRef = useRef<GameState | null>(null);

  // Keep ref in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem("jeopardy_player_id");
    const savedPlayerName = localStorage.getItem("jeopardy_player_name");
    
    if (savedPlayerId && savedPlayerName) {
      setPlayerId(savedPlayerId);
      setPlayerName(savedPlayerName);
    }
  }, []);

  // Handle state updates from P2P
  const handlePeerStateUpdate = useCallback((newGameState: GameState, version: number) => {
    const currentState = gameStateRef.current;
    
    // Check if host returned to lobby
    if (currentState?.gameStarted && !newGameState.gameStarted && !newGameState.gameEnded) {
      router.push(`/lobby/${resolvedParams.code}`);
      return;
    }
    
    setGameState(newGameState);
    setCurrentVersion(version);
    checkBuzzerStatus(newGameState);
  }, [router, resolvedParams.code]);

  // PeerJS player - connects to host for real-time updates
  const { 
    status: peerStatus, 
    buzz: peerBuzz,
    isConnected: isPeerConnected 
  } = usePlayerPeerSync({
    lobbyCode: resolvedParams.code,
    playerId: playerId,
    enabled: !!playerId,
    onStateUpdate: handlePeerStateUpdate,
  });

  // Polling is now just a backup - P2P handles real-time sync
  const isPeerConnectedRef = useRef(isPeerConnected);
  useEffect(() => {
    isPeerConnectedRef.current = isPeerConnected;
  }, [isPeerConnected]);

  useEffect(() => {
    if (playerId) {
      loadGameState();
      
      let timeoutId: NodeJS.Timeout;
      
      const pollVersion = async () => {
        // Determine interval based on P2P connection status
        const interval = isPeerConnectedRef.current ? 45000 : 2000; // 45s when P2P works, 2s fallback
        
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
        
        // Schedule next poll
        timeoutId = setTimeout(pollVersion, interval);
      };
      
      // Initial poll after short delay
      timeoutId = setTimeout(pollVersion, isPeerConnectedRef.current ? 45000 : 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [playerId, resolvedParams.code]);

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
      const newGameState = data.gameState;

      // Check if host returned to lobby (game was started but now isn't)
      if (gameState?.gameStarted && !newGameState.gameStarted && !newGameState.gameEnded) {
        // Host returned to lobby - redirect player back to lobby
        router.push(`/lobby/${resolvedParams.code}`);
        return;
      }

      setGameState(newGameState);
      setCurrentVersion(data.version || 0);
      setLobbyName(data.lobbyName || "");
      checkBuzzerStatus(newGameState);
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
    if (!settings.soundEnabled) return;

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

  // Detect when ANY player buzzes in (including others)
  useEffect(() => {
    const currentBuzzerCount = gameState?.buzzerQueue?.length || 0;
    const previousCount = lastBuzzerCountRef.current;
    
    if (currentBuzzerCount > previousCount && previousCount > 0) {
      // Someone just buzzed in!
      // Only play sound if it wasn't us (we already played it locally)
      if (!justBuzzedLocallyRef.current) {
        playBuzzerSound();
      } else {
        // Reset the flag after skipping our own buzz
        justBuzzedLocallyRef.current = false;
      }
    }
    
    lastBuzzerCountRef.current = currentBuzzerCount;
  }, [gameState?.buzzerQueue]);

  // Timer update effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState?.timerEndAt) {
        const now = Date.now();
        const remaining = Math.max(0, gameState.timerEndAt - now);
        setCurrentTime(Math.ceil(remaining / 1000));
      }
    }, 100); // Update every 100ms for smooth countdown
    
    return () => clearInterval(interval);
  }, [gameState?.timerEndAt]);

  // Synchronized reveal effect - waits for reveal timestamps so all clients display at the same moment
  useEffect(() => {
    // Reset visibility when question changes
    if (!gameState?.currentQuestion) {
      setQuestionVisible(false);
      setAnswerVisible(false);
      return;
    }

    const now = Date.now();
    const questionRevealAt = gameState.questionRevealAt || 0;
    const answerRevealAt = gameState.answerRevealAt || 0;

    // Handle question reveal
    if (questionRevealAt > 0) {
      const delay = Math.max(0, questionRevealAt - now);
      if (delay > 0) {
        const timeout = setTimeout(() => setQuestionVisible(true), delay);
        return () => clearTimeout(timeout);
      } else {
        setQuestionVisible(true);
      }
    } else if (gameState.currentQuestion) {
      // Fallback: show immediately if no reveal timestamp (backwards compatibility)
      setQuestionVisible(true);
    }
  }, [gameState?.currentQuestion?.id, gameState?.questionRevealAt]);

  // Separate effect for answer reveal
  useEffect(() => {
    if (!gameState?.showAnswerToPlayers) {
      setAnswerVisible(false);
      return;
    }

    const now = Date.now();
    const answerRevealAt = gameState.answerRevealAt || 0;

    if (answerRevealAt > 0) {
      const delay = Math.max(0, answerRevealAt - now);
      if (delay > 0) {
        const timeout = setTimeout(() => setAnswerVisible(true), delay);
        return () => clearTimeout(timeout);
      } else {
        setAnswerVisible(true);
      }
    } else {
      // Fallback: show immediately if no reveal timestamp
      setAnswerVisible(true);
    }
  }, [gameState?.showAnswerToPlayers, gameState?.answerRevealAt]);

  const buzz = async () => {
    if (gameState?.buzzerActive && !hasBuzzed) {
      // Play buzzer sound immediately for instant feedback
      playBuzzerSound();
      justBuzzedLocallyRef.current = true; // Flag to prevent double-play
      setHasBuzzed(true); // Optimistic update
      
      // Send buzz via P2P if connected (instant)
      if (isPeerConnected) {
        peerBuzz(playerId, playerName);
      }
      
      // Also send via HTTP as backup (ensures persistence)
      try {
        const response = await fetch(`/api/lobby/${resolvedParams.code}/buzz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, playerName }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          console.error("Buzz HTTP error:", data.error);
          // Don't reset hasBuzzed - P2P might have worked
        }
      } catch (error) {
        console.error("Buzz HTTP failed:", error);
        // Don't reset - P2P might have worked
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

  const returnToLobby = () => {
    // Just navigate back to lobby - host will handle the state reset
    router.push(`/lobby/${resolvedParams.code}`);
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);

  // Show end game screen if game has ended
  if (gameState?.gameEnded) {
    return (
      <EndGameScreen
        players={gameState.players}
        lobbyCode={resolvedParams.code}
        isHost={false}
        onReturnToLobby={returnToLobby}
        playerWins={gameState.playerWins}
      />
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-[1800px] mx-auto">
        {/* Compact Header */}
        <div className="mb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-card/60 backdrop-blur-md border border-border px-4 py-2 rounded-lg">
              <h1 className="text-xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                {lobbyName || `Lobby ${resolvedParams.code}`}
              </h1>
            </div>
            <Badge variant="secondary" className="px-2 py-1 text-xs backdrop-blur-md">
              {playerName}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 text-xs font-mono backdrop-blur-md">
              {resolvedParams.code}
            </Badge>
            {/* P2P Connection Status */}
            <Badge 
              variant={isPeerConnected ? "default" : "secondary"} 
              className={`px-2 py-1 text-xs backdrop-blur-md flex items-center gap-1 ${
                isPeerConnected ? "bg-green-600" : "bg-yellow-600"
              }`}
            >
              {isPeerConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isPeerConnected ? "Live" : "..."}
            </Badge>
          </div>
          <Button onClick={leaveGame} variant="destructive" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>

        {/* Compact Buzzer Banner */}
        <Card className="mb-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-4">
              {/* Buzzer Status */}
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm border ${
                  gameState?.buzzerActive ? "bg-green-500/50 border-green-400/50 text-white animate-pulse" : "bg-gray-500/30 border-gray-400/30 text-gray-400"
                }`}>
                  {gameState?.buzzerActive ? "BUZZER ACTIVE" : "BUZZER INACTIVE"}
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
            <Card className="border border-blue-400/30 flex-1 flex flex-col justify-center">
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
                      #{(gameState?.players
                        ? gameState.players.sort((a, b) => b.score - a.score)
                        .findIndex(p => p.id === playerId) + 1 
                        : 0) || "?"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column: Game Board */}
          <div className="col-span-9">
            {gameState?.categories && gameState.categories.length > 0 && (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-center text-lg">Game Board</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="grid gap-2 w-full">
                    {/* Category Headers */}
                    <div 
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${gameState.categories.length}, minmax(0, 1fr))` }}
                    >
                      {gameState.categories.map((category) => (
                        <div key={category.id} className="bg-gray-600/50 p-2 text-center rounded backdrop-blur-md border border-white/10 min-w-0">
                          <h2 className="text-xs lg:text-sm font-bold uppercase truncate text-white" title={category.name}>{category.name}</h2>
                        </div>
                      ))}
                    </div>
                    
                    {/* Question Grid */}
                    {[0, 1, 2, 3, 4].map((rowIndex) => (
                      <div 
                        key={rowIndex} 
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${gameState.categories.length}, minmax(0, 1fr))` }}
                      >
                        {gameState.categories.map((category) => {
                          const question = category.questions[rowIndex];
                          return (
                            <div
                              key={question.id}
                              className={`aspect-[4/3] flex items-center justify-center text-lg lg:text-2xl xl:text-3xl font-bold rounded text-center backdrop-blur-md border min-w-0 ${
                                question.answered
                                  ? "bg-white/10 text-gray-500 border-white/10"
                                  : "bg-primary/80 text-primary-foreground border-white/20"
                              }`}
                            >
                              ${question.value}
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
            <Card className="h-full flex flex-col">
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
                    .map((player, index) => {
                      const winCount = gameState.playerWins?.[player.id] || 0;
                      return (
                        <div
                          key={player.id}
                          className={`p-2 rounded-lg backdrop-blur-sm border border-white/20 p-4 ${
                            player.id === playerId
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className={`text-base font-bold ${
                                index === 0 ? "text-yellow-400" :
                                index === 1 ? "text-gray-300" :
                                index === 2 ? "text-orange-400" : "text-gray-400"
                              }`}>
                                #{index + 1}
                              </div>
                              <div className={`text-base font-bold ${
                                player.score > 0 ? 'text-green-500' : player.score < 0 ? 'text-red-500' : 'text-white'
                              }`}>
                                ${player.score}
                              </div>
                            </div>
                            <div className="font-semibold text-xs text-white flex items-center gap-1 flex-wrap">
                              <span className="truncate">{player.name}</span>
                              {winCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {winCount}W
                                </Badge>
                              )}
                              {player.id === playerId && (
                                <span className="text-[10px] text-blue-400">(You)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Full-Screen Current Question Modal - uses synchronized visibility */}
      <Dialog open={questionVisible && !!gameState?.currentQuestion} onOpenChange={() => {}}>
        <DialogContent className="max-w-6xl w-full h-[80vh] border-4 border-blue-400/50 flex flex-col p-6 relative overflow-hidden">
          {/* Timer Chip - Top Right */}
          {gameState?.timerEndAt && (
            <div className="absolute top-4 right-4 z-10">
              <Badge 
                variant="outline" 
                className={`flex items-center gap-2 px-3 py-1.5 text-xl font-bold backdrop-blur-md ${
                  currentTime <= 5 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-white/10 border-white/30'
                }`}
              >
                <Clock className="h-5 w-5" />
                <span className="tabular-nums">
                  {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                </span>
              </Badge>
            </div>
          )}
          
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden min-h-0">
            <div className="w-full max-h-full overflow-y-auto flex flex-col items-center px-4">
              <div className="text-xl font-bold text-blue-400 mb-4 flex-shrink-0">
                ${gameState?.currentQuestion?.value}
              </div>
              
              {/* Question section - scales based on whether answer is visible */}
              <div className={`text-center w-full flex-shrink-0 ${answerVisible ? 'mb-4' : 'mb-6'}`}>
                <div 
                  className={`font-bold leading-tight transition-all break-words ${
                    answerVisible 
                      ? 'text-lg md:text-xl lg:text-2xl' 
                      : (gameState?.currentQuestion?.question?.length || 0) > 200
                        ? 'text-xl md:text-2xl lg:text-3xl'
                        : (gameState?.currentQuestion?.question?.length || 0) > 100
                          ? 'text-2xl md:text-3xl lg:text-4xl'
                          : 'text-3xl md:text-4xl lg:text-5xl'
                  }`}
                >
                  {gameState?.currentQuestion?.question}
                </div>
                {gameState?.currentQuestion?.questionImageUrl && (
                  <div className={`mt-4 flex justify-center ${answerVisible ? 'max-h-32' : 'max-h-56'}`}>
                    <img 
                      src={gameState.currentQuestion.questionImageUrl} 
                      alt="Question" 
                      className={`rounded-lg object-contain ${
                        answerVisible 
                          ? 'max-h-32 max-w-[50%]' 
                          : 'max-h-56 max-w-full'
                      }`}
                    />
                  </div>
                )}
              </div>
              
              {/* Show Answer - uses synchronized answerVisible state */}
              {answerVisible && gameState?.showAnswerToPlayers && (
                <div className="w-full pt-4 border-t-4 border-green-400/50 flex-shrink-0 text-center">
                  <div className="text-lg font-bold text-green-400 mb-2">ANSWER:</div>
                  <div 
                    className={`font-bold text-green-300 break-words ${
                      (gameState?.currentQuestion?.answer?.length || 0) > 100
                        ? 'text-xl md:text-2xl lg:text-3xl'
                        : 'text-2xl md:text-3xl lg:text-4xl'
                    }`}
                  >
                    {gameState?.currentQuestion?.answer}
                  </div>
                  {gameState?.currentQuestion?.answerImageUrl && (
                    <div className="mt-4 flex justify-center max-h-40">
                      <img 
                        src={gameState.currentQuestion.answerImageUrl} 
                        alt="Answer" 
                        className="max-h-40 max-w-full object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {!answerVisible && (
                <div className="mt-6 text-base text-gray-400 flex-shrink-0">
                  Read the question carefully and be ready to answer!
                </div>
              )}
            </div>
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

