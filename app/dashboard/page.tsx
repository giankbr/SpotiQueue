'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { addToQueue, getCurrentlyPlaying, getPlayerState, pauseTrack, playTrack, searchTracks, skipToNext } from '@/lib/spotify';
import { Clock, Music, Pause, Play, Plus, Search, SkipForward, Users } from 'lucide-react';
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
  addedAt: number;
};

type SessionUser = {
  id: string;
  name: string;
  avatar?: string;
  songsAdded: number;
};

export default function Dashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Get session info from URL params
  useEffect(() => {
    const code = searchParams.get('code');
    const id = searchParams.get('session');
    const uid = searchParams.get('userId') || session?.user?.email || session?.user?.name || null;
    const name = searchParams.get('username') || session?.user?.name || 'Guest';

    if (code) setSessionCode(code);
    if (id) setSessionId(id);
    if (uid) setUserId(uid);
    if (name) setUserName(name);

    // Determine if current user is the host
    const hostQuery = searchParams.get('host');
    setIsHost(hostQuery === 'true' || false);
  }, [searchParams, session]);

  // Start polling for session updates if we're in a session
  // Modify your useEffect in the Dashboard component
  useEffect(() => {
    if (!sessionId || isPolling) return;

    const pollInterval = 5000; // Increased from 3000 to 5000ms
    setIsPolling(true);

    let timeoutId: NodeJS.Timeout;
    let consecutiveErrors = 0;

    const pollSessionStatus = async () => {
      try {
        const response = await fetch(`/api/session/status?sessionId=${sessionId}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: 'Session Ended',
              description: 'The session has ended or no longer exists.',
              variant: 'destructive',
            });
            router.push('/');
            return;
          }
          throw new Error(`Failed to fetch session status: ${response.status}`);
        }

        // Reset error count on success
        consecutiveErrors = 0;

        const data = await response.json();
        setQueue(data.session.queue || []);
        setUsers(data.session.users || []);

        if (data.session.currentlyPlaying) {
          setCurrentlyPlaying(data.session.currentlyPlaying);
          setIsPlaying(data.session.currentlyPlaying.is_playing || false);
        }

        // Schedule next poll
        const nextPoll = Math.min(pollInterval * Math.pow(1.5, consecutiveErrors), 30000);
        timeoutId = setTimeout(pollSessionStatus, nextPoll);
      } catch (error) {
        console.error('Error polling session status:', error);

        // Increase backoff on consecutive errors
        consecutiveErrors++;

        // Exponential backoff with maximum of 30 seconds
        const nextPoll = Math.min(pollInterval * Math.pow(1.5, consecutiveErrors), 30000);
        timeoutId = setTimeout(pollSessionStatus, nextPoll);
      }
    };

    // Initial poll
    pollSessionStatus();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      setIsPolling(false);
    };
  }, [sessionId, router, isPolling]);

  // For hosts: Poll Spotify for currently playing and update session
  useEffect(() => {
    if (!session || !isHost || !sessionId) return;

    const pollInterval = 5000; // Poll every 5 seconds

    const updateCurrentlyPlaying = async () => {
      try {
        // Get currently playing from Spotify
        const playerData = await getCurrentlyPlaying(session);

        // Update local state
        setCurrentlyPlaying(playerData);
        setIsPlaying(playerData?.is_playing || false);

        // Update the session for all users
        if (playerData) {
          await fetch('/api/session/update-playing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              currentTrack: playerData,
            }),
          });
        }
      } catch (error) {
        console.error('Error updating currently playing:', error);
      }
    };

    // Initial update
    updateCurrentlyPlaying();

    // Set up interval
    const intervalId = setInterval(updateCurrentlyPlaying, pollInterval);

    return () => clearInterval(intervalId);
  }, [session, isHost, sessionId]);

  // Check for active device on initial load for host
  useEffect(() => {
    if (!session || !isHost) return;

    const checkDevice = async () => {
      try {
        const player = await getPlayerState(session);

        if (!player || !player.device) {
          toast({
            title: 'No Active Device',
            description: 'Please open Spotify and start playing to enable queue control.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error checking device:', error);
      }
    };

    checkDevice();
  }, [session, isHost]);

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
    if (!sessionId || !userId) {
      toast({
        title: 'Session Error',
        description: 'No active session found.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If we're the host, add to Spotify queue
      if (isHost && session) {
        try {
          await addToQueue(track.uri, session);
        } catch (error) {
          console.error('Error adding to Spotify queue:', error);
          toast({
            title: 'Spotify Queue Error',
            description: 'Failed to add track to Spotify. Make sure a Spotify device is active.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Add to session queue for all users to see
      const response = await fetch('/api/queue/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId,
          track: {
            id: track.id,
            uri: track.uri,
            name: track.name,
            artists: track.artists,
            album: track.album,
            albumArt: track.albumArt,
            duration: track.duration,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add track to queue');
      }

      const data = await response.json();

      // Update local queue immediately for better UX
      const queuedTrack: QueueItem = {
        ...track,
        addedBy: userId,
        addedAt: Date.now(),
      };

      setQueue((prevQueue) => [...prevQueue, queuedTrack]);

      toast({
        title: 'Added to Queue',
        description: `"${track.name}" has been added to the queue.`,
      });
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast({
        title: 'Queue Error',
        description: 'Failed to add track to queue.',
        variant: 'destructive',
      });
    }
  };

  // Playback controls (host only)
  const handlePlayPause = async () => {
    if (!session || !isHost) return;

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
    if (!session || !isHost) return;

    try {
      await skipToNext(session);
      toast({
        title: 'Track Skipped',
        description: 'Skipped to the next track in queue.',
      });
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
            <div className="text-sm text-gray-300">
              {isHost ? 'Host' : 'Guest'}: {userName || session?.user?.name || 'Guest'}
            </div>
            {session?.user?.image ? (
              <Avatar>
                <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                <AvatarFallback>{session.user.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            ) : (
              <Avatar>
                <AvatarFallback>{userName?.charAt(0) || 'G'}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now Playing */}
        <div className="lg:col-span-3">
          <Card className="bg-gradient-to-r from-green-900/50 to-black border-green-500/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Now Playing</h2>
              {currentlyPlaying && currentlyPlaying.item ? (
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img src={currentlyPlaying.item?.album.images[0]?.url} alt={currentlyPlaying.item?.album.name} className="w-20 h-20 object-cover rounded-md" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold">{currentlyPlaying.item?.name}</h3>
                    <p className="text-gray-300 text-sm">{currentlyPlaying.item?.artists.map((a: any) => a.name).join(', ')}</p>
                  </div>
                  {isHost && (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon" className="rounded-full border-green-500/50 hover:bg-green-500/20" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <Button variant="outline" size="icon" className="rounded-full border-green-500/50 hover:bg-green-500/20" onClick={handleSkip}>
                        <SkipForward className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No track currently playing</p>
                  {isHost ? <p className="text-sm mt-2">Start playback on your Spotify app</p> : <p className="text-sm mt-2">Waiting for host to play music</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Party People */}
        <div className="lg:col-span-1">
          <Card className="bg-black/40 border-green-500/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Party People ({users.length || 0})
              </h2>
              <div className="space-y-3">
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 p-2 bg-black/30 rounded-md">
                      <Avatar className="h-8 w-8">
                        {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                        <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <p className="font-medium text-sm">
                          {user.name}
                          {user.id === (session?.user?.email || session?.user?.name) && ' (You)'}
                        </p>
                        <p className="text-xs text-gray-400">Added {user.songsAdded} songs</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <p>No one has joined yet</p>
                    <p className="text-xs mt-1">Share the code: {sessionCode}</p>
                  </div>
                )}
              </div>
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

              <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
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
        <div className="lg:col-span-3">
          <Card className="bg-black/40 border-green-500/20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Queue</h2>
              {queue && queue.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
                      <div className="flex-shrink-0 text-xs text-gray-400">Added by {users.find((u) => u.id === item.addedBy)?.name || 'Unknown'}</div>
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
