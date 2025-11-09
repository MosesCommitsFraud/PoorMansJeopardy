"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Users } from "lucide-react";
import ShinyText from "@/components/ShinyText";
import SettingsButton from "@/components/SettingsButton";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <SettingsButton />
      <div className="w-full max-w-5xl mx-auto flex-grow flex flex-col items-center justify-center">
        <div className="text-center mb-12 space-y-6">
          {/* PMJ Logo */}
          <div className="flex items-center justify-center mb-8">
            <img
              src="/PMJLogo.svg"
              alt="Poor Man's Jeopardy"
              className="w-full max-w-4xl h-auto"
            />
          </div>

          {/* Shiny subtext in frosted glass chip */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-6 py-3 text-lg backdrop-blur-md">
              <ShinyText
                text="Create custom trivia games and challenge your friends"
                disabled={false}
                speed={3}
              />
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Host Card */}
          <Link href="/lobby/create" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-primary/50">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
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
            <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-primary/50">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
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

      {/* Footer Chip */}
      <div className="w-full flex justify-center pb-6">
        <Badge variant="secondary" className="px-6 py-3 backdrop-blur-md rounded-full flex items-center gap-4 shadow-lg">
          {/* Logo */}
          <img
            src="/logo-white.svg"
            alt="PMJ Logo"
            className="h-5 w-auto"
          />

          {/* Separator */}
          <div className="h-5 w-px bg-foreground/30" />

          {/* Links */}
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/imprint"
              className="hover:text-primary transition-colors"
            >
              Imprint
            </Link>
            <span className="text-foreground/30">•</span>
            <Link
              href="/data-declaration"
              className="hover:text-primary transition-colors"
            >
              Data Declaration
            </Link>
          </div>
        </Badge>
      </div>
    </main>
  );
}
