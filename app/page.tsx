import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <Badge variant="secondary" className="text-sm font-medium px-4 py-1.5">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Free • No Registration Required
          </Badge>
          
          <h1 className="text-7xl md:text-8xl font-black text-white mb-4 tracking-tight drop-shadow-2xl">
            POOR MAN&apos;S
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500">
              JEOPARDY
            </span>
          </h1>
          
          <div className="space-y-2">
            <p className="text-2xl text-blue-100 font-medium">Interactive Game Show Experience</p>
            <p className="text-lg text-blue-300/80 max-w-2xl mx-auto">
              Create lobbies, invite friends, and compete in trivia battles using simple lobby codes
            </p>
          </div>
        </div>
        
        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="relative overflow-hidden border-2 hover:border-yellow-400 transition-all hover:shadow-2xl hover:scale-105 group">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="text-center pb-4 relative">
              <div className="mx-auto mb-6 w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Crown className="w-12 h-12 text-white" />
              </div>
              
              <CardTitle className="text-2xl font-bold mb-2">Host a Game</CardTitle>
              <CardDescription className="text-base">
                Create a custom lobby and set up your own trivia questions
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <Link href="/lobby/create" className="block">
                <Button className="w-full h-12 text-base font-semibold" size="lg">
                  Create Lobby
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Get a 4-character code to share
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-2 hover:border-purple-400 transition-all hover:shadow-2xl hover:scale-105 group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="text-center pb-4 relative">
              <div className="mx-auto mb-6 w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Users className="w-12 h-12 text-white" />
              </div>
              
              <CardTitle className="text-2xl font-bold mb-2">Join a Game</CardTitle>
              <CardDescription className="text-base">
                Enter a lobby code and compete against friends
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <Link href="/lobby/join" className="block">
                <Button className="w-full h-12 text-base font-semibold" size="lg" variant="secondary">
                  Join Lobby
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Have a code? Jump right in
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-blue-300/60 text-sm">
          <p>Built with Next.js, React, and Tailwind CSS</p>
        </div>
      </div>
    </main>
  );
}

