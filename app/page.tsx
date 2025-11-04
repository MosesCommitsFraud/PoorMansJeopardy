"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users } from "lucide-react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <DottedGlowBackground
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-100"
        opacity={1}
        gap={16}
        radius={2}
        colorLightVar="--color-primary"
        glowColorLightVar="--color-primary"
        colorDarkVar="--color-primary"
        glowColorDarkVar="--color-primary"
        backgroundOpacity={0}
        speedMin={0.3}
        speedMax={1.2}
        speedScale={1}
      />

      <main className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-blue-400">
              POOR MAN'S
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
              JEOPARDY
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create custom trivia games and challenge your friends
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Host Card */}
          <Link href="/lobby/create" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 hover:border-primary/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2">Host a Game</CardTitle>
                <CardDescription className="text-base">
                  Create and manage your own trivia session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Custom questions and categories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Control game flow and scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Optional password protection</span>
                  </div>
                </div>
                <Button className="w-full mt-4" size="lg">
                  <Crown className="w-4 h-4 mr-2" />
                  Start Hosting
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Player Card */}
          <Link href="/lobby/join" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 hover:border-primary/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2">Join a Game</CardTitle>
                <CardDescription className="text-base">
                  Enter a game code and start playing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Quick join with 4-char code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Real-time buzzer system</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>No registration needed</span>
                  </div>
                </div>
                <Button className="w-full mt-4" size="lg" variant="secondary">
                  <Users className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          <p>Free to use • No registration • Active for 24 hours</p>
        </div>
      </main>
    </div>
  );
}
