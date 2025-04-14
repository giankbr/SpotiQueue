'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { LogIn, Music } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get code from URL and use it as initial state
  const codeFromURL = searchParams.get('code') || '';
  const [sessionCode, setSessionCode] = useState(codeFromURL);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // This effect will run if the URL parameters change
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setSessionCode(code);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    // Your existing join logic
    if (!sessionCode.trim() || !userName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both a session code and your name.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/session/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sessionCode,
          name: userName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join session');
      }

      const data = await response.json();

      // Navigate to dashboard with session info
      router.push(`/dashboard?session=${data.sessionId}&code=${sessionCode}&userId=${data.userId}&username=${userName}`);
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast({
        title: 'Join Error',
        description: error.message || 'Failed to join session',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-black p-4">
      <Card className="w-full max-w-md bg-black/60 border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-500 p-3 rounded-full">
              <Music className="w-8 h-8 text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Join SpotiQueue Session</CardTitle>
          <CardDescription className="text-center text-gray-400">Enter the session code to join the party</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-code" className="text-white">
              Session Code
            </Label>
            <Input
              id="session-code"
              placeholder="e.g. ABC123"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              className="bg-black/60 border-green-500/30 text-white text-center text-xl tracking-wider font-bold"
              maxLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-name" className="text-white">
              Your Name
            </Label>
            <Input id="user-name" placeholder="How should we call you?" value={userName} onChange={(e) => setUserName(e.target.value)} className="bg-black/60 border-green-500/30 text-white" />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full py-6 text-lg bg-green-500 hover:bg-green-600 text-black" onClick={handleJoin} disabled={isLoading || !sessionCode.trim() || !userName.trim()}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Joining...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="mr-2 h-5 w-5" />
                Join Session
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
