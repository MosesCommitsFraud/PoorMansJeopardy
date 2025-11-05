"use client";

import { Player } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Medal, Home, Power } from "lucide-react";
import ShinyText from "./ShinyText";

interface EndGameScreenProps {
  players: Player[];
  lobbyCode: string;
  isHost: boolean;
  onReturnToLobby: () => void;
  onCloseLobby?: () => void;
}

export function EndGameScreen({ players, lobbyCode, isHost, onReturnToLobby, onCloseLobby }: EndGameScreenProps) {
  // Sort players by score (highest first)
  const sortedPlayers = [...players]
    .filter(p => !p.isHost)
    .sort((a, b) => b.score - a.score);

  const winner = sortedPlayers[0];
  const hasWinner = winner && winner.score > 0;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <Trophy className="h-4 w-4 text-muted-foreground" />;
  };

  const getRankBadgeVariant = (index: number) => {
    if (index === 0) return "default";
    return "secondary";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Winner Announcement */}
        {hasWinner && (
          <Card className="bg-card/80 backdrop-blur-xl border-2 border-border shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center animate-bounce">
                  <Crown className="h-20 w-20 text-yellow-500 drop-shadow-lg" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>
                    {winner.name}
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground">
                    wins the game!
                  </p>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-2xl md:text-3xl px-6 py-2 font-bold backdrop-blur-md">
                      ${winner.score.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final Scoreboard */}
        <Card className="bg-card/70 backdrop-blur-xl border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="h-6 w-6" />
              Final Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No players participated in this game
                </p>
              ) : (
                sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all backdrop-blur-md ${
                      index === 0
                        ? "bg-card/80 border-2 border-yellow-500/40 shadow-lg"
                        : "bg-card/50 border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(index)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${index === 0 ? "text-xl" : "text-lg"}`}>
                            {player.name}
                          </span>
                          {index < 3 && (
                            <Badge variant={getRankBadgeVariant(index)} className="text-xs">
                              #{index + 1}
                            </Badge>
                          )}
                        </div>
                        {index === 0 && hasWinner && (
                          <p className="text-sm text-muted-foreground">Champion</p>
                        )}
                      </div>
                    </div>
                    <div className={`font-bold ${index === 0 ? "text-2xl" : "text-xl"}`}>
                      ${player.score.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons - Host Only */}
        {isHost && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onReturnToLobby}
              className="text-lg px-8 py-6 gap-2"
            >
              <Home className="h-5 w-5" />
              Return to Lobby
            </Button>
            {onCloseLobby && (
              <Button
                size="lg"
                variant="destructive"
                onClick={onCloseLobby}
                className="text-lg px-8 py-6 gap-2"
              >
                <Power className="h-5 w-5" />
                Close Lobby
              </Button>
            )}
          </div>
        )}

        {/* Player waiting message */}
        {!isHost && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-6 py-3 text-lg backdrop-blur-md">
              <ShinyText text="Waiting for host to return to lobby..." speed={3} />
            </Badge>
          </div>
        )}

        {/* Game Code Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="px-4 py-2 text-base font-mono backdrop-blur-md">
            Game Code: {lobbyCode}
          </Badge>
        </div>
      </div>
    </div>
  );
}
