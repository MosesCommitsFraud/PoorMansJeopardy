"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@heroui/spinner";
import { Users, Lock, ArrowLeft, AlertCircle } from "lucide-react";

function JoinLobbyContent() {
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
        // Clear any old host data first
        localStorage.removeItem("jeopardy_host_id");
        
        // Store NEW player credentials
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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <CardTitle className="text-3xl font-bold mb-2">Join Lobby</CardTitle>
              <CardDescription className="text-base">Enter a 4-character code to play</CardDescription>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-6 pt-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code" className="text-base font-semibold">Lobby Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="text-center text-2xl font-bold tracking-widest uppercase font-mono"
                />
                <Button onClick={() => checkLobby()} variant="outline" size="lg">
                  Check
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the 4-character code from your host
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerName" className="text-base font-semibold">Your Name</Label>
              <Input
                id="playerName"
                placeholder="Enter your display name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            {showPassword && (
              <div className="space-y-2 p-4 border-l-4 border-primary bg-accent/30 rounded-r-lg">
                <Label htmlFor="password" className="flex items-center text-base font-semibold">
                  <Lock className="w-4 h-4 mr-2" />
                  Lobby Password Required
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter the lobby password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button 
                onClick={joinLobby} 
                className="w-full h-12 text-base font-semibold" 
                size="lg"
                disabled={isJoining || !code || !playerName || (showPassword && !password)}
              >
                {isJoining ? (
                  <div className="flex items-center gap-2">
                    <Spinner color="default" size="sm" />
                    <span>Joining Lobby...</span>
                  </div>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-2" />
                    Join Lobby
                  </>
                )}
              </Button>

              {(!code || !playerName || (showPassword && !password)) && (
                <p className="text-sm text-muted-foreground text-center">
                  {!code && "Enter a lobby code"}
                  {code && !playerName && "Enter your name"}
                  {code && playerName && showPassword && !password && "Enter the lobby password"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function JoinLobby() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="shadow-2xl w-full max-w-md">
          <CardContent className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      </main>
    }>
      <JoinLobbyContent />
    </Suspense>
  );
}

