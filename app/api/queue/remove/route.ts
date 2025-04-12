import { supabaseClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, trackId, userId, queueItemId } = await req.json();

    if (!sessionId || !trackId || !userId) {
      return NextResponse.json({ error: 'Session ID, track ID, and user ID are required' }, { status: 400 });
    }

    // Verify the session exists
    const { data: session, error: sessionError } = await supabaseClient.from('sessions').select('host_id').eq('id', sessionId).eq('active', true).single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user is authorized to remove track (host or the person who added it)
    const isHost = userId === session.host_id;
    if (!isHost) {
      // Find the specific queue item
      const { data: queueItem, error: queueItemError } = await supabaseClient.from('queue_items').select('added_by').eq('session_id', sessionId).eq('track_id', trackId).eq('id', queueItemId).single();

      if (queueItemError || !queueItem || queueItem.added_by !== userId) {
        return NextResponse.json({ error: 'Not authorized to remove this track' }, { status: 403 });
      }
    }

    // Delete the queue item - use the specific ID if provided
    let query = supabaseClient.from('queue_items').delete().eq('session_id', sessionId);

    if (queueItemId) {
      // If we have the specific queue item ID, use it for precise deletion
      query = query.eq('id', queueItemId);
    } else {
      // Otherwise use track ID (be careful with duplicates)
      query = query.eq('track_id', trackId);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error('Error removing track:', deleteError);
      return NextResponse.json({ error: 'Failed to remove track from queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing track:', error);
    return NextResponse.json({ error: 'Failed to remove track from queue' }, { status: 500 });
  }
}
