import { NextRequest, NextResponse } from 'next/server';
import { getPlayerState, playTrack, pauseTrack, skipToNext } from '@/lib/spotify';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const playerState = await getPlayerState(session);

    return NextResponse.json({ player: playerState });
  } catch (error) {
    console.error('Error getting player state:', error);
    return NextResponse.json({ error: 'Failed to get player state' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { action } = await req.json();

    switch (action) {
      case 'play':
        await playTrack(session);
        break;
      case 'pause':
        await pauseTrack(session);
        break;
      case 'skip':
        await skipToNext(session);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error controlling playback:', error);
    return NextResponse.json({ error: 'Failed to control playback' }, { status: 500 });
  }
}
