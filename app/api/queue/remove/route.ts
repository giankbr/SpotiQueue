import { supabaseClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, trackId, userId, index } = await req.json();

    if (!sessionId || !trackId || !userId) {
      return NextResponse.json({ error: 'Session ID, track ID, and user ID are required' }, { status: 400 });
    }

    // Verify the session exists
    const { data: session, error: sessionError } = await supabaseClient.from('sessions').select('host_id').eq('id', sessionId).eq('active', true).single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only host or the user who added the song can remove it
    if (userId !== session.host_id) {
      const { data: queueItem, error: queueError } = await supabaseClient.from('queue_items').select('added_by').eq('session_id', sessionId).eq('track_id', trackId).eq('id', index).single();

      if (queueError || !queueItem || queueItem.added_by !== userId) {
        return NextResponse.json({ error: 'You can only remove songs you added' }, { status: 403 });
      }
    }

    // Remove the track
    const { error: removeError } = await supabaseClient.from('queue_items').delete().eq('session_id', sessionId).eq('track_id', trackId).eq('id', index);

    if (removeError) {
      console.error('Error removing track from queue:', removeError);
      return NextResponse.json({ error: 'Failed to remove track from queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing track from queue:', error);
    return NextResponse.json({ error: 'Failed to remove track from queue' }, { status: 500 });
  }
}
