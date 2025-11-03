import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">JEOPARDY!</h1>
          <p className="text-xl text-blue-200">Interactive Game Show Experience</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-2xl transition-shadow">
            <CardHeader>
              <CardTitle>Host Setup</CardTitle>
              <CardDescription>Create and manage game categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/host/setup">
                <Button className="w-full" size="lg">Setup Game</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-2xl transition-shadow">
            <CardHeader>
              <CardTitle>Host View</CardTitle>
              <CardDescription>Control game with answers visible</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/host/game">
                <Button className="w-full" size="lg" variant="secondary">Host Game</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-2xl transition-shadow">
            <CardHeader>
              <CardTitle>Player View</CardTitle>
              <CardDescription>Join game and compete with buzzer</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/player">
                <Button className="w-full" size="lg" variant="outline">Join as Player</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

