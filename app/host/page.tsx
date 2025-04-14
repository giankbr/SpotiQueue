'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { LogIn, Music } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HostPage() {
  const [sessionName, setSessionName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLogin = async () => {
    if (!sessionName.trim()) return;

    // Validate session code
    if (!sessionCode.trim()) {
      toast({
        title: 'Session Code Required',
        description: 'Please enter a session code for your guests to join with.',
        variant: 'destructive',
      });
      return;
    }

    if (status === 'unauthenticated') {
      // If not logged in with Spotify, initiate login
      signIn('spotify', {
        callbackUrl: `/host?sessionName=${encodeURIComponent(sessionName)}&sessionCode=${encodeURIComponent(sessionCode)}`,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create a new session with the manually entered code
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sessionName,
          code: sessionCode, // Send the manually entered code
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();

      // Navigate to dashboard with session info
      router.push(`/dashboard?session=${data.session.id}&code=${data.session.code}&host=true`);
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Session Error',
        description: error.message || 'Failed to create session',
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
          <CardTitle className="text-2xl text-center text-white">Host a SpotiQueue Session</CardTitle>
          <CardDescription className="text-center text-gray-400">Connect your Spotify Premium account to start a collaborative queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name" className="text-white">
              Session Name
            </Label>
            <Input id="session-name" placeholder="My Awesome Party" value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="bg-black/60 border-green-500/30 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-code" className="text-white">
              Session Code
            </Label>
            <Input
              id="session-code"
              placeholder="Create a simple code (e.g. PARTY123)"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="bg-black/60 border-green-500/30 text-white"
            />
            <p className="text-sm text-gray-400">Create a simple code that's easy for your friends to type in.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full py-6 text-lg bg-green-500 hover:bg-green-600 text-black" onClick={handleLogin} disabled={isLoading || !sessionName.trim() || !sessionCode.trim()}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="mr-2 h-5 w-5" />
                {status === 'authenticated' ? 'Create Session' : 'Connect with Spotify'}
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
