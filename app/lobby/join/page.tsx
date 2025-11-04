"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Lock } from "lucide-react";

export default function JoinLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill code from URL query parameter
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setCode(codeFromUrl.toUpperCase());
      // Auto-check lobby if code is provided
      checkLobby(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const checkLobby = async (lobbyCode?: string) => {
    const codeToCheck = lobbyCode || code;
    
    if (!codeToCheck || codeToCheck.length !== 4) {
      setError("Please enter a 4-character lobby code");
      return;
    }

    try {
      const response = await fetch(`/api/lobby/${codeToCheck.toUpperCase()}`);
      const data = await response.json();

      if (response.ok) {
        setShowPassword(data.hasPassword);
        setError("");
      } else {
        setError(data.error || "Lobby not found");
      }
    } catch (error) {
      setError("Failed to check lobby");
    }
  };

  const joinLobby = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const response = await fetch("/api/lobby/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: code.toUpperCase(), 
          playerName,
          password: showPassword ? password : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store player credentials in localStorage
        localStorage.setItem("jeopardy_player_id", data.playerId);
        localStorage.setItem("jeopardy_player_name", playerName);
        localStorage.setItem("jeopardy_lobby_code", data.code);
        
        // Redirect to lobby
        router.push(`/lobby/${data.code}`);
      } else {
        setError(data.error || "Failed to join lobby");
        setIsJoining(false);
      }
    } catch (error) {
      console.error("Error joining lobby:", error);
      setError("Failed to join lobby");
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Join Lobby</CardTitle>
          <CardDescription>Enter the lobby code to play</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Lobby Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="text-center text-2xl font-bold tracking-widest uppercase"
              />
              <Button onClick={() => checkLobby()} variant="outline">
                Check
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
            />
          </div>

          {showPassword && (
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Lobby Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <Button 
            onClick={joinLobby} 
            className="w-full" 
            size="lg"
            disabled={isJoining || !code || !playerName}
          >
            {isJoining ? "Joining..." : "Join Game"}
          </Button>

          <Button 
            onClick={() => router.push("/")} 
            variant="outline" 
            className="w-full"
          >
            Back
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

