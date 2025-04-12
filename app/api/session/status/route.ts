import { getSessionById } from '@/lib/session-store';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await getSessionById(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Return only what's needed to reduce payload size
    return NextResponse.json(
      {
        session: {
          id: session.id,
          code: session.code,
          name: session.name,
          users: session.users,
          queue: session.queue,
          currentlyPlaying: session.currentlyPlaying,
        },
      },
      {
        headers: {
          // Add cache control headers to prevent caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching session status:', error);
    return NextResponse.json({ error: 'Failed to fetch session status' }, { status: 500 });
  }
}
