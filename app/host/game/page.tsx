"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, Users, Trophy, Plus, Minus } from "lucide-react";
import { GameState, Question, Player } from "@/types/game";

export default function HostGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [buzzerQueue, setBuzzerQueue] = useState<any[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  useEffect(() => {
    loadGameState();
    const interval = setInterval(() => {
      loadGameState();
      loadBuzzerState();
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const loadGameState = async () => {
    const response = await fetch("/api/game/state");
    const data = await response.json();
    setGameState(data);
    if (data.currentQuestion) {
      setSelectedQuestion(data.currentQuestion);
    }
  };

  const loadBuzzerState = async () => {
    const response = await fetch("/api/game/buzzer");
    const data = await response.json();
    setBuzzerQueue(data.buzzerQueue || []);
  };

  const selectQuestion = async (categoryId: string, questionId: string) => {
    const category = gameState?.categories.find(c => c.id === categoryId);
    const question = category?.questions.find(q => q.id === questionId);
    
    if (question && !question.answered) {
      setSelectedQuestion(question);
      setShowAnswer(false);
      await fetch("/api/game/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", categoryId, questionId }),
      });
    }
  };

  const closeQuestion = async () => {
    if (selectedQuestion) {
      await fetch("/api/game/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "mark_answered", 
          categoryId: gameState?.categories.find(c => c.questions.some(q => q.id === selectedQuestion.id))?.id,
          questionId: selectedQuestion.id 
        }),
      });
    }
    setSelectedQuestion(null);
    setShowAnswer(false);
    await deactivateBuzzer();
  };

  const activateBuzzer = async () => {
    await fetch("/api/game/buzzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
  };

  const deactivateBuzzer = async () => {
    await fetch("/api/game/buzzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate" }),
    });
  };

  const clearBuzzer = async () => {
    await fetch("/api/game/buzzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    setBuzzerQueue([]);
  };

  const updatePlayerScore = async (playerId: string, points: number) => {
    await fetch("/api/game/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_score", playerId, points }),
    });
    loadGameState();
  };

  const addPlayer = async () => {
    if (newPlayerName.trim()) {
      await fetch("/api/game/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "add", 
          playerId: Date.now().toString(), 
          playerName: newPlayerName 
        }),
      });
      setNewPlayerName("");
      setShowAddPlayer(false);
      loadGameState();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">JEOPARDY!</h1>
          <p className="text-blue-200">Host View - Answers Visible</p>
        </div>

        {/* Players and Scores */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Players & Scores
                </CardTitle>
                <Button onClick={() => setShowAddPlayer(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Player
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.map((player) => (
                  <div key={player.id} className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      <div className="text-2xl font-bold text-blue-900">${player.score}</div>
                    </div>
                    <div className="font-semibold text-gray-700">{player.name}</div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updatePlayerScore(player.id, 100)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updatePlayerScore(player.id, -100)}
                      >
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
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold">Buzzer Status:</div>
                  <div className={`px-4 py-2 rounded-full font-bold ${
                    gameState.buzzerActive ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                  }`}>
                    {gameState.buzzerActive ? "ACTIVE" : "INACTIVE"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={activateBuzzer} variant="default">
                    <Bell className="mr-2 h-4 w-4" />
                    Activate
                  </Button>
                  <Button onClick={deactivateBuzzer} variant="secondary">
                    <BellOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </Button>
                  <Button onClick={clearBuzzer} variant="outline">
                    Clear Queue
                  </Button>
                </div>
              </div>
              {buzzerQueue.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                  <div className="font-bold mb-2">Buzzer Queue (in order):</div>
                  <div className="space-y-2">
                    {buzzerQueue.map((buzz, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
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
              <div key={category.id} className="bg-blue-700 p-4 text-center rounded-lg">
                <h2 className="text-xl font-bold text-white uppercase">{category.name}</h2>
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
                    className={`p-8 text-3xl font-bold rounded-lg transition-all ${
                      question.answered
                        ? "bg-blue-900 text-blue-800 cursor-not-allowed"
                        : "bg-blue-600 text-yellow-400 hover:bg-blue-500 cursor-pointer"
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Question - ${selectedQuestion?.value}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-100 p-6 rounded-lg">
              <div className="text-sm font-semibold text-gray-600 mb-2">QUESTION:</div>
              <div className="text-2xl font-bold text-blue-900">{selectedQuestion?.question}</div>
            </div>
            
            {showAnswer && (
              <div className="bg-green-100 p-6 rounded-lg animate-in fade-in">
                <div className="text-sm font-semibold text-gray-600 mb-2">ANSWER:</div>
                <div className="text-2xl font-bold text-green-900">{selectedQuestion?.answer}</div>
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

      {/* Add Player Dialog */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            />
            <Button onClick={addPlayer} className="w-full">Add Player</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

