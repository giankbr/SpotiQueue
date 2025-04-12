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

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        users: session.users,
        queue: session.queue,
        currentlyPlaying: session.currentlyPlaying,
      },
    });
  } catch (error) {
    console.error('Error fetching session status:', error);
    return NextResponse.json({ error: 'Failed to fetch session status' }, { status: 500 });
  }
}
