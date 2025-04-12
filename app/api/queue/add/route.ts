import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addToQueue } from '@/lib/spotify';
import { supabaseClient } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, track } = await req.json();

    if (!sessionId || !userId || !track) {
      return NextResponse.json({ error: 'Session ID, user ID, and track are required' }, { status: 400 });
    }

    // Verify the session exists
    const { data: session, error: sessionError } = await supabaseClient.from('sessions').select('*, host_id').eq('id', sessionId).eq('active', true).single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get the host user from the database
    const { data: hostUser, error: hostError } = await supabaseClient.from('session_users').select('*').eq('id', session.host_id).eq('session_id', sessionId).single();

    if (hostError) {
      console.error('Error getting host user:', hostError);
      // Continue anyway, we can still add to queue
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
        songs_added: 0, // Initialize with 0 songs
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

    // Update the user's song count by incrementing it
    let currentSongCount = userData?.songs_added || 0;

    const { error: updateError } = await supabaseClient
      .from('session_users')
      .update({ songs_added: currentSongCount + 1 })
      .eq('id', userId)
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('Error updating user song count:', updateError);
      // Continue as we still added the song to the queue
    }

    // Add track to Spotify queue through the host's session
    // Get the host's session from server-side OAuth
    const hostSession = await getServerSession(authOptions);

    // Add to Spotify queue if we have host's session
    let spotifyQueueSuccess = false;
    if (hostSession) {
      try {
        await addToQueue(track.uri, hostSession);
        spotifyQueueSuccess = true;
      } catch (spotifyError) {
        console.error('Error adding to Spotify queue:', spotifyError);
        // Continue as we've already added to the app queue
      }
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
      updatedSongCount: currentSongCount + 1,
      addedToSpotify: spotifyQueueSuccess,
    });
  } catch (error) {
    console.error('Error adding track to queue:', error);
    return NextResponse.json({ error: 'Failed to add track to queue' }, { status: 500 });
  }
}
