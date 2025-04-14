import { fetchLyrics } from '@/lib/lyrics';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const trackName = url.searchParams.get('track');
    const artistName = url.searchParams.get('artist');

    if (!trackName || !artistName) {
      return NextResponse.json({ error: 'Track name and artist name are required' }, { status: 400 });
    }

    const lyrics = await fetchLyrics(trackName, artistName);

    return NextResponse.json({ lyrics });
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}
