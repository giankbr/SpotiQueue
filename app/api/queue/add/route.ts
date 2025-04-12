import { supabaseClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, track } = await req.json();

    if (!sessionId || !userId || !track) {
      return NextResponse.json({ error: 'Session ID, user ID, and track are required' }, { status: 400 });
    }

    // Verify the session exists
    const { data: session, error: sessionError } = await supabaseClient.from('sessions').select('*').eq('id', sessionId).eq('active', true).single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if the user exists in the session
    const { data: userData, error: userError } = await supabaseClient.from('session_users').select('*').eq('id', userId).eq('session_id', sessionId).single();

    // If user doesn't exist, create them (for guests who may not have been added yet)
    if (userError) {
      // Extract name from track metadata if not provided
      const userName = 'Guest';

      await supabaseClient.from('session_users').insert({
        id: userId,
        session_id: sessionId,
        name: userName,
      });
    }

    // Add track to queue
    const { data: queueData, error: queueError } = await supabaseClient
      .from('queue_items')
      .insert({
        session_id: sessionId,
        track_id: track.id,
        track_uri: track.uri,
        track_name: track.name,
        artists: track.artists,
        album: track.album,
        album_art: track.albumArt,
        duration: track.duration,
        added_by: userId,
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error adding track to queue:', queueError);
      return NextResponse.json({ error: 'Failed to add track to queue' }, { status: 500 });
    }

    // Increment songs_added for the user
    await supabaseClient
      .from('session_users')
      .update({ songs_added: supabaseClient.rpc('increment', { inc: 1 }) })
      .eq('id', userId)
      .eq('session_id', sessionId);

    return NextResponse.json({
      success: true,
      track: {
        id: queueData.track_id,
        uri: queueData.track_uri,
        name: queueData.track_name,
        artists: queueData.artists,
        album: queueData.album,
        albumArt: queueData.album_art,
        duration: queueData.duration,
        addedBy: queueData.added_by,
        addedAt: new Date(queueData.added_at).getTime(),
      },
    });
  } catch (error) {
    console.error('Error adding track to queue:', error);
    return NextResponse.json({ error: 'Failed to add track to queue' }, { status: 500 });
  }
}
