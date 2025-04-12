import { supabaseClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, trackId, userId, queueItemId } = await req.json();

    if (!sessionId || !trackId || !userId) {
      return NextResponse.json({ error: 'Session ID, track ID, and user ID are required' }, { status: 400 });
    }

    // Get session info including host
    const { data: session, error: sessionError } = await supabaseClient.from('sessions').select('host_id').eq('id', sessionId).eq('active', true).single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check who added this song (to update their song count later)
    const { data: queueItem, error: queueItemError } = await supabaseClient.from('queue_items').select('added_by').eq('id', queueItemId).single();

    if (queueItemError) {
      console.error('Error finding queue item:', queueItemError);
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    // Check authorization - only host or the person who added it can remove
    const isHost = userId === session.host_id;
    if (!isHost && queueItem.added_by !== userId) {
      return NextResponse.json({ error: 'Not authorized to remove this track' }, { status: 403 });
    }

    // Remove the track from our DB queue
    const { error: removeError } = await supabaseClient.from('queue_items').delete().eq('id', queueItemId);

    if (removeError) {
      console.error('Error removing track:', removeError);
      return NextResponse.json({ error: 'Failed to remove track from queue' }, { status: 500 });
    }

    // Decrement the song count for the user who added it
    if (queueItem.added_by) {
      const { data: userData, error: userError } = await supabaseClient.from('session_users').select('songs_added').eq('id', queueItem.added_by).eq('session_id', sessionId).single();

      if (!userError && userData) {
        // Only decrease if greater than 0
        const newCount = Math.max(0, (userData.songs_added || 1) - 1);

        await supabaseClient.from('session_users').update({ songs_added: newCount }).eq('id', queueItem.added_by).eq('session_id', sessionId);
      }
    }

    // NOTE: Spotify doesn't have an API to remove items from the queue directly
    // We'll add a message to inform the user about this limitation
    return NextResponse.json({
      success: true,
      spotifyNote: "Song removed from app queue. Note that Spotify doesn't allow removing songs from queue via API, so it may still play in Spotify.",
    });
  } catch (error) {
    console.error('Error removing track:', error);
    return NextResponse.json({ error: 'Failed to remove track from queue' }, { status: 500 });
  }
}
