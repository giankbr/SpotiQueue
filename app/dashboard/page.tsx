'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { addToQueue, getCurrentlyPlaying, pauseTrack, playTrack, searchTracks, skipToNext } from '@/lib/spotify';
import { Clock, Music, Pause, Play, Plus, Search, SkipForward } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string;
  duration: number;
};

type QueueItem = Track & {
  addedBy: string;
  addedAt: Date;
};

export default function Dashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  // Get session info from URL params
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setSessionCode(code);
    }
  }, [searchParams]);

  // Poll for currently playing track
  useEffect(() => {
    if (!session) return;

    const fetchCurrentlyPlaying = async () => {
      try {
        const data = await getCurrentlyPlaying(session);
        setCurrentlyPlaying(data);
        setIsPlaying(data?.is_playing || false);
      } catch (error) {
        console.error('Error fetching currently playing:', error);
      }
    };

    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 5000);

    return () => clearInterval(interval);
  }, [session]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !session) return;

    setIsSearching(true);
    try {
      const data = await searchTracks(searchQuery, session);

      const formattedResults = data.tracks.items.map((track: any) => ({
        id: track.id,
        uri: track.uri,
        name: track.name,
        artists: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
        duration: track.duration_ms,
      }));

      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching tracks:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search for tracks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle adding to queue
  const handleAddToQueue = async (track: Track) => {
    if (!session) return;

    try {
      await addToQueue(track.uri, session);

      const queueItem: QueueItem = {
        ...track,
        addedBy: session?.user?.name || 'Unknown',
        addedAt: new Date(),
      };

      setQueue((prevQueue) => [...prevQueue, queueItem]);

      toast({
        title: 'Added to Queue',
        description: `"${track.name}" has been added to the queue.`,
      });
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast({
        title: 'Queue Error',
        description: 'Failed to add track to queue. Make sure a Spotify device is active.',
        variant: 'destructive',
      });
    }
  };

  // Playback controls
  const handlePlayPause = async () => {
    if (!session) return;

    try {
      if (isPlaying) {
        await pauseTrack(session);
        setIsPlaying(false);
      } else {
        await playTrack(session);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      toast({
        title: 'Playback Error',
        description: 'Failed to control playback. Make sure a Spotify device is active.',
        variant: 'destructive',
      });
    }
  };

  const handleSkip = async () => {
    if (!session) return;

    try {
      await skipToNext(session);
      // The currently playing track will update on the next poll
    } catch (error) {
      console.error('Error skipping track:', error);
      toast({
        title: 'Skip Error',
        description: 'Failed to skip track. Make sure a Spotify device is active.',
        variant: 'destructive',
      });
    }
  };

  // Format time (ms to min:sec)
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-green-500 p-2 rounded-full">
              <Music className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold">SpotiQueue</h1>
            {sessionCode && <div className="ml-4 bg-green-500/20 px-3 py-1 rounded-full text-sm font-mono">Code: {sessionCode}</div>}
          </div>
          <div className="flex items-center space-x-3">
            {session?.user?.image && (
              <Avatar>
                <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                <AvatarFallback>{session.user.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            )}
            <span className="text-sm font-medium">{session?.user?.name || 'Guest'}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now Playing */}
        <div className="lg:col-span-3">
          <Card className="bg-gradient-to-r from-green-900/50 to-black border-green-500/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Now Playing</h2>
              {currentlyPlaying ? (
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img src={currentlyPlaying.item?.album.images[0]?.url} alt={currentlyPlaying.item?.album.name} className="w-20 h-20 object-cover rounded-md" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold">{currentlyPlaying.item?.name}</h3>
                    <p className="text-gray-300 text-sm">{currentlyPlaying.item?.artists.map((a: any) => a.name).join(', ')}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" className="rounded-full border-green-500/50 hover:bg-green-500/20" onClick={handlePlayPause}>
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full border-green-500/50 hover:bg-green-500/20" onClick={handleSkip}>
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No track currently playing</p>
                  <p className="text-sm mt-2">Start playback on your Spotify app</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <div className="lg:col-span-2">
          <Card className="bg-black/40 border-green-500/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Search Songs</h2>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Search for songs, artists..."
                  className="bg-black/60 border-green-500/30 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button className="bg-green-500 hover:bg-green-600 text-black" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <div className="animate-spin">⏳</div> : <Search className="h-5 w-5" />}
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((track) => (
                    <div key={track.id} className="flex items-center justify-between p-3 bg-black/30 rounded-md hover:bg-green-900/20 transition-colors">
                      <div className="flex items-center space-x-3">
                        {track.albumArt ? (
                          <img src={track.albumArt} alt={track.album} className="w-12 h-12 rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center">
                            <Music className="w-6 h-6 text-green-500/70" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{track.name}</p>
                          <p className="text-sm text-gray-400">{track.artists}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">{formatDuration(track.duration)}</span>
                        <Button size="sm" variant="ghost" className="text-green-500 hover:text-green-400 hover:bg-green-500/10" onClick={() => handleAddToQueue(track)}>
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : searchQuery && !isSearching ? (
                  <div className="text-center py-10 text-gray-400">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No results found</p>
                    <p className="text-sm mt-1">Try different keywords</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Section */}
        <div className="lg:col-span-1">
          <Card className="bg-black/40 border-green-500/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Queue</h2>
              {queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center space-x-3 p-2 bg-black/30 rounded-md">
                      <div className="flex-shrink-0">
                        {item.albumArt ? (
                          <img src={item.albumArt} alt={item.album} className="w-10 h-10 rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-green-900/30 rounded flex items-center justify-center">
                            <Music className="w-5 h-5 text-green-500/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 truncate">{item.artists}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center text-xs text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(item.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Queue is empty</p>
                  <p className="text-sm mt-1">Search and add songs to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
