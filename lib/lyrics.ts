export async function fetchLyrics(trackName: string, artistName: string): Promise<string> {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch lyrics');
    }

    const data = await response.json();

    return data.lyrics || 'Lyrics not found';
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return "Couldn't load lyrics";
  }
}
