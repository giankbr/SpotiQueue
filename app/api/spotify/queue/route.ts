import { NextRequest, NextResponse } from 'next/server';
import { addToQueue } from '@/lib/spotify';
import { getSessionById, addTrackToQueue } from '@/lib/session';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const { trackId, trackUri, title, artist, album, image, duration, sessionId, userId } = await req.json();

    if (!trackUri || !sessionId || !userId) {
      return NextResponse.json({ error: 'Track URI, session ID, and user ID are required' }, { status: 400 });
    }

    // Check if the session exists
    const queueSession = getSessionById(sessionId);
    if (!queueSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Add to Spotify queue if we're the host
    if (session && queueSession.hostId === session.user?.email) {
      await addToQueue(trackUri, session);
    }

    // Add to our internal queue for all users to see
    const queuedTrack = addTrackToQueue(
      sessionId,
      {
        id: trackId,
        uri: trackUri,
        title,
        artist,
        album,
        image,
        duration,
      },
      userId
    );

    return NextResponse.json({ success: true, track: queuedTrack });
  } catch (error) {
    console.error('Error adding to queue:', error);
    return NextResponse.json({ error: 'Failed to add track to queue' }, { status: 500 });
  }
}
