"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Lock } from "lucide-react";

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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Lobby</CardTitle>
          <CardDescription>Set up a new game session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              You'll receive a 4-character code that players can use to join your game. 
              The lobby will be active for 24 hours.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="usePassword"
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="usePassword" className="flex items-center cursor-pointer">
                <Lock className="w-4 h-4 mr-2" />
                Password protect lobby (optional)
              </Label>
            </div>

            {usePassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Lobby Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button 
            onClick={createLobby} 
            className="w-full" 
            size="lg"
            disabled={isCreating || (usePassword && !password)}
          >
            {isCreating ? "Creating..." : "Create Lobby"}
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

