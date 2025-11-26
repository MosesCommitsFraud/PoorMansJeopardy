"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Trophy, Plus, Minus, AlertCircle, Clock, Play, Pause, RotateCcw, Power } from "lucide-react";
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
import { GameState, Question, BuzzerEvent, QuestionScoring, VideoDisplayMode } from "@/types/game";
import { EndGameScreen } from "@/components/EndGameScreen";
import { useSettings } from "@/contexts/SettingsContext";
import { useHostPeerSync } from "@/hooks/usePeerSync";
import { Wifi, WifiOff } from "lucide-react";
import { LobbyControlsDialog } from "@/components/LobbyControls";
import { YouTubePlayer } from "@/components/youtube-player";

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
  const [customScores, setCustomScores] = useState<Record<string, string>>({});
  const [markedCorrectIndex, setMarkedCorrectIndex] = useState<number | null>(null); // Index in buzzer queue of player marked correct
  const [savedBuzzerQueue, setSavedBuzzerQueue] = useState<BuzzerEvent[]>([]); // Saved queue when reopening a question
  const gameStateRef = useRef<GameState | null>(null);
  const currentVersionRef = useRef(0);
  // Video control states
  const [videoShowTitle, setVideoShowTitle] = useState(true);
  const [videoMode, setVideoMode] = useState<VideoDisplayMode>('full');

  // Live update video options when controls change
  const updateVideoOptions = async (showTitle: boolean, mode: VideoDisplayMode) => {
    if (gameState?.currentQuestion) {
      await updateGameState({
        videoOptions: {
          showTitle,
          mode
        }
      });
    }
  };

  // Keep refs in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  useEffect(() => {
    currentVersionRef.current = currentVersion;
  }, [currentVersion]);

  // Handle buzz received via P2P
  const handlePeerBuzz = useCallback((playerId: string, playerName: string) => {
    const currentState = gameStateRef.current;
    if (!currentState?.buzzerActive) return;
    
    // Check if player already buzzed
    const alreadyBuzzed = currentState.buzzerQueue?.some(b => b.playerId === playerId);
    if (alreadyBuzzed) return;
    
    // Add to queue
    const newBuzz: BuzzerEvent = {
      playerId,
      playerName,
      timestamp: Date.now()
    };
    
    const newQueue = [...(currentState.buzzerQueue || []), newBuzz];
    const newState = { ...currentState, buzzerQueue: newQueue };
    
    // Update local state immediately
    setGameState(newState);
    
    // Play buzzer sound
    playBuzzerSound();
    
    // Persist to server and broadcast
    persistAndBroadcast(newState);
  }, []);

  // Callback when a new player connects via P2P - send them current state
  const handlePlayerConnected = useCallback(() => {
    // Refresh state and broadcast to all players
    loadGameState();
  }, []);

  // PeerJS host - broadcasts state to all connected players
  const { 
    status: peerStatus, 
    connectedPlayers, 
    broadcastState,
    broadcastLobbyClosed,
    broadcastPlayerKicked,
    isConnected: isPeerConnected 
  } = useHostPeerSync({
    lobbyCode: resolvedParams.code,
    enabled: true,
    onBuzz: handlePeerBuzz,
    onPlayerConnected: handlePlayerConnected,
  });

  // Polling is now just a backup - P2P handles real-time sync
  const isPeerConnectedRef = useRef(isPeerConnected);
  useEffect(() => {
    isPeerConnectedRef.current = isPeerConnected;
  }, [isPeerConnected]);

  useEffect(() => {
    loadGameState(true); // Force load on mount
    
    let timeoutId: NodeJS.Timeout;
    
    const pollVersion = async () => {
      // Determine interval based on P2P connection status
      const interval = isPeerConnectedRef.current ? 45000 : 2000; // 45s when P2P works, 2s fallback
      
      try {
        const response = await fetch(`/api/lobby/${resolvedParams.code}/version`);
        const data = await response.json();
        
        // Only fetch full state if server version is newer than our local version
        if (data.version > currentVersionRef.current) {
          loadGameState();
        }
      } catch (error) {
        console.error("Error checking version:", error);
      }
      
      // Schedule next poll
      timeoutId = setTimeout(pollVersion, interval);
    };
    
    // Initial poll after short delay
    timeoutId = setTimeout(pollVersion, isPeerConnectedRef.current ? 45000 : 2000);
    
    return () => clearTimeout(timeoutId);
  }, [resolvedParams.code]);

  const loadGameState = async (force = false) => {
    const response = await fetch(`/api/lobby/${resolvedParams.code}`);
    const data = await response.json();
    
    if (response.ok) {
      const incomingVersion = data.version || 0;
      
      // Only update if incoming version is newer (or force load)
      if (force || incomingVersion > currentVersionRef.current) {
        // Ensure buzzerActive is true when game is running
        const loadedState = data.gameState;
        if (loadedState.gameStarted && !loadedState.buzzerActive) {
          loadedState.buzzerActive = true;
          // Persist the fix
          persistAndBroadcast(loadedState);
        }
        
        setGameState(loadedState);
        setCurrentVersion(incomingVersion);
        currentVersionRef.current = incomingVersion;
        setLobbyName(data.lobbyName || "");
        
        if (loadedState.currentQuestion) {
          setSelectedQuestion(loadedState.currentQuestion);
        }
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

  // Persist to server and broadcast via P2P
  const persistAndBroadcast = async (newState: GameState) => {
    // Optimistically bump version to prevent stale data from overwriting
    const optimisticVersion = currentVersionRef.current + 1;
    currentVersionRef.current = optimisticVersion;
    
    const response = await fetch(`/api/lobby/${resolvedParams.code}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameState: newState }),
    });
    const data = await response.json();
    const serverVersion = data.version || optimisticVersion;
    
    // Update to server version (should be >= our optimistic version)
    setCurrentVersion(serverVersion);
    currentVersionRef.current = Math.max(currentVersionRef.current, serverVersion);
    
    // Broadcast instantly to all connected players via P2P
    broadcastState(newState, serverVersion);
  };

  const updateGameState = async (updates: Partial<GameState>) => {
    const currentState = gameStateRef.current;
    if (!currentState) return;
    
    const newState = { ...currentState, ...updates };
    setGameState(newState); // Update local state immediately
    gameStateRef.current = newState; // Keep ref in sync
    await persistAndBroadcast(newState);
  };

  const selectQuestion = async (categoryId: string, questionId: string) => {
    const category = gameState?.categories.find(c => c.id === categoryId);
    const question = category?.questions.find(q => q.id === questionId);
    
    if (question && !question.answered) {
      setSelectedQuestion(question);
      setShowAnswer(false);
      setMarkedCorrectIndex(null);
      setSavedBuzzerQueue([]);
      // Don't show to players yet - host needs to click "Show to Players"
    }
  };

  const showToPlayers = async () => {
    if (selectedQuestion) {
      // Set reveal timestamp 600ms in the future
      // This gives all clients time to receive the update and display simultaneously
      const revealAt = Date.now() + 600;
      await updateGameState({
        currentQuestion: selectedQuestion,
        buzzerQueue: [],
        questionRevealAt: revealAt,
        answerRevealAt: undefined, // Clear any previous answer reveal
        videoOptions: {
          showTitle: videoShowTitle,
          mode: videoMode
        }
      });
    }
  };

  const toggleAnswerToPlayers = async () => {
    const willShowAnswer = !gameState?.showAnswerToPlayers;
    await updateGameState({
      showAnswerToPlayers: willShowAnswer,
      // Set reveal timestamp when showing answer so all clients display at same time
      answerRevealAt: willShowAnswer ? Date.now() + 600 : undefined
    });
  };

  const toggleVideoPlayback = async () => {
    const isPlaying = gameState?.videoPlaying ?? false;

    // If not started yet, use synchronized start
    if (!gameState?.videoPlayAt) {
      const playAt = Date.now() + 600;
      await updateGameState({
        videoPlayAt: playAt,
        videoPlaying: true,
        videoCommandAt: Date.now(),
        videoOptions: {
          showTitle: videoShowTitle,
          mode: videoMode
        }
      });
    } else {
      // Toggle playback
      await updateGameState({
        videoPlaying: !isPlaying,
        videoCommandAt: Date.now()
      });
    }
  };

  const restartVideo = async () => {
    // Get URL timestamp from current question's video
    const videoUrl = selectedQuestion?.questionVideoUrl || selectedQuestion?.answerVideoUrl || '';
    const urlTimestamp = extractTimestampFromUrl(videoUrl);

    await updateGameState({
      videoSeekTo: urlTimestamp ?? 0,
      videoCommandAt: Date.now()
    });
  };

  // Extract timestamp from YouTube URL (matches youtube-player.tsx logic)
  const extractTimestampFromUrl = (url: string): number | null => {
    const timeMatch = url.match(/[?&#]t=([^&\s]+)/);
    if (!timeMatch) return null;

    const timeString = timeMatch[1];
    const hourMatch = timeString.match(/(\d+)h/);
    const minuteMatch = timeString.match(/(\d+)m/);
    const secondMatch = timeString.match(/(\d+)s/);

    let totalSeconds = 0;

    if (hourMatch || minuteMatch || secondMatch) {
      if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
      if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
      if (secondMatch) totalSeconds += parseInt(secondMatch[1]);
    } else {
      const seconds = parseInt(timeString);
      if (!isNaN(seconds)) {
        totalSeconds = seconds;
      }
    }

    return totalSeconds > 0 ? totalSeconds : null;
  };

  const dismissQuestion = async () => {
    // Close without marking as answered
    if (selectedQuestion && gameStateRef.current) {
      await updateGameState({
        currentQuestion: null,
        buzzerQueue: [],
        showAnswerToPlayers: false,
        timerEndAt: null,
        // Reset video state
        videoPlayAt: undefined,
        videoPlaying: undefined,
        videoSeekTo: undefined,
        videoCommandAt: undefined,
        videoOptions: undefined
      });

      setSelectedQuestion(null);
      setShowAnswer(false);
      setMarkedCorrectIndex(null);
      setSavedBuzzerQueue([]);
    }
  };

  const closeQuestion = async (applyAllWrong: boolean = false) => {
    // Close AND mark as answered, applying any pending score changes
    const currentState = gameStateRef.current;
    if (!selectedQuestion || !currentState) return;
    
    // Get the buzzer queue to save (use saved queue if reopening, else current)
    const queueToSave = savedBuzzerQueue.length > 0 ? savedBuzzerQueue : (currentState.buzzerQueue || []);
    
    // Apply buzzer scores if any
    const updatedPlayers = await applyBuzzerScores(applyAllWrong);
    
    const updatedCategories = currentState.categories.map(cat => ({
      ...cat,
      questions: cat.questions.map(q => 
        q.id === selectedQuestion.id ? { ...q, answered: true } : q
      )
    }));
    
    // Save scoring history for this question
    const questionScoring: QuestionScoring = {
      buzzerQueue: queueToSave,
      correctPlayerIndex: applyAllWrong ? null : markedCorrectIndex,
      allWrong: applyAllWrong
    };
    
    const updatedQuestionScoring = {
      ...(currentState.questionScoring || {}),
      [selectedQuestion.id]: questionScoring
    };
    
    await updateGameState({
      categories: updatedCategories,
      currentQuestion: null,
      buzzerQueue: [],
      showAnswerToPlayers: false,
      timerEndAt: null,
      questionScoring: updatedQuestionScoring,
      ...(updatedPlayers ? { players: updatedPlayers } : {}),
      // Reset video state
      videoPlayAt: undefined,
      videoPlaying: undefined,
      videoSeekTo: undefined,
      videoCommandAt: undefined,
      videoOptions: undefined
    });
    
    setSelectedQuestion(null);
    setShowAnswer(false);
    setMarkedCorrectIndex(null);
    setSavedBuzzerQueue([]);
  };

  const reopenQuestion = async (categoryId: string, questionId: string) => {
    const currentState = gameStateRef.current;
    if (!currentState) return;
    
    // Get saved scoring for this question
    const savedScoring = currentState.questionScoring?.[questionId];
    
    // Mark question as not answered
    const updatedCategories = currentState.categories.map(cat => ({
      ...cat,
      questions: cat.questions.map(q => 
        q.id === questionId ? { ...q, answered: false } : q
      )
    }));
    
    // Restore the saved buzzer queue and marking BEFORE updating state
    if (savedScoring && savedScoring.buzzerQueue.length > 0) {
      setSavedBuzzerQueue(savedScoring.buzzerQueue);
      setMarkedCorrectIndex(savedScoring.allWrong ? null : savedScoring.correctPlayerIndex);
    } else {
      setSavedBuzzerQueue([]);
      setMarkedCorrectIndex(null);
    }
    
    // Open the question dialog
    const category = currentState.categories.find(c => c.id === categoryId);
    const question = category?.questions.find(q => q.id === questionId);
    if (question) {
      setSelectedQuestion({ ...question, answered: false });
      setShowAnswer(false);
    }
    
    // Update state to mark question as not answered (don't await - dialog should open immediately)
    const newState = { ...currentState, categories: updatedCategories };
    setGameState(newState);
    gameStateRef.current = newState;
    await persistAndBroadcast(newState);
  };

  const clearBuzzerQueue = () => {
    updateGameState({ buzzerQueue: [] });
  };

  const updatePlayerScore = async (playerId: string, points: number) => {
    const currentState = gameStateRef.current;
    if (!currentState) return;
    
    const updatedPlayers = currentState.players.map(p =>
      p.id === playerId ? { ...p, score: p.score + points } : p
    );
    
    // Optimistic update - immediately update local state
    const newState = { ...currentState, players: updatedPlayers };
    setGameState(newState);
    gameStateRef.current = newState;
    
    // Persist to server
    await persistAndBroadcast(newState);
  };

  const applyCustomScore = async (playerId: string, add: boolean) => {
    const value = parseInt(customScores[playerId] || "0", 10);
    if (isNaN(value) || value === 0) return;
    await updatePlayerScore(playerId, add ? value : -value);
  };

  // Toggle marking a player as correct (for visual feedback before closing)
  const toggleCorrectMark = (index: number) => {
    if (markedCorrectIndex === index) {
      // Undo - clear the mark
      setMarkedCorrectIndex(null);
    } else {
      // Mark this player as correct
      setMarkedCorrectIndex(index);
    }
  };

  // Apply scores based on marks when closing question
  const applyBuzzerScores = async (allWrong: boolean = false) => {
    const currentState = gameStateRef.current;
    if (!currentState || !selectedQuestion) return;
    
    const points = selectedQuestion.value;
    // Use saved queue if reopening, else current queue
    const buzzerQueue = savedBuzzerQueue.length > 0 ? savedBuzzerQueue : (currentState.buzzerQueue || []);
    
    if (buzzerQueue.length === 0) return;
    
    let updatedPlayers = [...currentState.players];
    
    if (allWrong) {
      // All players who buzzed get points subtracted
      const buzzedPlayerIds = new Set(buzzerQueue.map(b => b.playerId));
      updatedPlayers = updatedPlayers.map(player => {
        if (buzzedPlayerIds.has(player.id)) {
          return { ...player, score: player.score - points };
        }
        return player;
      });
    } else if (markedCorrectIndex !== null) {
      // Apply scoring based on who was marked correct
      const correctPlayerId = buzzerQueue[markedCorrectIndex]?.playerId;
      
      updatedPlayers = updatedPlayers.map(player => {
        if (player.id === correctPlayerId) {
          // Correct answer - add points
          return { ...player, score: player.score + points };
        }
        
        // Check if this player buzzed before the correct player
        const playerQueueIndex = buzzerQueue.findIndex(b => b.playerId === player.id);
        if (playerQueueIndex !== -1 && playerQueueIndex < markedCorrectIndex) {
          // They buzzed before and got it wrong - subtract points
          return { ...player, score: player.score - points };
        }
        
        return player;
      });
    }
    
    return updatedPlayers;
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
      // Broadcast lobby closed to all players via P2P before deleting
      broadcastLobbyClosed();
      
      // Small delay to ensure message is sent
      await new Promise(resolve => setTimeout(resolve, 100));
      
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

  // Handle kicking a player during the game
  const handleKickPlayer = async (playerIdToKick: string, playerName: string) => {
    const hostId = localStorage.getItem("jeopardy_host_id");
    
    try {
      const response = await fetch(`/api/lobby/${resolvedParams.code}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId, playerIdToKick }),
      });

      if (response.ok) {
        // Broadcast kick notification via P2P
        broadcastPlayerKicked(playerIdToKick);
        
        // Update local state to remove the player
        const currentState = gameStateRef.current;
        if (currentState) {
          const newState = {
            ...currentState,
            players: currentState.players.filter(p => p.id !== playerIdToKick),
            // Also remove from buzzer queue if present
            buzzerQueue: (currentState.buzzerQueue || []).filter(b => b.playerId !== playerIdToKick)
          };
          setGameState(newState);
          gameStateRef.current = newState;
          await persistAndBroadcast(newState);
        }
      } else {
        const data = await response.json();
        setAlertMessage(data.error || "Failed to kick player");
        setShowAlert(true);
      }
    } catch (error) {
      setAlertMessage("Failed to kick player");
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
        questionScoring={gameState.questionScoring}
        categories={gameState.categories}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col p-3 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="mb-3 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex-1 flex items-center gap-2">
              <div className="bg-card/60 backdrop-blur-md border border-border px-4 py-2 rounded-lg">
                <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                  {lobbyName || `Lobby ${resolvedParams.code}`}
                </h1>
              </div>
              <Badge variant="secondary" className="px-2 py-1 text-xs backdrop-blur-md">
                Host
              </Badge>
              <Badge variant="outline" className="px-2 py-1 text-xs font-mono backdrop-blur-md">
                {resolvedParams.code}
              </Badge>
              {/* P2P Connection Status */}
              <Badge 
                variant={isPeerConnected ? "default" : "secondary"} 
                className={`px-2 py-1 text-xs backdrop-blur-md flex items-center gap-1 ${
                  isPeerConnected ? "bg-green-600" : "bg-yellow-600"
                }`}
              >
                {isPeerConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isPeerConnected ? `${connectedPlayers} P2P` : "..."}
              </Badge>
            </div>
            <div className="flex gap-2">
              <LobbyControlsDialog
                players={gameState.players}
                hostId={localStorage.getItem("jeopardy_host_id") || ""}
                lobbyCode={resolvedParams.code}
                playerWins={gameState.playerWins}
                onKickPlayer={handleKickPlayer}
              />
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
        <div className="mb-3 flex-shrink-0">
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
                      {/* Custom Score Entry */}
                      <div className="flex gap-1 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => applyCustomScore(player.id, false)} 
                          className="backdrop-blur-sm px-2"
                          title="Subtract custom amount"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Custom"
                          value={customScores[player.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9-]/g, '');
                            setCustomScores(prev => ({ ...prev, [player.id]: val }));
                          }}
                          className="h-8 w-20 text-center text-sm px-1 [appearance:textfield]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              applyCustomScore(player.id, true);
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => applyCustomScore(player.id, true)} 
                          className="backdrop-blur-sm px-2"
                          title="Add custom amount"
                        >
                          <Plus className="h-3 w-3" />
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
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="py-2 flex-shrink-0">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Game Board</span>
              <span className="text-xs font-normal text-muted-foreground">Hover completed to reopen</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 pb-3">
          <div className="grid gap-1.5 flex-1" style={{ gridTemplateRows: `auto repeat(5, 1fr)` }}>
            <div 
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${gameState.categories.length}, minmax(0, 1fr))` }}
            >
              {gameState.categories.map((category) => (
                <div key={category.id} className="bg-gray-700/50 p-2 text-center rounded-lg backdrop-blur-md border border-white/10 min-w-0">
                  <h2 className="text-sm font-bold uppercase text-white truncate" title={category.name}>{category.name}</h2>
                </div>
              ))}
            </div>
            
            {[0, 1, 2, 3, 4].map((rowIndex) => (
              <div 
                key={rowIndex} 
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${gameState.categories.length}, minmax(0, 1fr))` }}
              >
                {gameState.categories.map((category) => {
                  const question = category.questions[rowIndex];
                  return (
                    <div key={question.id} className="relative min-w-0 h-full">
                      <button
                        onClick={() => selectQuestion(category.id, question.id)}
                        disabled={question.answered}
                        className={`w-full h-full flex items-center justify-center text-xl lg:text-2xl xl:text-3xl font-bold rounded-lg transition-all backdrop-blur-md border ${
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
        <DialogContent className="max-w-5xl max-h-[90vh] border border-white/20 bg-black/30 backdrop-blur-xl flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Question Worth: ${selectedQuestion?.value}</span>
              <Badge variant={gameState?.currentQuestion?.id === selectedQuestion?.id ? "default" : "outline"}>
                {gameState?.currentQuestion?.id === selectedQuestion?.id ? "LIVE - Visible to Players" : "Preview Mode - Not Yet Shown"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* Left Column - Question & Controls */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-300 mb-2">QUESTION:</div>
                <div className={`font-bold break-words ${
                  (selectedQuestion?.question?.length || 0) > 200 
                    ? 'text-base' 
                    : (selectedQuestion?.question?.length || 0) > 100 
                      ? 'text-lg' 
                      : 'text-xl'
                }`}>{selectedQuestion?.question}</div>
                {selectedQuestion?.questionImageUrl && (
                  <div className="mt-3 flex justify-center">
                    <img
                      src={selectedQuestion.questionImageUrl}
                      alt="Question"
                      className="max-w-full max-h-40 rounded-lg object-contain"
                    />
                  </div>
                )}
                {selectedQuestion?.questionVideoUrl && (
                  <div className="mt-3">
                    <YouTubePlayer
                      videoUrl={selectedQuestion.questionVideoUrl}
                      showTitle={videoShowTitle}
                      mode={videoMode}
                      showControls={true}
                      isHost={true}
                      playing={gameState?.videoPlaying}
                      seekTo={gameState?.videoSeekTo}
                      commandAt={gameState?.videoCommandAt}
                      className="max-h-60"
                    />
                  </div>
                )}
              </div>
              
              {showAnswer && (
                <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-gray-300 mb-2">ANSWER:</div>
                  <div className={`font-bold break-words ${
                    (selectedQuestion?.answer?.length || 0) > 100 
                      ? 'text-base' 
                      : 'text-xl'
                  }`}>{selectedQuestion?.answer}</div>
                  {selectedQuestion?.answerImageUrl && (
                    <div className="mt-3 flex justify-center">
                      <img
                        src={selectedQuestion.answerImageUrl}
                        alt="Answer"
                        className="max-w-full max-h-40 rounded-lg object-contain"
                      />
                    </div>
                  )}
                  {selectedQuestion?.answerVideoUrl && (
                    <div className="mt-3">
                      <YouTubePlayer
                        videoUrl={selectedQuestion.answerVideoUrl}
                        showTitle={videoShowTitle}
                        mode={videoMode}
                        showControls={true}
                        isHost={true}
                        playing={gameState?.videoPlaying}
                        seekTo={gameState?.videoSeekTo}
                        commandAt={gameState?.videoCommandAt}
                        className="max-h-60"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Timer Controls */}
              <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold text-sm">Timer</span>
                  </div>
                  {gameState?.timerEndAt && (
                    <div className={`text-2xl font-bold tabular-nums ${
                      currentTime <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
                    }`}>
                      {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      onBlur={() => setTimerDurationInState(timerDuration)}
                      className="w-16 h-8 text-sm"
                      min="1"
                      max="999"
                    />
                    <span className="text-xs text-muted-foreground">sec</span>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    {!gameState?.timerEndAt ? (
                      <Button onClick={startTimer} size="sm" variant="outline" className="h-8 px-2">
                        <Play className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button onClick={stopTimer} size="sm" variant="outline" className="h-8 px-2">
                        <Pause className="h-3 w-3" />
                      </Button>
                    )}
                    <Button onClick={resetTimer} size="sm" variant="outline" className="h-8 px-2">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Video Controls - only show if question or answer has a video */}
              {(selectedQuestion?.questionVideoUrl || selectedQuestion?.answerVideoUrl) && (
                <div className="bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 p-3 rounded-lg">
                  <div className="text-sm font-semibold text-gray-300 mb-3">Video Controls</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Show Video Title</span>
                      <Button
                        onClick={() => {
                          const newValue = !videoShowTitle;
                          setVideoShowTitle(newValue);
                          updateVideoOptions(newValue, videoMode);
                        }}
                        variant={videoShowTitle ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-3 text-xs"
                      >
                        {videoShowTitle ? "Visible" : "Hidden"}
                      </Button>
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 mb-2">Display Mode</div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setVideoMode('full');
                            updateVideoOptions(videoShowTitle, 'full');
                          }}
                          variant={videoMode === 'full' ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                        >
                          Full
                        </Button>
                        <Button
                          onClick={() => {
                            setVideoMode('audio-only');
                            updateVideoOptions(videoShowTitle, 'audio-only');
                          }}
                          variant={videoMode === 'audio-only' ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                        >
                          Audio Only
                        </Button>
                        <Button
                          onClick={() => {
                            setVideoMode('muted');
                            updateVideoOptions(videoShowTitle, 'muted');
                          }}
                          variant={videoMode === 'muted' ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                        >
                          Muted
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-300 mb-2">Playback Controls</div>
                      <div className="flex gap-2">
                        <Button
                          onClick={toggleVideoPlayback}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {gameState?.videoPlaying ? (
                            <>
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Play
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={restartVideo}
                          variant="outline"
                          size="sm"
                          title="Restart video (from timestamp if present)"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        Controls are synchronized across all players
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button onClick={showToPlayers} className="flex-1" size="sm" variant={gameState?.currentQuestion?.id === selectedQuestion?.id ? "secondary" : "default"}>
                    {gameState?.currentQuestion?.id === selectedQuestion?.id ? "Shown to Players" : "Show to Players"}
                  </Button>
                  <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline" size="sm" className="flex-1">
                    {showAnswer ? "Hide Answer" : "Show Answer"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={toggleAnswerToPlayers}
                    variant={gameState?.showAnswerToPlayers ? "secondary" : "outline"}
                    size="sm"
                    className="flex-1"
                    disabled={!gameState?.currentQuestion?.id}
                  >
                    {gameState?.showAnswerToPlayers ? "Answer Shown" : "Show Answer to Players"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => closeQuestion(false)} variant="destructive" size="sm" className="flex-1">
                    Close & Apply Scores
                  </Button>
                  {(gameState?.buzzerQueue || []).length > 0 && markedCorrectIndex === null && (
                    <Button onClick={() => closeQuestion(true)} variant="destructive" size="sm" className="flex-1">
                      All Wrong & Close
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column - Buzzer Queue with Scoring */}
            <div className="w-72 flex-shrink-0 overflow-y-auto border-l border-white/10 pl-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-400" />
                  <span className="font-semibold">Buzzed In</span>
                </div>
                <Button onClick={clearBuzzerQueue} size="sm" variant="ghost" className="h-7 px-2 text-xs">
                  Clear
                </Button>
              </div>
              
              {(() => {
                // Use saved queue if available (reopening), else current queue
                const displayQueue = savedBuzzerQueue.length > 0 ? savedBuzzerQueue : (gameState?.buzzerQueue || []);
                const isReopened = savedBuzzerQueue.length > 0;
                
                if (displayQueue.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No one has buzzed yet</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {isReopened && (
                      <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-lg mb-2">
                        <div className="text-xs font-semibold text-amber-300">REOPENED - Previous responses shown</div>
                      </div>
                    )}
                    {displayQueue.map((buzz, index) => {
                    const isMarkedCorrect = markedCorrectIndex === index;
                    const isMarkedWrong = markedCorrectIndex !== null && index < markedCorrectIndex;
                    const isDisabled = markedCorrectIndex !== null && index > markedCorrectIndex;
                    
                    return (
                      <div 
                        key={index} 
                        className={`backdrop-blur-sm rounded-lg p-3 transition-all ${
                          isMarkedCorrect 
                            ? 'bg-green-600/40 border-2 border-green-400' 
                            : isMarkedWrong 
                              ? 'bg-red-600/30 border border-red-400/50 opacity-60' 
                              : isDisabled
                                ? 'bg-gray-700/20 border border-gray-600/30 opacity-40'
                                : 'bg-gray-700/30 border border-gray-600/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg font-bold ${
                            isMarkedCorrect ? 'text-green-300' :
                            isMarkedWrong ? 'text-red-400' :
                            index === 0 ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            #{index + 1}
                          </span>
                          <span className={`font-semibold flex-1 truncate ${
                            isMarkedCorrect ? 'text-green-200' :
                            isMarkedWrong ? 'text-red-300' : ''
                          }`}>{buzz.playerName}</span>
                          {isMarkedCorrect && <Badge className="text-xs bg-green-500">+${selectedQuestion?.value}</Badge>}
                          {isMarkedWrong && <Badge variant="destructive" className="text-xs">-${selectedQuestion?.value}</Badge>}
                          {!isMarkedCorrect && !isMarkedWrong && index === 0 && <Badge variant="secondary" className="text-xs">First</Badge>}
                        </div>
                        
                        {!isMarkedWrong && !isDisabled && (
                          <Button
                            size="sm"
                            variant={isMarkedCorrect ? "outline" : "default"}
                            className={`w-full h-9 group ${
                              isMarkedCorrect 
                                ? 'border-green-400 text-green-300 hover:bg-green-600/30' 
                                : 'bg-green-600 hover:bg-green-500'
                            }`}
                            onClick={() => toggleCorrectMark(index)}
                          >
                            {isMarkedCorrect ? (
                              <>
                                <span className="group-hover:hidden">✓ Marked Correct</span>
                                <span className="hidden group-hover:inline">↩ Undo</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Correct
                              </>
                            )}
                          </Button>
                        )}
                        
                        {isMarkedWrong && (
                          <div className="text-center text-sm text-red-400 font-medium">
                            Wrong (answered before correct)
                          </div>
                        )}
                        
                        {isDisabled && (
                          <div className="text-center text-sm text-gray-500 font-medium">
                            Not yet answered
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                    {/* Score preview */}
                    {markedCorrectIndex !== null && (
                      <div className="mt-3 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                        <div className="text-xs font-semibold text-blue-300 mb-1">SCORE PREVIEW</div>
                        <div className="text-sm text-blue-200">
                          Scores will be applied when you close the question.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Manual Score Adjustment Section */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs font-semibold text-gray-400 mb-2">MANUAL ADJUST</div>
                <div className="space-y-2">
                  {gameState?.players.map(player => (
                    <div key={player.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{player.name}</span>
                      <span className={`font-bold w-16 text-right ${
                        player.score > 0 ? 'text-green-400' : player.score < 0 ? 'text-red-400' : ''
                      }`}>${player.score}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updatePlayerScore(player.id, selectedQuestion?.value || 100)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updatePlayerScore(player.id, -(selectedQuestion?.value || 100))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
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

