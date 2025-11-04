"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto">
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
            <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-white/20 hover:border-primary/50 bg-black/20 backdrop-blur-xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2">Host a Game</CardTitle>
                <CardDescription className="text-base">
                  Create and manage your own trivia session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  <Crown className="w-4 h-4 mr-2" />
                  Start Hosting
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Player Card */}
          <Link href="/lobby/join" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-white/20 hover:border-primary/50 bg-black/20 backdrop-blur-xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2">Join a Game</CardTitle>
                <CardDescription className="text-base">
                  Enter a game code and start playing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg" variant="secondary">
                  <Users className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
