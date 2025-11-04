"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BellOff, Trophy, Plus, Minus, XCircle, AlertCircle } from "lucide-react";
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

export default function HostGame({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [lastBuzzerCount, setLastBuzzerCount] = useState(0);

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
      
      if (data.gameState.currentQuestion) {
        setSelectedQuestion(data.gameState.currentQuestion);
      }
    }
  };

  // Play buzzer sound when someone buzzes in
  const playBuzzerSound = () => {
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
    
    if (currentBuzzerCount > lastBuzzerCount && lastBuzzerCount > 0) {
      // Someone just buzzed in! Play sound
      playBuzzerSound();
    }
    
    setLastBuzzerCount(currentBuzzerCount);
  }, [gameState?.buzzerQueue?.length]);

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
      await updateGameState({ 
        currentQuestion: question,
        buzzerQueue: []
      });
    }
  };

  const closeQuestion = async () => {
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
        buzzerQueue: []
      });
      
      setSelectedQuestion(null);
      setShowAnswer(false);
    }
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
    setAlertMessage("Are you sure you want to end the game? This will close the lobby for all players.");
    setShowConfirm(true);
  };

  const confirmEndGame = async () => {
    setShowConfirm(false);
    
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
      setAlertMessage("Failed to end game");
      setShowAlert(true);
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-lg">Loading game...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 tracking-wider">POOR MAN&apos;S JEOPARDY</h1>
              <p className="text-gray-300">Host View - Lobby: <span className="font-mono font-bold text-yellow-400">{resolvedParams.code}</span></p>
            </div>
            <Button onClick={endGame} variant="destructive" size="sm">
              <XCircle className="mr-2 h-4 w-4" />
              End Game
            </Button>
          </div>
        </div>

        {/* Players and Scores */}
        <div className="mb-6">
          <Card className="border border-white/20 bg-black/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Players & Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.map((player) => (
                  <div key={player.id} className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <div className="text-2xl font-bold">${player.score}</div>
                    </div>
                    <div className="font-semibold">{player.name}</div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => updatePlayerScore(player.id, 100)} className="backdrop-blur-sm">
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updatePlayerScore(player.id, -100)} className="backdrop-blur-sm">
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buzzer Control */}
        <div className="mb-6">
          <Card className="border border-white/20 bg-black/20 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold">Buzzer:</div>
                  <div className={`px-4 py-2 rounded-full font-bold ${
                    gameState.buzzerActive ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                  }`}>
                    {gameState.buzzerActive ? "ACTIVE" : "INACTIVE"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={activateBuzzer}>
                    <Bell className="mr-2 h-4 w-4" />
                    Activate
                  </Button>
                  <Button onClick={deactivateBuzzer} variant="secondary">
                    <BellOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </Button>
                  <Button onClick={clearBuzzer} variant="outline">
                    Clear
                  </Button>
                </div>
              </div>
              {(gameState?.buzzerQueue || []).length > 0 && (
                <div className="mt-4 p-4 bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-lg">
                  <div className="font-bold mb-2">Buzzer Queue:</div>
                  <div className="space-y-2">
                    {(gameState?.buzzerQueue || []).map((buzz, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="bg-blue-600/50 backdrop-blur-sm border border-blue-400/30 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-semibold">{buzz.playerName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Board */}
        <div className="grid gap-2">
          <div className="grid grid-cols-5 gap-2">
            {gameState.categories.map((category) => (
              <div key={category.id} className="bg-blue-600/30 backdrop-blur-sm border border-blue-400/30 p-4 text-center rounded-lg">
                <h2 className="text-xl font-bold uppercase">{category.name}</h2>
              </div>
            ))}
          </div>
          
          {[0, 1, 2, 3, 4].map((rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {gameState.categories.map((category) => {
                const question = category.questions[rowIndex];
                return (
                  <button
                    key={question.id}
                    onClick={() => selectQuestion(category.id, question.id)}
                    disabled={question.answered}
                    className={`p-8 text-3xl font-bold rounded-lg transition-all backdrop-blur-sm ${
                      question.answered
                        ? "bg-gray-800/30 border border-gray-600/20 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600/40 border border-blue-400/30 text-yellow-400 hover:bg-blue-500/50 hover:border-blue-300/40 cursor-pointer"
                    }`}
                  >
                    {question.answered ? "" : `$${question.value}`}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Question Dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => closeQuestion()}>
        <DialogContent className="max-w-3xl border border-white/20 bg-black/30 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Question - ${selectedQuestion?.value}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-6 rounded-lg">
              <div className="text-sm font-semibold text-blue-300 mb-2">QUESTION:</div>
              <div className="text-2xl font-bold">{selectedQuestion?.question}</div>
            </div>
            
            {showAnswer && (
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 p-6 rounded-lg">
                <div className="text-sm font-semibold text-green-300 mb-2">ANSWER:</div>
                <div className="text-2xl font-bold">{selectedQuestion?.answer}</div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={() => setShowAnswer(!showAnswer)} variant="secondary" className="flex-1">
                {showAnswer ? "Hide Answer" : "Show Answer"}
              </Button>
              <Button onClick={closeQuestion} className="flex-1">
                Close & Mark Answered
              </Button>
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
              Confirm End Game
            </AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              End Game
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

