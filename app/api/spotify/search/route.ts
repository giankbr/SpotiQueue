import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';

// This endpoint should work for both hosts and guests
export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);

    // Get the query parameter
    const searchQuery = req.nextUrl.searchParams.get('q');

    if (!searchQuery) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // For hosts, use their Spotify token
    if (session?.accessToken) {
      // Use the host's access token
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }
    // For guests, use client credentials flow
    else {
      // Get client credentials token
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
      }

      // Get a token using client credentials flow
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Spotify access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Use the access token to search
      const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`Spotify API error: ${searchResponse.status}`);
      }

      const data = await searchResponse.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error searching tracks:', error);
    return NextResponse.json({ error: 'Failed to search tracks' }, { status: 500 });
  }
}
