"use client";

import { Player, QuestionScoring, Category } from "@/types/game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Medal, Home, Power, Zap, Target, XCircle, TrendingUp, Award, Timer, BarChart3 } from "lucide-react";
import ShinyText from "./ShinyText";
import { useState } from "react";

interface EndGameScreenProps {
  players: Player[];
  lobbyCode: string;
  isHost: boolean;
  onReturnToLobby: () => void;
  onCloseLobby?: () => void;
  playerWins?: Record<string, number>;
  questionScoring?: Record<string, QuestionScoring>;
  categories?: Category[];
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  correctAnswers: number;
  wrongAnswers: number;
  totalBuzzes: number;
  firstBuzzes: number;
  pointsGained: number;
  pointsLost: number;
  highestValueCorrect: number;
  averageBuzzPosition: number;
}

interface StatAward {
  title: string;
  icon: React.ReactNode;
  playerId: string | null;
  playerName: string;
  value: string;
  description: string;
  color: string;
}

export function EndGameScreen({ 
  players, 
  lobbyCode, 
  isHost, 
  onReturnToLobby, 
  onCloseLobby, 
  playerWins,
  questionScoring,
  categories 
}: EndGameScreenProps) {
  const [showStats, setShowStats] = useState(false);
  
  // Sort players by score (highest first)
  const sortedPlayers = [...players]
    .filter(p => !p.isHost)
    .sort((a, b) => b.score - a.score);

  const winner = sortedPlayers[0];
  const hasWinner = winner && winner.score > 0;

  // Calculate player statistics
  const calculateStats = (): PlayerStats[] => {
    const statsMap = new Map<string, PlayerStats>();
    
    // Initialize stats for all players
    players.filter(p => !p.isHost).forEach(player => {
      statsMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        correctAnswers: 0,
        wrongAnswers: 0,
        totalBuzzes: 0,
        firstBuzzes: 0,
        pointsGained: 0,
        pointsLost: 0,
        highestValueCorrect: 0,
        averageBuzzPosition: 0,
      });
    });

    if (!questionScoring || !categories) return Array.from(statsMap.values());

    // Build a map of question IDs to their values
    const questionValues = new Map<string, number>();
    categories.forEach(cat => {
      cat.questions.forEach(q => {
        questionValues.set(q.id, q.value);
      });
    });

    // Process each scored question
    const buzzPositions = new Map<string, number[]>();
    
    Object.entries(questionScoring).forEach(([questionId, scoring]) => {
      const questionValue = questionValues.get(questionId) || 0;
      const { buzzerQueue, correctPlayerIndex, allWrong } = scoring;
      
      if (buzzerQueue.length === 0) return;

      // Track first buzzer
      const firstBuzzerId = buzzerQueue[0]?.playerId;
      if (firstBuzzerId && statsMap.has(firstBuzzerId)) {
        const stats = statsMap.get(firstBuzzerId)!;
        stats.firstBuzzes++;
      }

      // Process each buzzer in queue
      buzzerQueue.forEach((buzz, index) => {
        const stats = statsMap.get(buzz.playerId);
        if (!stats) return;

        stats.totalBuzzes++;
        
        // Track buzz positions for average
        if (!buzzPositions.has(buzz.playerId)) {
          buzzPositions.set(buzz.playerId, []);
        }
        buzzPositions.get(buzz.playerId)!.push(index + 1);

        if (allWrong) {
          // Everyone who buzzed got it wrong
          stats.wrongAnswers++;
          stats.pointsLost += questionValue;
        } else if (correctPlayerIndex !== null) {
          if (index === correctPlayerIndex) {
            // This player got it correct
            stats.correctAnswers++;
            stats.pointsGained += questionValue;
            if (questionValue > stats.highestValueCorrect) {
              stats.highestValueCorrect = questionValue;
            }
          } else if (index < correctPlayerIndex) {
            // Buzzed before correct player = wrong
            stats.wrongAnswers++;
            stats.pointsLost += questionValue;
          }
          // Players after correct player: no penalty
        }
      });
    });

    // Calculate average buzz positions
    buzzPositions.forEach((positions, playerId) => {
      const stats = statsMap.get(playerId);
      if (stats && positions.length > 0) {
        stats.averageBuzzPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
      }
    });

    return Array.from(statsMap.values());
  };

  const playerStats = calculateStats();

  // Generate stat awards
  const generateAwards = (): StatAward[] => {
    const awards: StatAward[] = [];
    
    if (playerStats.length === 0) return awards;

    // Most Correct Answers
    const mostCorrect = [...playerStats].sort((a, b) => b.correctAnswers - a.correctAnswers)[0];
    if (mostCorrect && mostCorrect.correctAnswers > 0) {
      awards.push({
        title: "Most Correct Answers",
        icon: <Target className="h-6 w-6" />,
        playerId: mostCorrect.playerId,
        playerName: mostCorrect.playerName,
        value: `${mostCorrect.correctAnswers}`,
        description: "Questions answered correctly",
        color: "text-green-400"
      });
    }

    // Most Wrong Answers
    const mostWrong = [...playerStats].sort((a, b) => b.wrongAnswers - a.wrongAnswers)[0];
    if (mostWrong && mostWrong.wrongAnswers > 0) {
      awards.push({
        title: "Most Wrong Answers",
        icon: <XCircle className="h-6 w-6" />,
        playerId: mostWrong.playerId,
        playerName: mostWrong.playerName,
        value: `${mostWrong.wrongAnswers}`,
        description: "Incorrect answers given",
        color: "text-red-400"
      });
    }

    // Most First Buzzes
    const quickestDraw = [...playerStats].sort((a, b) => b.firstBuzzes - a.firstBuzzes)[0];
    if (quickestDraw && quickestDraw.firstBuzzes > 0) {
      awards.push({
        title: "Fastest Buzzer",
        icon: <Zap className="h-6 w-6" />,
        playerId: quickestDraw.playerId,
        playerName: quickestDraw.playerName,
        value: `${quickestDraw.firstBuzzes}x`,
        description: "Times first to buzz",
        color: "text-yellow-400"
      });
    }

    // Most Buzzes Total
    const mostActive = [...playerStats].sort((a, b) => b.totalBuzzes - a.totalBuzzes)[0];
    if (mostActive && mostActive.totalBuzzes > 0) {
      awards.push({
        title: "Most Buzzes Total",
        icon: <Timer className="h-6 w-6" />,
        playerId: mostActive.playerId,
        playerName: mostActive.playerName,
        value: `${mostActive.totalBuzzes}x`,
        description: "Total times buzzed in",
        color: "text-blue-400"
      });
    }

    // Best Accuracy (correct / total buzzes, min 3 buzzes)
    const accuracyPlayers = playerStats.filter(p => p.totalBuzzes >= 3);
    if (accuracyPlayers.length > 0) {
      const bestAccuracy = [...accuracyPlayers].sort((a, b) => 
        (b.correctAnswers / b.totalBuzzes) - (a.correctAnswers / a.totalBuzzes)
      )[0];
      const accuracy = Math.round((bestAccuracy.correctAnswers / bestAccuracy.totalBuzzes) * 100);
      if (accuracy > 0) {
        awards.push({
          title: "Best Accuracy",
          icon: <Award className="h-6 w-6" />,
          playerId: bestAccuracy.playerId,
          playerName: bestAccuracy.playerName,
          value: `${accuracy}%`,
          description: "Correct answers / total buzzes",
          color: "text-cyan-400"
        });
      }
    }

    // Worst Accuracy (min 3 buzzes)
    if (accuracyPlayers.length > 1) {
      const worstAccuracy = [...accuracyPlayers].sort((a, b) => 
        (a.correctAnswers / a.totalBuzzes) - (b.correctAnswers / b.totalBuzzes)
      )[0];
      const accuracy = Math.round((worstAccuracy.correctAnswers / worstAccuracy.totalBuzzes) * 100);
      if (accuracy < 100 && worstAccuracy.playerId !== accuracyPlayers.sort((a, b) => 
        (b.correctAnswers / b.totalBuzzes) - (a.correctAnswers / a.totalBuzzes)
      )[0].playerId) {
        awards.push({
          title: "Worst Accuracy",
          icon: <XCircle className="h-6 w-6" />,
          playerId: worstAccuracy.playerId,
          playerName: worstAccuracy.playerName,
          value: `${accuracy}%`,
          description: "Correct answers / total buzzes",
          color: "text-orange-400"
        });
      }
    }

    // Highest Value Correct
    const bigWinner = [...playerStats].sort((a, b) => b.highestValueCorrect - a.highestValueCorrect)[0];
    if (bigWinner && bigWinner.highestValueCorrect > 0) {
      awards.push({
        title: "Highest Value Correct",
        icon: <TrendingUp className="h-6 w-6" />,
        playerId: bigWinner.playerId,
        playerName: bigWinner.playerName,
        value: `$${bigWinner.highestValueCorrect}`,
        description: "Biggest single question win",
        color: "text-purple-400"
      });
    }

    // Most Points Earned
    const biggestGainer = [...playerStats].sort((a, b) => b.pointsGained - a.pointsGained)[0];
    if (biggestGainer && biggestGainer.pointsGained > 0) {
      awards.push({
        title: "Most Points Earned",
        icon: <TrendingUp className="h-6 w-6" />,
        playerId: biggestGainer.playerId,
        playerName: biggestGainer.playerName,
        value: `+$${biggestGainer.pointsGained}`,
        description: "Total from correct answers",
        color: "text-emerald-400"
      });
    }

    // Most Points Lost
    const biggestLoser = [...playerStats].sort((a, b) => b.pointsLost - a.pointsLost)[0];
    if (biggestLoser && biggestLoser.pointsLost > 0) {
      awards.push({
        title: "Most Points Lost",
        icon: <XCircle className="h-6 w-6" />,
        playerId: biggestLoser.playerId,
        playerName: biggestLoser.playerName,
        value: `-$${biggestLoser.pointsLost}`,
        description: "Total from wrong answers",
        color: "text-red-400"
      });
    }

    // Best Net Points (gained - lost)
    const netPoints = playerStats.map(p => ({
      ...p,
      netPoints: p.pointsGained - p.pointsLost
    }));
    const bestNet = [...netPoints].sort((a, b) => b.netPoints - a.netPoints)[0];
    if (bestNet && bestNet.netPoints !== 0 && bestNet.totalBuzzes > 0) {
      awards.push({
        title: "Best Net Points",
        icon: <TrendingUp className="h-6 w-6" />,
        playerId: bestNet.playerId,
        playerName: bestNet.playerName,
        value: `${bestNet.netPoints >= 0 ? '+' : ''}$${bestNet.netPoints}`,
        description: "Points earned minus lost",
        color: bestNet.netPoints >= 0 ? "text-green-400" : "text-red-400"
      });
    }

    // Worst Net Points
    const worstNet = [...netPoints].sort((a, b) => a.netPoints - b.netPoints)[0];
    if (worstNet && worstNet.netPoints < 0 && worstNet.playerId !== bestNet.playerId) {
      awards.push({
        title: "Worst Net Points",
        icon: <XCircle className="h-6 w-6" />,
        playerId: worstNet.playerId,
        playerName: worstNet.playerName,
        value: `$${worstNet.netPoints}`,
        description: "Points earned minus lost",
        color: "text-red-400"
      });
    }

    // Best Average Buzz Position (lower is better, min 3 buzzes)
    const positionPlayers = playerStats.filter(p => p.averageBuzzPosition > 0 && p.totalBuzzes >= 3);
    if (positionPlayers.length > 0) {
      const bestPosition = [...positionPlayers].sort((a, b) => a.averageBuzzPosition - b.averageBuzzPosition)[0];
      awards.push({
        title: "Best Avg Buzz Position",
        icon: <Zap className="h-6 w-6" />,
        playerId: bestPosition.playerId,
        playerName: bestPosition.playerName,
        value: `#${bestPosition.averageBuzzPosition.toFixed(1)}`,
        description: "Average queue position",
        color: "text-yellow-400"
      });
    }

    // Never Wrong (100% accuracy with at least 2 correct)
    const perfectPlayers = playerStats.filter(p => p.correctAnswers >= 2 && p.wrongAnswers === 0);
    if (perfectPlayers.length > 0) {
      const mostPerfect = [...perfectPlayers].sort((a, b) => b.correctAnswers - a.correctAnswers)[0];
      awards.push({
        title: "Perfect Record",
        icon: <Award className="h-6 w-6" />,
        playerId: mostPerfect.playerId,
        playerName: mostPerfect.playerName,
        value: `${mostPerfect.correctAnswers}/${mostPerfect.correctAnswers}`,
        description: "No wrong answers",
        color: "text-emerald-400"
      });
    }

    // Most Cautious (fewest buzzes but still participated)
    const activePlayers = playerStats.filter(p => p.totalBuzzes > 0);
    if (activePlayers.length > 2) {
      const mostCautious = [...activePlayers].sort((a, b) => a.totalBuzzes - b.totalBuzzes)[0];
      if (mostCautious.totalBuzzes < mostActive.totalBuzzes) {
        awards.push({
          title: "Most Cautious",
          icon: <Timer className="h-6 w-6" />,
          playerId: mostCautious.playerId,
          playerName: mostCautious.playerName,
          value: `${mostCautious.totalBuzzes}x`,
          description: "Fewest buzzes",
          color: "text-gray-400"
        });
      }
    }

    return awards;
  };

  const awards = generateAwards();

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
      <div className="w-full max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

        {/* Toggle between Scores and Stats */}
        <div className="flex justify-center gap-2">
          <Button
            variant={!showStats ? "default" : "outline"}
            onClick={() => setShowStats(false)}
            className="gap-2"
          >
            <Trophy className="h-4 w-4" />
            Final Scores
          </Button>
          <Button
            variant={showStats ? "default" : "outline"}
            onClick={() => setShowStats(true)}
            className="gap-2"
            disabled={awards.length === 0}
          >
            <BarChart3 className="h-4 w-4" />
            Game Stats
          </Button>
        </div>

        {/* Final Scoreboard */}
        {!showStats && (
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
                  sortedPlayers.map((player, index) => {
                    const winCount = playerWins?.[player.id] || 0;
                    const stats = playerStats.find(s => s.playerId === player.id);
                    return (
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold ${index === 0 ? "text-xl" : "text-lg"}`}>
                                {player.name}
                              </span>
                              {index < 3 && (
                                <Badge variant={getRankBadgeVariant(index)} className="text-xs">
                                  #{index + 1}
                                </Badge>
                              )}
                              {winCount > 0 && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  {winCount} {winCount === 1 ? "win" : "wins"}
                                </Badge>
                              )}
                            </div>
                            {stats && (
                              <p className="text-xs text-muted-foreground">
                                {stats.correctAnswers} correct • {stats.wrongAnswers} wrong • {stats.totalBuzzes} buzzes
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`font-bold ${index === 0 ? "text-2xl" : "text-xl"}`}>
                          ${player.score.toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Statistics */}
        {showStats && awards.length > 0 && (
          <Card className="bg-card/70 backdrop-blur-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-6 w-6" />
                Game Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {awards.map((award, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border hover:bg-card/70 transition-all"
                  >
                    <div className={`p-3 rounded-full bg-background/50 ${award.color}`}>
                      {award.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg truncate">{award.title}</span>
                        <Badge variant="outline" className={`${award.color} border-current`}>
                          {award.value}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{award.playerName}</p>
                      <p className="text-xs text-muted-foreground/70">{award.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Stats Table */}
        {showStats && playerStats.some(s => s.totalBuzzes > 0) && (
          <Card className="bg-card/70 backdrop-blur-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-5 w-5" />
                Player Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Player</th>
                      <th className="text-center py-2 px-2">✓</th>
                      <th className="text-center py-2 px-2">✗</th>
                      <th className="text-center py-2 px-2">Buzzes</th>
                      <th className="text-center py-2 px-2">1st</th>
                      <th className="text-right py-2 px-2">+$</th>
                      <th className="text-right py-2 px-2">-$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats
                      .filter(s => s.totalBuzzes > 0)
                      .sort((a, b) => b.correctAnswers - a.correctAnswers)
                      .map(stat => (
                        <tr key={stat.playerId} className="border-b border-border/50 hover:bg-card/30">
                          <td className="py-2 px-2 font-medium">{stat.playerName}</td>
                          <td className="text-center py-2 px-2 text-green-400">{stat.correctAnswers}</td>
                          <td className="text-center py-2 px-2 text-red-400">{stat.wrongAnswers}</td>
                          <td className="text-center py-2 px-2">{stat.totalBuzzes}</td>
                          <td className="text-center py-2 px-2 text-yellow-400">{stat.firstBuzzes}</td>
                          <td className="text-right py-2 px-2 text-green-400">${stat.pointsGained}</td>
                          <td className="text-right py-2 px-2 text-red-400">${stat.pointsLost}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                ✓ = Correct answers • ✗ = Wrong answers • 1st = First to buzz
              </div>
            </CardContent>
          </Card>
        )}

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
