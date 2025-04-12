import { getSessionById, updateCurrentlyPlaying } from '@/lib/session';
import { getServerSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { sessionId, currentTrack } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const queueSession = getSessionById(sessionId);

  if (!queueSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Only the host should update the currently playing track
  const userId = session.user.email || session.user.name || 'unknown';
  if (queueSession.hostId !== userId) {
    return NextResponse.json({ error: 'Only the host can update the currently playing track' }, { status: 403 });
  }

  const updated = updateCurrentlyPlaying(sessionId, currentTrack);

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update currently playing track' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
