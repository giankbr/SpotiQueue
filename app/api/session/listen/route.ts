import { NextRequest } from 'next/server';
import { getSessionById } from '@/lib/session';
import { getCurrentlyPlaying } from '@/lib/spotify';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// This is a simple example of SSE. In a production app, you'd use a more robust solution.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  const queueSession = getSessionById(sessionId);
  if (!queueSession) {
    return new Response('Session not found', { status: 404 });
  }

  const authSession = await getServerSession(authOptions);
  const isHost = authSession?.user?.email === queueSession.hostId;

  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial state
      send('queue', { queue: queueSession.queue });
      send('users', { users: queueSession.users });

      // If the user is the host, also send player state
      if (isHost) {
        try {
          const playerState = await getCurrentlyPlaying(authSession);
          send('player', { player: playerState });
        } catch (error) {
          console.error('Error getting player state:', error);
        }
      }

      // In a real implementation, you would use a pub/sub system or WebSockets
      // to push updates to the client. For simplicity, we'll just simulate
      // polling updates every few seconds.

      const interval = setInterval(async () => {
        const updatedSession = getSessionById(sessionId);
        if (!updatedSession || !updatedSession.active) {
          clearInterval(interval);
          controller.close();
          return;
        }

        send('queue', { queue: updatedSession.queue });
        send('users', { users: updatedSession.users });

        if (isHost) {
          try {
            const playerState = await getCurrentlyPlaying(authSession);
            send('player', { player: playerState });
          } catch (error) {
            console.error('Error getting player state:', error);
          }
        }
      }, 5000); // Poll every 5 seconds

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
