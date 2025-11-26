"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Crown, Users, UserX, Settings2, AlertCircle } from "lucide-react";
import { Player } from "@/types/game";

interface LobbyControlsProps {
  players: Player[];
  hostId: string;
  lobbyCode: string;
  playerWins?: Record<string, number>;
  onKickPlayer: (playerId: string, playerName: string) => Promise<void>;
  isCompact?: boolean; // For in-game view
}

export function LobbyControls({
  players,
  hostId,
  lobbyCode,
  playerWins,
  onKickPlayer,
  isCompact = false,
}: LobbyControlsProps) {
  const [kickingPlayer, setKickingPlayer] = useState<{ id: string; name: string } | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  const handleKick = async () => {
    if (!kickingPlayer) return;
    
    setIsKicking(true);
    try {
      await onKickPlayer(kickingPlayer.id, kickingPlayer.name);
    } finally {
      setIsKicking(false);
      setKickingPlayer(null);
    }
  };

  const nonHostPlayers = players.filter(p => p.id !== hostId);

  if (isCompact) {
    // Compact inline view for in-game use
    return (
      <>
        <div className="space-y-2">
          {nonHostPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No players to manage</p>
          ) : (
            nonHostPlayers.map((player) => {
              const winCount = playerWins?.[player.id] || 0;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1">
                        {player.name}
                        {winCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {winCount}W
                          </Badge>
                        )}
                      </div>
                      <div className={`text-xs ${
                        player.score > 0 ? 'text-green-500' : player.score < 0 ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        ${player.score}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setKickingPlayer({ id: player.id, name: player.name })}
                    title={`Kick ${player.name}`}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Kick Confirmation Dialog */}
        <AlertDialog open={!!kickingPlayer} onOpenChange={(open) => !open && setKickingPlayer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Kick Player
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to kick <strong>{kickingPlayer?.name}</strong> from the lobby? 
                They will be removed from the game immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isKicking}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleKick}
                disabled={isKicking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isKicking ? "Kicking..." : "Kick Player"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Full card view for lobby page
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Settings2 className="mr-2 h-4 w-4" />
          Manage Players
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nonHostPlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No players have joined yet
          </p>
        ) : (
          <div className="space-y-2">
            {nonHostPlayers.map((player) => {
              const winCount = playerWins?.[player.id] || 0;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {player.name}
                        {winCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            {winCount} {winCount === 1 ? "win" : "wins"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Player
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
                    onClick={() => setKickingPlayer({ id: player.id, name: player.name })}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Kick
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Kick Confirmation Dialog */}
        <AlertDialog open={!!kickingPlayer} onOpenChange={(open) => !open && setKickingPlayer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Kick Player
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to kick <strong>{kickingPlayer?.name}</strong> from the lobby? 
                They will be removed from the game immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isKicking}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleKick}
                disabled={isKicking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isKicking ? "Kicking..." : "Kick Player"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// Dialog wrapper for use in the game view
export function LobbyControlsDialog(props: LobbyControlsProps) {
  const [open, setOpen] = useState(false);
  const nonHostPlayers = props.players.filter(p => p.id !== props.hostId);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="mr-2 h-4 w-4" />
        Manage Players
        {nonHostPlayers.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            {nonHostPlayers.length}
          </Badge>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Lobby Controls
            </DialogTitle>
            <DialogDescription>
              Manage players in your lobby. Kicked players will be removed immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <LobbyControls {...props} isCompact />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

