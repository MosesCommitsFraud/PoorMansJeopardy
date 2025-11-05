"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BellOff, Trophy, Plus, Minus, XCircle, AlertCircle, Clock, Play, Pause, RotateCcw, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { GameState, Question } from "@/types/game";
import { EndGameScreen } from "@/components/EndGameScreen";
import { useSettings } from "@/contexts/SettingsContext";

export default function HostGame({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { settings } = useSettings();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<"endGame" | "closeLobby" | null>(null);
  const lastBuzzerCountRef = useRef(0);
  const [lobbyName, setLobbyName] = useState("");
  const [timerDuration, setTimerDuration] = useState(30);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
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
    }, 1500); // Check version every 1.5s (tiny payload, instant updates)
    
    return () => clearInterval(interval);
  }, [currentVersion]);

  const loadGameState = async () => {
    const response = await fetch(`/api/lobby/${resolvedParams.code}`);
    const data = await response.json();
    
    if (response.ok) {
      setGameState(data.gameState);
      setCurrentVersion(data.version || 0);
      setLobbyName(data.lobbyName || "");
      
      if (data.gameState.currentQuestion) {
        setSelectedQuestion(data.gameState.currentQuestion);
      }
    }
  };

  // Play buzzer sound when someone buzzes in
  const playBuzzerSound = () => {
    if (!settings.soundEnabled) return;

    try {
      const audio = new Audio('/buzzer.mp3');
      audio.volume = 0.5; // 50% volume
      audio.play().catch(error => {
        console.log("Audio playback failed:", error);
      });
    } catch (error) {
      console.log("Audio not available:", error);
    }
  };

  // Detect when a new player buzzes in
  useEffect(() => {
    const currentBuzzerCount = gameState?.buzzerQueue?.length || 0;
    const previousCount = lastBuzzerCountRef.current;
    
    if (currentBuzzerCount > previousCount) {
      // Someone just buzzed in! Play sound
      // Only play if game has started (prevents sound on initial load)
      if (previousCount > 0 || gameState?.gameStarted) {
        playBuzzerSound();
      }
    }
    
    lastBuzzerCountRef.current = currentBuzzerCount;
  }, [gameState?.buzzerQueue, gameState?.gameStarted]);

  // Timer update effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState?.timerEndAt) {
        const now = Date.now();
        const remaining = Math.max(0, gameState.timerEndAt - now);
        setCurrentTime(Math.ceil(remaining / 1000));
        
        // Auto-stop timer when it reaches 0
        if (remaining <= 0 && gameState.timerEndAt) {
          stopTimer();
        }
      }
    }, 100); // Update every 100ms for smooth countdown
    
    return () => clearInterval(interval);
  }, [gameState?.timerEndAt]);

  const startTimer = async () => {
    const duration = gameState?.timerDuration || timerDuration;
    const endAt = Date.now() + (duration * 1000);
    await updateGameState({ 
      timerEndAt: endAt,
      timerDuration: duration
    });
  };

  const stopTimer = async () => {
    await updateGameState({ timerEndAt: null });
  };

  const resetTimer = async () => {
    await updateGameState({ timerEndAt: null });
    setCurrentTime(0);
  };

  const setTimerDurationInState = async (duration: number) => {
    setTimerDuration(duration);
    await updateGameState({ timerDuration: duration });
  };

  const updateGameState = async (updates: Partial<GameState>) => {
    if (!gameState) return;
    
    const newState = { ...gameState, ...updates };
    await fetch(`/api/lobby/${resolvedParams.code}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameState: newState }),
    });
    setGameState(newState);
  };

  const selectQuestion = async (categoryId: string, questionId: string) => {
    const category = gameState?.categories.find(c => c.id === categoryId);
    const question = category?.questions.find(q => q.id === questionId);
    
    if (question && !question.answered) {
      setSelectedQuestion(question);
      setShowAnswer(false);
      // Don't show to players yet - host needs to click "Show to Players"
    }
  };

  const showToPlayers = async () => {
    if (selectedQuestion) {
      await updateGameState({ 
        currentQuestion: selectedQuestion,
        buzzerQueue: []
      });
    }
  };

  const toggleAnswerToPlayers = async () => {
    await updateGameState({ 
      showAnswerToPlayers: !gameState?.showAnswerToPlayers
    });
  };

  const dismissQuestion = async () => {
    // Close without marking as answered
    if (selectedQuestion && gameState) {
      await updateGameState({
        currentQuestion: null,
        buzzerActive: false,
        buzzerQueue: [],
        showAnswerToPlayers: false
      });
      
      setSelectedQuestion(null);
      setShowAnswer(false);
    }
  };

  const closeQuestion = async () => {
    // Close AND mark as answered
    if (selectedQuestion && gameState) {
      const updatedCategories = gameState.categories.map(cat => ({
        ...cat,
        questions: cat.questions.map(q => 
          q.id === selectedQuestion.id ? { ...q, answered: true } : q
        )
      }));
      
      await updateGameState({
        categories: updatedCategories,
        currentQuestion: null,
        buzzerActive: false,
        buzzerQueue: [],
        showAnswerToPlayers: false
      });
      
      setSelectedQuestion(null);
      setShowAnswer(false);
    }
  };

  const reopenQuestion = async (categoryId: string, questionId: string) => {
    if (!gameState) return;
    
    // Mark question as not answered
    const updatedCategories = gameState.categories.map(cat => ({
      ...cat,
      questions: cat.questions.map(q => 
        q.id === questionId ? { ...q, answered: false } : q
      )
    }));
    
    await updateGameState({
      categories: updatedCategories
    });
  };

  const activateBuzzer = () => {
    updateGameState({ buzzerActive: true, buzzerQueue: [] });
  };

  const deactivateBuzzer = () => {
    updateGameState({ buzzerActive: false });
  };

  const clearBuzzer = () => {
    updateGameState({ buzzerQueue: [] });
  };

  const updatePlayerScore = async (playerId: string, points: number) => {
    if (!gameState) return;
    
    const updatedPlayers = gameState.players.map(p =>
      p.id === playerId ? { ...p, score: p.score + points } : p
    );
    
    await updateGameState({ players: updatedPlayers });
  };

  const endGame = () => {
    setAlertMessage("Are you sure you want to end the game? This will show the final scores and winner.");
    setConfirmAction("endGame");
    setShowConfirm(true);
  };

  const closeLobby = () => {
    setAlertMessage("Are you sure you want to close the lobby? This will permanently close the game for all players.");
    setConfirmAction("closeLobby");
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);

    if (confirmAction === "endGame") {
      await confirmEndGame();
    } else if (confirmAction === "closeLobby") {
      await confirmCloseLobby();
    }

    setConfirmAction(null);
  };

  const confirmEndGame = async () => {
    if (!gameState) return;

    try {
      // Calculate winner (highest score among non-host players)
      const nonHostPlayers = gameState.players.filter(p => !p.isHost);
      const sortedPlayers = [...nonHostPlayers].sort((a, b) => b.score - a.score);
      const winnerId = sortedPlayers.length > 0 && sortedPlayers[0].score > 0 ? sortedPlayers[0].id : null;

      // Set game ended state with winner
      await updateGameState({
        gameEnded: true,
        endedAt: Date.now(),
        winnerId: winnerId,
        currentQuestion: null,
        buzzerActive: false,
        showAnswerToPlayers: false,
        timerEndAt: null
      });
    } catch (error) {
      setAlertMessage("Failed to end game");
      setShowAlert(true);
    }
  };

  const confirmCloseLobby = async () => {
    try {
      const hostId = localStorage.getItem("jeopardy_host_id");
      await fetch(`/api/lobby/${resolvedParams.code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: hostId, isHost: true }),
      });

      localStorage.removeItem("jeopardy_host_id");
      localStorage.removeItem("jeopardy_lobby_code");
      router.push("/");
    } catch (error) {
      setAlertMessage("Failed to close lobby");
      setShowAlert(true);
    }
  };

  const returnToLobby = async () => {
    if (!gameState) return;

    try {
      // Update win count for the winner
      const playerWins = gameState.playerWins || {};
      if (gameState.winnerId) {
        playerWins[gameState.winnerId] = (playerWins[gameState.winnerId] || 0) + 1;
      }

      // Reset all player scores to 0 for the next game
      const resetPlayers = gameState.players.map(p => ({
        ...p,
        score: 0
      }));

      // Reset game state back to lobby
      await updateGameState({
        gameStarted: false,
        gameEnded: false,
        currentQuestion: null,
        buzzerActive: false,
        buzzerQueue: [],
        showAnswerToPlayers: false,
        timerEndAt: null,
        playerWins: playerWins,
        players: resetPlayers
      });

      // Navigate back to lobby
      router.push(`/lobby/${resolvedParams.code}`);
    } catch (error) {
      setAlertMessage("Failed to return to lobby");
      setShowAlert(true);
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-lg">Loading game...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show end game screen if game has ended
  if (gameState.gameEnded) {
    return (
      <EndGameScreen
        players={gameState.players}
        lobbyCode={resolvedParams.code}
        isHost={true}
        onReturnToLobby={returnToLobby}
        onCloseLobby={confirmCloseLobby}
        playerWins={gameState.playerWins}
      />
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex-1 flex items-center gap-3">
              <div className="bg-card/60 backdrop-blur-md border border-border px-6 py-3 rounded-lg">
                <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                  {lobbyName || `Lobby ${resolvedParams.code}`}
                </h1>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-sm backdrop-blur-md">
                Host View
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm font-mono backdrop-blur-md">
                {resolvedParams.code}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={endGame} variant="outline" size="sm">
                <Trophy className="mr-2 h-4 w-4" />
                End Game
              </Button>
              <Button onClick={closeLobby} variant="destructive" size="sm">
                <Power className="mr-2 h-4 w-4" />
                Close Lobby
              </Button>
            </div>
          </div>
        </div>

        {/* Players and Scores */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Players & Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.map((player) => {
                  const winCount = gameState.playerWins?.[player.id] || 0;
                  return (
                    <div key={player.id} className="backdrop-blur-sm border border-white/20 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                        <div className={`text-2xl font-bold ${
                          player.score > 0 ? 'text-green-500' : player.score < 0 ? 'text-red-500' : ''
                        }`}>
                          ${player.score}
                        </div>
                      </div>
                      <div className="font-semibold flex items-center gap-2 flex-wrap">
                        <span>{player.name}</span>
                        {winCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {winCount} {winCount === 1 ? "win" : "wins"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => updatePlayerScore(player.id, 100)} className="backdrop-blur-sm" title="Add $100">
                          <Plus className="h-3 w-3 mr-1" />
                          $100
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updatePlayerScore(player.id, -100)} className="backdrop-blur-sm" title="Subtract $100">
                          <Minus className="h-3 w-3 mr-1" />
                          $100
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Board */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Game Board - Click any question to preview</span>
              <span className="text-sm font-normal text-muted-foreground">Hover over completed questions to reopen them</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="grid gap-2">
            <div className="grid grid-cols-5 gap-2">
              {gameState.categories.map((category) => (
                <div key={category.id} className="bg-gray-700/50 p-4 text-center rounded-lg backdrop-blur-md border border-white/10">
                  <h2 className="text-xl font-bold uppercase text-white">{category.name}</h2>
                </div>
              ))}
            </div>
            
            {[0, 1, 2, 3, 4].map((rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-5 gap-2">
                {gameState.categories.map((category) => {
                  const question = category.questions[rowIndex];
                  return (
                    <div key={question.id} className="relative">
                      <button
                        onClick={() => selectQuestion(category.id, question.id)}
                        disabled={question.answered}
                        className={`w-full p-8 text-3xl font-bold rounded-lg transition-all backdrop-blur-md border ${
                          question.answered
                            ? "bg-white/10 text-gray-500 cursor-not-allowed border-white/10"
                            : "bg-primary/80 text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md border-white/20"
                        }`}
                      >
                        ${question.value}
                      </button>
                      
                      {/* Reopen button for answered questions */}
                      {question.answered && (
                        <button
                          onClick={() => reopenQuestion(category.id, question.id)}
                          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-gray-700/80 backdrop-blur-sm rounded-lg"
                        >
                          <span className="text-sm font-semibold text-white">
                            Reopen
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && dismissQuestion()}>
        <DialogContent className="max-w-3xl border border-white/20 bg-black/30 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Question Worth: ${selectedQuestion?.value}</span>
              <Badge variant={gameState?.currentQuestion?.id === selectedQuestion?.id ? "default" : "outline"}>
                {gameState?.currentQuestion?.id === selectedQuestion?.id ? "LIVE - Visible to Players" : "Preview Mode - Not Yet Shown"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-6 rounded-lg">
              <div className="text-sm font-semibold text-gray-300 mb-2">QUESTION:</div>
              <div className="text-2xl font-bold">{selectedQuestion?.question}</div>
              {selectedQuestion?.questionImageUrl && (
                <div className="mt-4">
                  <img 
                    src={selectedQuestion.questionImageUrl} 
                    alt="Question" 
                    className="max-w-full max-h-64 rounded-lg mx-auto"
                  />
                </div>
              )}
            </div>
            
            {showAnswer && (
              <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-6 rounded-lg">
                <div className="text-sm font-semibold text-gray-300 mb-2">ANSWER:</div>
                <div className="text-2xl font-bold">{selectedQuestion?.answer}</div>
                {selectedQuestion?.answerImageUrl && (
                  <div className="mt-4">
                    <img 
                      src={selectedQuestion.answerImageUrl} 
                      alt="Answer" 
                      className="max-w-full max-h-64 rounded-lg mx-auto"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Timer Controls */}
            <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Timer</span>
                </div>
                {gameState?.timerEndAt && (
                  <div className={`text-3xl font-bold tabular-nums ${
                    currentTime <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
                  }`}>
                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    onBlur={() => setTimerDurationInState(timerDuration)}
                    className="w-20 h-9 text-sm"
                    min="1"
                    max="999"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
                <div className="flex gap-2 ml-auto">
                  {!gameState?.timerEndAt ? (
                    <Button onClick={startTimer} size="sm" variant="outline">
                      <Play className="mr-2 h-4 w-4" />
                      Start Timer
                    </Button>
                  ) : (
                    <Button onClick={stopTimer} size="sm" variant="outline">
                      <Pause className="mr-2 h-4 w-4" />
                      Stop Timer
                    </Button>
                  )}
                  <Button onClick={resetTimer} size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Buzzer Queue in Dialog */}
            {(gameState?.buzzerQueue || []).length > 0 && (
              <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold">Buzzer Queue ({(gameState?.buzzerQueue || []).length})</span>
                  </div>
                  <Button onClick={clearBuzzer} size="sm" variant="outline">
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(gameState?.buzzerQueue || []).map((buzz, index) => (
                    <div key={index} className="flex items-center gap-1.5 bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-full px-3 py-1.5">
                      <span className="text-sm font-bold text-yellow-300">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium">{buzz.playerName}</span>
                      {index === 0 && <Badge variant="secondary" className="ml-1 text-xs">First</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={showToPlayers} className="flex-1" variant={gameState?.currentQuestion?.id === selectedQuestion?.id ? "secondary" : "default"}>
                  {gameState?.currentQuestion?.id === selectedQuestion?.id ? "Question Shown to Players" : "Show Question to Players"}
                </Button>
                <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline" className="flex-1">
                  {showAnswer ? "Hide Answer (Host Only)" : "Reveal Answer (Host Only)"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={toggleAnswerToPlayers}
                  variant={gameState?.showAnswerToPlayers ? "secondary" : "outline"}
                  className="flex-1"
                  disabled={!gameState?.currentQuestion?.id}
                >
                  {gameState?.showAnswerToPlayers ? "Answer Visible to Players" : "Reveal Answer to Players"}
                </Button>
                <Button 
                  onClick={gameState?.buzzerActive ? deactivateBuzzer : activateBuzzer} 
                  variant={gameState?.buzzerActive ? "secondary" : "default"}
                  className="flex-1"
                >
                  {gameState?.buzzerActive ? <><BellOff className="mr-2 h-4 w-4" />Disable Buzzer</> : <><Bell className="mr-2 h-4 w-4" />Enable Buzzer</>}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={closeQuestion} variant="destructive" className="flex-1">
                  Close Question & Mark Complete
                </Button>
              </div>
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
              {confirmAction === "endGame" ? "Confirm End Game" : "Confirm Close Lobby"}
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction === "closeLobby"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
              }
            >
              {confirmAction === "endGame" ? "End Game" : "Close Lobby"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Error
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

