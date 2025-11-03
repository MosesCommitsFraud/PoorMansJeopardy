"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bell, Trophy, Users } from "lucide-react";
import { GameState, Player } from "@/types/game";

export default function PlayerView() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [isJoined, setIsJoined] = useState(false);
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzerPosition, setBuzzerPosition] = useState<number | null>(null);

  useEffect(() => {
    // Check if player info is in localStorage
    const savedPlayerId = localStorage.getItem("jeopardy_player_id");
    const savedPlayerName = localStorage.getItem("jeopardy_player_name");
    
    if (savedPlayerId && savedPlayerName) {
      setPlayerId(savedPlayerId);
      setPlayerName(savedPlayerName);
      setIsJoined(true);
    }
  }, []);

  useEffect(() => {
    if (isJoined) {
      loadGameState();
      const interval = setInterval(() => {
        loadGameState();
        checkBuzzerStatus();
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isJoined]);

  const loadGameState = async () => {
    const response = await fetch("/api/game/state");
    const data = await response.json();
    setGameState(data);
  };

  const checkBuzzerStatus = async () => {
    const response = await fetch("/api/game/buzzer");
    const data = await response.json();
    setBuzzerActive(data.buzzerActive);
    
    // Check if this player is in the queue
    const position = data.buzzerQueue?.findIndex((b: any) => b.playerId === playerId);
    if (position !== -1 && position !== undefined) {
      setBuzzerPosition(position + 1);
      setHasBuzzed(true);
    } else {
      setBuzzerPosition(null);
      setHasBuzzed(false);
    }
  };

  const joinGame = async () => {
    if (playerName.trim()) {
      const newPlayerId = Date.now().toString();
      
      await fetch("/api/game/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "add", 
          playerId: newPlayerId, 
          playerName: playerName 
        }),
      });
      
      setPlayerId(newPlayerId);
      localStorage.setItem("jeopardy_player_id", newPlayerId);
      localStorage.setItem("jeopardy_player_name", playerName);
      setIsJoined(true);
    }
  };

  const buzz = async () => {
    if (buzzerActive && !hasBuzzed) {
      await fetch("/api/game/buzzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "buzz", 
          playerId, 
          playerName 
        }),
      });
      setHasBuzzed(true);
      checkBuzzerStatus();
    }
  };

  // Handle keyboard buzzer (spacebar)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && isJoined && buzzerActive && !hasBuzzed) {
        e.preventDefault();
        buzz();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isJoined, buzzerActive, hasBuzzed]);

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Join Jeopardy Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinGame()}
                className="text-lg"
              />
            </div>
            <Button onClick={joinGame} className="w-full" size="lg">
              Join Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayer = gameState?.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">JEOPARDY!</h1>
          <p className="text-blue-200 text-xl">Player: {playerName}</p>
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
                    buzzerActive ? "bg-green-500 text-white animate-pulse" : "bg-gray-300 text-gray-600"
                  }`}>
                    {buzzerActive ? "BUZZER ACTIVE" : "BUZZER INACTIVE"}
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
                  disabled={!buzzerActive || hasBuzzed}
                  className={`w-full h-48 rounded-2xl text-4xl font-bold transition-all transform ${
                    buzzerActive && !hasBuzzed
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
    </div>
  );
}

