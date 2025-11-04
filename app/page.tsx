import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-bold text-white mb-4 tracking-wider drop-shadow-2xl">JEOPARDY!</h1>
          <p className="text-2xl text-blue-200 mb-2">Interactive Game Show Experience</p>
          <p className="text-lg text-blue-300">Play with friends using lobby codes</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Card className="hover:shadow-2xl transition-all hover:scale-105 border-2 border-blue-400">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Host a Game</CardTitle>
              <CardDescription className="text-base">Create a lobby and invite players</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/lobby/create">
                <Button className="w-full" size="lg">Create Lobby</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-2xl transition-all hover:scale-105 border-2 border-purple-400">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Join a Game</CardTitle>
              <CardDescription className="text-base">Enter a lobby code to play</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/lobby/join">
                <Button className="w-full" size="lg" variant="secondary">Join Lobby</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

