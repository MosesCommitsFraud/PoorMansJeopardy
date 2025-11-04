"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock, ArrowLeft, Sparkles } from "lucide-react";

export default function CreateLobby() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createLobby = async () => {
    setIsCreating(true);
    
    try {
      const response = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: usePassword ? password : undefined 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear any old lobby data first
        localStorage.removeItem("jeopardy_player_id");
        localStorage.removeItem("jeopardy_player_name");
        
        // Store NEW host credentials
        localStorage.setItem("jeopardy_host_id", data.hostId);
        localStorage.setItem("jeopardy_lobby_code", data.code);
        
        // Redirect to lobby waiting room
        router.push(`/lobby/${data.code}`);
      } else {
        alert(data.error || "Failed to create lobby");
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error creating lobby:", error);
      alert("Failed to create lobby");
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="text-white hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="shadow-2xl border-2">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <CardTitle className="text-3xl font-bold mb-2">Create Lobby</CardTitle>
              <CardDescription className="text-base">Set up your game session</CardDescription>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-6 pt-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                <Sparkles className="w-4 h-4" />
                What You'll Get
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-6 list-disc">
                <li>4-character shareable code</li>
                <li>Custom trivia questions</li>
                <li>Active for 24 hours</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  id="usePassword"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded"
                />
                <div className="flex-1">
                  <Label htmlFor="usePassword" className="flex items-center cursor-pointer font-semibold">
                    <Lock className="w-4 h-4 mr-2" />
                    Password Protection
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Require a password for players to join
                  </p>
                </div>
              </div>

              {usePassword && (
                <div className="space-y-2 pl-4 border-l-4 border-primary">
                  <Label htmlFor="password">Lobby Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={createLobby} 
                className="w-full h-12 text-base font-semibold" 
                size="lg"
                disabled={isCreating || (usePassword && !password)}
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Lobby...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    Create Lobby
                  </>
                )}
              </Button>

              {usePassword && !password && (
                <p className="text-sm text-muted-foreground text-center">
                  Please set a password to continue
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

