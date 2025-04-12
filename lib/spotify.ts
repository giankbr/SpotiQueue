import { Session } from 'next-auth';

const BASE_URL = 'https://api.spotify.com/v1';

export async function getAccessToken(session: Session | null) {
  if (!session || !session.accessToken) {
    throw new Error('No Spotify access token available');
  }
  return session.accessToken as string;
}

export async function searchTracks(query: string, session: Session | null) {
  if (!query) return { tracks: { items: [] } };

  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

export async function addToQueue(trackUri: string, session: Session | null) {
  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to add to queue: ${response.status}`);
  }

  return true;
}

export async function getCurrentlyPlaying(session: Session | null) {
  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/me/player/currently-playing`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 204) {
    return null; // No track playing
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

export async function getPlayerState(session: Session | null) {
  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/me/player`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 204) {
    return null; // No active device
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

export async function playTrack(session: Session | null) {
  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/me/player/play`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to play track: ${response.status}`);
  }

  return true;
}

export async function pauseTrack(session: Session | null) {
  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/me/player/pause`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to pause track: ${response.status}`);
  }

  return true;
}

export async function skipToNext(session: Session | null) {
  const accessToken = await getAccessToken(session);

  const response = await fetch(`${BASE_URL}/me/player/next`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to skip track: ${response.status}`);
  }

  return true;
}
