import { NextRequest, NextResponse } from 'next/server';
import { searchTracks } from '@/lib/spotify';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const results = await searchTracks(query, session);

    // Transform the Spotify response into a simpler format
    const tracks = results.tracks.items.map((track: any) => ({
      id: track.id,
      uri: track.uri,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      image: track.album.images[0]?.url,
      duration: track.duration_ms,
    }));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Error searching tracks:', error);
    return NextResponse.json({ error: 'Failed to search tracks' }, { status: 500 });
  }
}
