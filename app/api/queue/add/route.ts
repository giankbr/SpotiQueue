import { supabaseClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, track } = await req.json();

    if (!sessionId || !userId || !track) {
      return NextResponse.json({ error: 'Session ID, user ID, and track are required' }, { status: 400 });
    }

    // Verify the session exists and get host info
    const { data: sessionData, error: sessionError } = await supabaseClient.from('sessions').select('*, host_id').eq('id', sessionId).eq('active', true).single();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if the user exists in the session
    const { data: userData, error: userError } = await supabaseClient.from('session_users').select('*').eq('id', userId).eq('session_id', sessionId).single();

    // If user doesn't exist, create them with default values
    if (userError) {
      const userName = 'Guest';

      await supabaseClient.from('session_users').insert({
        id: userId,
        session_id: sessionId,
        name: userName,
        songs_added: 0,
      });
    }

    // Add track to queue in database
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

    // Update the user's song count
    let currentSongCount = userData?.songs_added || 0;

    await supabaseClient
      .from('session_users')
      .update({ songs_added: currentSongCount + 1 })
      .eq('id', userId)
      .eq('session_id', sessionId);

    // Create a Spotify queue request record that will be picked up by the host
    const { error: requestError } = await supabaseClient.from('spotify_queue_requests').insert({
      session_id: sessionId,
      track_uri: track.uri,
      track_name: track.name,
      requested_at: new Date().toISOString(),
    });

    if (requestError) {
      console.error('Error creating Spotify queue request:', requestError);
      // We continue anyway as the track is in our app queue
    }

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
