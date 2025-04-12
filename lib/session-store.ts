import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export type SessionUser = {
  id: string;
  name: string;
  avatar?: string;
  songsAdded: number;
};

export type QueuedTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string;
  duration: number;
  addedBy: string;
  addedAt: number;
};

export type Session = {
  id: string;
  code: string;
  name: string;
  hostId: string;
  active: boolean;
  createdAt: number;
  users: SessionUser[];
  queue: QueuedTrack[];
  currentlyPlaying?: any;
};

export function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createSession(name: string, hostId: string, hostName: string, hostAvatar?: string): Promise<Session> {
  const sessionId = Date.now().toString();
  const code = generateSessionCode();

  // Create session in database
  const { error: sessionError } = await supabase.from('sessions').insert({
    id: sessionId,
    code: code,
    name: name,
    host_id: hostId,
    active: true,
  });

  if (sessionError) throw sessionError;

  // Create host user in database
  const { error: userError } = await supabase.from('session_users').insert({
    id: hostId,
    session_id: sessionId,
    name: hostName,
    avatar: hostAvatar,
  });

  if (userError) throw userError;

  // Return session object
  return {
    id: sessionId,
    code,
    name,
    hostId,
    active: true,
    createdAt: Date.now(),
    users: [
      {
        id: hostId,
        name: hostName,
        avatar: hostAvatar,
        songsAdded: 0,
      },
    ],
    queue: [],
  };
}

export async function getSessionByCode(code: string): Promise<Session | undefined> {
  if (!code) return undefined;

  // Query the session
  const { data: sessionData, error: sessionError } = await supabase.from('sessions').select('*').eq('code', code.toUpperCase()).eq('active', true).single();

  if (sessionError || !sessionData) return undefined;

  // Get users for this session
  const { data: usersData, error: usersError } = await supabase.from('session_users').select('*').eq('session_id', sessionData.id);

  if (usersError) throw usersError;

  // Get queue items for this session
  const { data: queueData, error: queueError } = await supabase.from('queue_items').select('*').eq('session_id', sessionData.id).order('added_at', { ascending: true });

  if (queueError) throw queueError;

  // Format users for our Session type
  const users: SessionUser[] = (usersData || []).map((user) => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    songsAdded: user.songs_added,
  }));

  // Format queue items for our Session type
  const queue: QueuedTrack[] = (queueData || []).map((item) => ({
    id: item.track_id,
    uri: item.track_uri,
    name: item.track_name,
    artists: item.artists,
    album: item.album,
    albumArt: item.album_art,
    duration: item.duration,
    addedBy: item.added_by,
    addedAt: new Date(item.added_at).getTime(),
  }));

  // Construct and return the session
  return {
    id: sessionData.id,
    code: sessionData.code,
    name: sessionData.name,
    hostId: sessionData.host_id,
    active: sessionData.active,
    createdAt: new Date(sessionData.created_at).getTime(),
    users,
    queue,
    currentlyPlaying: sessionData.currently_playing,
  };
}

export async function getSessionById(id: string): Promise<Session | undefined> {
  if (!id) return undefined;

  // Query the session
  const { data: sessionData, error: sessionError } = await supabase.from('sessions').select('*').eq('id', id).eq('active', true).single();

  if (sessionError || !sessionData) return undefined;

  // Get users for this session
  const { data: usersData, error: usersError } = await supabase.from('session_users').select('*').eq('session_id', id);

  if (usersError) throw usersError;

  // Get queue items for this session
  const { data: queueData, error: queueError } = await supabase.from('queue_items').select('*').eq('session_id', id).order('added_at', { ascending: true });

  if (queueError) throw queueError;

  // Format users for our Session type
  const users: SessionUser[] = (usersData || []).map((user) => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    songsAdded: user.songs_added,
  }));

  // Format queue items for our Session type
  const queue: QueuedTrack[] = (queueData || []).map((item) => ({
    id: item.track_id,
    uri: item.track_uri,
    name: item.track_name,
    artists: item.artists,
    album: item.album,
    albumArt: item.album_art,
    duration: item.duration,
    addedBy: item.added_by,
    addedAt: new Date(item.added_at).getTime(),
  }));

  // Construct and return the session
  return {
    id: sessionData.id,
    code: sessionData.code,
    name: sessionData.name,
    hostId: sessionData.host_id,
    active: sessionData.active,
    createdAt: new Date(sessionData.created_at).getTime(),
    users,
    queue,
    currentlyPlaying: sessionData.currently_playing,
  };
}

export async function addUserToSession(sessionId: string, userId: string, userName: string, avatar?: string): Promise<SessionUser | null> {
  // Add user to the database
  const { data, error } = await supabase
    .from('session_users')
    .insert({
      id: userId,
      session_id: sessionId,
      name: userName,
      avatar: avatar,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding user to session:', error);
    return null;
  }

  // Return the user as SessionUser type
  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar,
    songsAdded: data.songs_added,
  };
}

export async function addTrackToQueue(
  sessionId: string,
  track: {
    id: string;
    uri: string;
    name: string;
    artists: string;
    album: string;
    albumArt: string;
    duration: number;
  },
  userId: string
): Promise<QueuedTrack | null> {
  // Insert track into queue
  const { data, error } = await supabase
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

  if (error) {
    console.error('Error adding track to queue:', error);
    return null;
  }

  // Increment songs_added for the user
  const { error: updateError } = await supabase
    .from('session_users')
    .update({ songs_added: supabase.rpc('increment', { inc: 1 }) })
    .eq('id', userId)
    .eq('session_id', sessionId);

  if (updateError) {
    console.error('Error updating user song count:', updateError);
  }

  // Return the queued track
  return {
    id: data.track_id,
    uri: data.track_uri,
    name: data.track_name,
    artists: data.artists,
    album: data.album,
    albumArt: data.album_art,
    duration: data.duration,
    addedBy: data.added_by,
    addedAt: new Date(data.added_at).getTime(),
  };
}

export async function updateCurrentlyPlaying(sessionId: string, currentTrack: any): Promise<boolean> {
  const { error } = await supabase.from('sessions').update({ currently_playing: currentTrack }).eq('id', sessionId);

  if (error) {
    console.error('Error updating currently playing:', error);
    return false;
  }

  return true;
}

export async function endSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase.from('sessions').update({ active: false }).eq('id', sessionId);

  if (error) {
    console.error('Error ending session:', error);
    return false;
  }

  return true;
}
