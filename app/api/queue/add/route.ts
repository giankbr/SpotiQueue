import { addTrackToQueue, getSessionById } from '@/lib/session-store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, track } = await req.json();

    if (!sessionId || !userId || !track) {
      return NextResponse.json({ error: 'Session ID, user ID, and track are required' }, { status: 400 });
    }

    const session = await getSessionById(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const queuedTrack = await addTrackToQueue(
      sessionId,
      {
        id: track.id,
        uri: track.uri,
        name: track.name,
        artists: track.artists,
        album: track.album,
        albumArt: track.albumArt,
        duration: track.duration,
      },
      userId
    );

    if (!queuedTrack) {
      return NextResponse.json({ error: 'Failed to add track to queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, track: queuedTrack });
  } catch (error) {
    console.error('Error adding track to queue:', error);
    return NextResponse.json({ error: 'Failed to add track to queue' }, { status: 500 });
  }
}
