'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading skeleton component for Suspense fallback
function JoinPageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-black p-4">
      <Card className="w-full max-w-md bg-black/60 border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-500 p-3 rounded-full">
              <Users className="w-8 h-8 text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Join a SpotiQueue Session</CardTitle>
          <CardDescription className="text-center text-gray-400">Loading...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-8">
          <div className="flex justify-center">
            <svg className="animate-spin h-10 w-10 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component that uses useSearchParams - must be wrapped in Suspense
function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get code from URL query parameter
  const codeFromURL = searchParams.get('code') || '';
  const [sessionCode, setSessionCode] = useState(codeFromURL);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update session code if URL parameter changes
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setSessionCode(code);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!sessionCode.trim() || !username.trim()) return;

    setIsLoading(true);

    try {
      // Join the session
      const response = await fetch('/api/session/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sessionCode,
          username: username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join session');
      }

      const data = await response.json();

      // Navigate to dashboard with session info
      router.push(`/dashboard?session=${data.session.id}&code=${data.session.code}&userId=${data.user.id}&username=${encodeURIComponent(username)}`);
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
              <Users className="w-8 h-8 text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">Join a SpotiQueue Session</CardTitle>
          <CardDescription className="text-center text-gray-400">Enter the session code and your name to join</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-code" className="text-white">
              Session Code
            </Label>
            <Input
              id="session-code"
              placeholder="Enter code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              className="bg-black/60 border-green-500/30 text-white text-center text-xl tracking-wider font-medium"
            />
            {codeFromURL && <p className="text-xs text-green-400 mt-1">Code auto-filled from shared link</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              Your Name
            </Label>
            <Input
              id="username"
              placeholder="How others will see you"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/60 border-green-500/30 text-white"
              autoFocus={!!codeFromURL} // Auto focus name field if code was provided
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full py-6 text-lg bg-green-500 hover:bg-green-600 text-black" onClick={handleJoin} disabled={isLoading || !sessionCode.trim() || !username.trim()}>
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
                <Users className="mr-2 h-5 w-5" />
                Join Session
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Main component with Suspense boundary
export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageSkeleton />}>
      <JoinPageContent />
    </Suspense>
  );
}
