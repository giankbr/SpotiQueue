'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { addToQueue, getCurrentlyPlaying, getPlayerState, pauseTrack, playTrack, skipToNext } from '@/lib/spotify';
import { supabaseClient } from '@/lib/supabase-client';
import { Clock, Music, Pause, Play, Plus, RefreshCw, Search, Share2, SkipForward, Users, X } from 'lucide-react';
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
  const [hostId, setHostId] = useState<string | null>(null);
  const [playbackHistory, setPlaybackHistory] = useState<string[]>([]);

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

    // Add this to your session initialization code (where you set up the initial session)
    setPlaybackHistory([]);
  }, [searchParams, session]);

  // Replace your existing polling implementation with this one:
  useEffect(() => {
    if (!sessionId) return;

    let isActive = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let consecutiveErrors = 0;
    const minInterval = 3000; // 3 seconds
    const maxInterval = 15000; // 15 seconds

    const pollSessionStatus = async () => {
      if (!isActive) return;

      try {
        const response = await fetch(`/api/session/status?sessionId=${sessionId}`, {
          // Add cache control headers to prevent caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });

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
          throw new Error(`Status error: ${response.status}`);
        }

        const data = await response.json();

        if (isActive) {
          setQueue(data.session.queue || []);
          setUsers(data.session.users || []);

          if (data.session.currentlyPlaying) {
            setCurrentlyPlaying(data.session.currentlyPlaying);
            setIsPlaying(data.session.currentlyPlaying.is_playing || false);
          }

          // Success - reset error count and use base interval
          consecutiveErrors = 0;
        }
      } catch (error) {
        console.error('Error polling session status:', error);

        if (isActive) {
          consecutiveErrors++;
        }
      }

      if (isActive) {
        // Calculate next poll time with exponential backoff
        const nextInterval = Math.min(minInterval * Math.pow(1.5, consecutiveErrors), maxInterval);

        timeoutId = setTimeout(pollSessionStatus, nextInterval);
      }
    };

    // Start polling
    pollSessionStatus();

    // Cleanup function
    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, router]);

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

  // Add this to your Dashboard component
  useEffect(() => {
    if (!sessionId) return;

    // Initial fetch to get the session data
    const fetchSessionData = async () => {
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
          throw new Error(`Status error: ${response.status}`);
        }

        const data = await response.json();
        setQueue(data.session.queue || []);
        setUsers(data.session.users || []);
        // Add this line to set the hostId
        setHostId(data.session.host_id || null);

        if (data.session.currentlyPlaying) {
          setCurrentlyPlaying(data.session.currentlyPlaying);
          setIsPlaying(data.session.currentlyPlaying.is_playing || false);
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
      }
    };

    fetchSessionData();

    // Set up realtime subscriptions
    const queueSubscription = supabaseClient
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_items',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          // When queue changes, fetch updated queue
          try {
            const { data, error } = await supabaseClient.from('queue_items').select('*').eq('session_id', sessionId).order('added_at', { ascending: true });

            if (error) throw error;

            // Update queue state
            const formattedQueue = data.map((item) => ({
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

            setQueue(formattedQueue);
          } catch (error) {
            console.error('Error updating queue:', error);
          }
        }
      )
      .subscribe();

    const usersSubscription = supabaseClient
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_users',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          // When users change, fetch updated users
          try {
            const { data, error } = await supabaseClient.from('session_users').select('*').eq('session_id', sessionId);

            if (error) throw error;

            // Update users state
            const formattedUsers = data.map((user) => ({
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              songsAdded: user.songs_added,
            }));

            setUsers(formattedUsers);
          } catch (error) {
            console.error('Error updating users:', error);
          }
        }
      )
      .subscribe();

    const sessionSubscription = supabaseClient
      .channel('session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          // When session changes (e.g. currently playing)
          try {
            const currentlyPlaying = payload.new.currently_playing;

            // Add this to update hostId if it changes
            if (payload.new.host_id) {
              setHostId(payload.new.host_id);
            }

            if (currentlyPlaying) {
              setCurrentlyPlaying(currentlyPlaying);
              setIsPlaying(currentlyPlaying.is_playing || false);
            }

            // Check if session is still active
            if (!payload.new.active) {
              toast({
                title: 'Session Ended',
                description: 'The session has ended or no longer exists.',
                variant: 'destructive',
              });
              router.push('/');
            }
          } catch (error) {
            console.error('Error updating session state:', error);
          }
        }
      )
      .subscribe();

    const queueAddedSubscription = supabaseClient
      .channel('host-queue-notify')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queue_items',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          // Only the host should respond to this
          if (isHost && session) {
            console.log('Host detected new song in queue, adding to Spotify');
            try {
              // Get the track URI from the payload
              const trackURI = payload.new.track_uri;

              // Add the track to Spotify queue
              await addToQueue(trackURI, session);

              console.log('Added track to Spotify queue successfully');
            } catch (error) {
              console.error('Error adding track to Spotify queue:', error);
            }
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabaseClient.removeChannel(queueSubscription);
      supabaseClient.removeChannel(usersSubscription);
      supabaseClient.removeChannel(sessionSubscription);
      supabaseClient.removeChannel(queueAddedSubscription);
    };
  }, [sessionId, router]);

  // Add this effect to track played songs
  useEffect(() => {
    if (currentlyPlaying?.item?.id && !playbackHistory.includes(currentlyPlaying.item.id)) {
      setPlaybackHistory((prev) => [...prev, currentlyPlaying.item.id]);
    }
  }, [currentlyPlaying?.item?.id, playbackHistory]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Use the API endpoint we just created that works for both hosts and guests
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

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

      await response.json();

      if (isHost && session) {
        const spotifyQueueRequestSubscription = supabaseClient
          .channel('spotify-queue-requests')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'spotify_queue_requests',
              filter: `session_id=eq.${sessionId} AND processed=eq.false`,
            },
            async (payload) => {
              if (!isHost || !session) return;

              try {
                console.log('Host processing Spotify queue request');
                const trackUri = payload.new.track_uri;

                await addToQueue(trackUri, session);

                // Mark as processed
                await supabaseClient
                  .from('spotify_queue_requests')
                  .update({
                    processed: true,
                    processed_at: new Date().toISOString(),
                  })
                  .eq('id', payload.new.id);

                console.log('Successfully added to Spotify queue');
              } catch (error) {
                console.error('Host failed to process queue request:', error);
              }
            }
          )
          .subscribe();

        // Add this to cleanup
        return () => {
          // Existing cleanup code...
          supabaseClient.removeChannel(spotifyQueueRequestSubscription);
        };
      }

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

  // Add this function to your Dashboard component
  const handleRemoveFromQueue = async (item: QueueItem, index: number) => {
    if (!sessionId || !userId) return;

    try {
      const response = await fetch('/api/queue/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          trackId: item.id,
          userId,
          index: index,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove track');
      }

      // Update local queue
      setQueue((prevQueue) => prevQueue.filter((_, i) => i !== index));

      toast({
        title: 'Removed from Queue',
        description: `"${item.name}" has been removed from the queue.`,
      });
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove track',
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

  // Improved function that correctly identifies played tracks
  const hasTrackBeenPlayed = (track: QueueItem) => {
    // If nothing is playing, nothing has been played
    if (!currentlyPlaying || !currentlyPlaying.item) return false;

    // Check if this is the currently playing track
    if (track.id === currentlyPlaying.item.id) return true;

    // Check if this track is in our playback history
    if (playbackHistory.includes(track.id)) return true;

    // For duplicate tracks, check if this instance was added before the current track started
    // and the same track ID exists in our playback history
    if (playbackHistory.includes(track.id) && currentlyPlaying.timestamp) {
      return track.addedAt < currentlyPlaying.timestamp;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white">
      {/* Header */}
      <header className="bg-black/50 border-b border-white/5 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500 p-2 rounded-full shadow-lg shadow-green-500/20">
              <Music className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold">SpotiQueue</h1>
            {/* {sessionCode && (
              <div className="hidden sm:flex ml-4 items-center gap-2 bg-black/30 border border-white/5 px-3 py-1 rounded-full">
                <span className="text-sm text-white font-medium">Code: {sessionCode}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-green-500/10"
                  onClick={() => {
                    navigator.clipboard.writeText(sessionCode);
                    toast({ title: 'Copied to clipboard', description: 'Session code copied!' });
                  }}
                >
                  <Share2 className="h-3 w-3 text-green-500" />
                </Button>
              </div>
            )} */}
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:block py-1 px-3 rounded-full bg-black/30 border border-white/5">
              <span className="text-sm text-white">
                {isHost ? 'Host' : 'Guest'}: {userName || session?.user?.name || 'Guest'}
              </span>
            </div>
            <Avatar className="border-2 border-white/10">
              {session?.user?.image ? <AvatarImage src={session.user.image} alt={session.user.name || ''} /> : null}
              <AvatarFallback className="bg-green-800 text-white">{(userName?.charAt(0) || session?.user?.name?.charAt(0) || 'G').toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Now Playing Section */}
        <section>
          <Card className="bg-black/30 border-white/5 mb-6 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Album art */}
                <div className="flex-shrink-0">
                  {currentlyPlaying && currentlyPlaying.item ? (
                    <img src={currentlyPlaying.item?.album.images[0]?.url} alt={currentlyPlaying.item?.album.name} className="w-32 h-32 md:w-44 md:h-44 object-cover rounded-lg shadow-lg" />
                  ) : (
                    <div className="w-32 h-32 md:w-44 md:h-44 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center">
                      <Music className="w-16 h-16 text-green-500/50" />
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-grow">
                  <h2 className="text-xl font-bold mb-1 text-green-500">Now Playing</h2>

                  {currentlyPlaying && currentlyPlaying.item ? (
                    <div className="space-y-2">
                      <h3 className="text-2xl md:text-3xl font-bold text-white">{currentlyPlaying.item?.name}</h3>
                      <p className="text-xl text-gray-300">{currentlyPlaying.item?.artists.map((a: any) => a.name).join(', ')}</p>
                      <p className="text-sm text-gray-400">From album: {currentlyPlaying.item?.album.name}</p>

                      <div className="mt-4 flex items-center gap-3">
                        {isHost && (
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="icon" className="rounded-full border-green-500 bg-black/30 hover:bg-green-500/10 h-12 w-12" onClick={handlePlayPause}>
                              {isPlaying ? <Pause className="h-6 w-6 text-green-500" /> : <Play className="h-6 w-6 text-green-500" />}
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full border-green-500 bg-black/30 hover:bg-green-500/10 h-12 w-12" onClick={handleSkip}>
                              <SkipForward className="h-6 w-6 text-green-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <h3 className="text-2xl font-bold text-white mb-2">Nothing playing yet</h3>
                      <p className="text-gray-300">{isHost ? 'Start playing music on your Spotify app to begin the session.' : 'Waiting for the host to start the music.'}</p>
                      {isHost && (
                        <Button className="mt-4 bg-green-500 hover:bg-green-600 text-black" onClick={() => window.open('https://open.spotify.com', '_blank')}>
                          Open Spotify
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Party People - Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* People section */}
            <Card className="bg-black/30 border-white/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center text-green-500">
                    <Users className="mr-2 h-4 w-4" />
                    Party People
                  </h2>
                  <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full">{users.length}</span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded-md
                        ${user.id === userId ? 'bg-green-500/20 border border-green-500' : 'bg-black/50 hover:bg-black/70 border border-white/5'}`}
                    >
                      <div className="flex items-center space-x-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-green-800 text-white rounded-full flex items-center justify-center text-sm font-medium">{user.name.charAt(0).toUpperCase()}</div>
                        )}
                        <div>
                          <div className="font-medium text-sm flex items-center text-white">
                            {user.name}
                            {user.id === hostId && <span className="ml-1 bg-green-800 text-white text-xs px-1.5 py-0.5 rounded-full">Host</span>}
                          </div>
                          <span className="text-xs text-gray-300">Added {user.songsAdded || 0} songs</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Session info card */}
            <Card className="bg-black/30 border-white/5">
              <CardContent className="p-5">
                <h2 className="text-lg font-bold mb-3 text-green-500">Session Info</h2>

                <div className="space-y-3 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Session Code:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-lg font-mono font-bold">{sessionCode}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 rounded-full hover:bg-green-500/10 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(sessionCode || '');
                          toast({ title: 'Copied', description: 'Session code copied to clipboard' });
                        }}
                      >
                        <Share2 className="h-3 w-3 text-green-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Queue length:</span>
                    <span className="font-medium">{queue.length} songs</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Your role:</span>
                    <span className={`font-medium ${isHost ? 'text-green-500' : 'text-gray-300'}`}>{isHost ? 'Host' : 'Guest'}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-medium"
                    onClick={() => {
                      const url = window.location.origin + `/join?code=${sessionCode}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: 'Copied', description: 'Invite link copied to clipboard' });
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" /> Share Invite Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main content area - Search and Queue */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Section */}
            <Card className="bg-black/30 border-white/5">
              <CardContent className="p-5">
                <h2 className="text-lg font-bold mb-4 text-green-500">Add Songs</h2>
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search for songs, artists..."
                      className="pl-10 bg-black/50 border-white/5 text-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button className="bg-green-500 hover:bg-green-600 text-black font-medium" onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Search'}
                  </Button>
                </div>

                <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((track) => (
                      <div key={track.id} className="flex items-center justify-between p-3 bg-black/50 hover:bg-black/70 border border-white/5 rounded-md">
                        <div className="flex items-center space-x-3">
                          {track.albumArt ? (
                            <img src={track.albumArt} alt={track.album} className="w-12 h-12 rounded shadow-md" />
                          ) : (
                            <div className="w-12 h-12 bg-black/70 rounded flex items-center justify-center">
                              <Music className="w-6 h-6 text-green-500/70" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{track.name}</p>
                            <p className="text-sm text-gray-400">{track.artists}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-400">{formatDuration(track.duration)}</span>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black" onClick={() => handleAddToQueue(track)}>
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

            {/* Queue Section */}
            <Card className="bg-black/30 border-white/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-green-500">Up Next in Queue</h2>

                  {/* Count only upcoming tracks */}
                  <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full">{queue.filter((item) => !hasTrackBeenPlayed(item)).length} songs</span>
                </div>

                {queue.filter((item) => !hasTrackBeenPlayed(item)).length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {queue
                      .filter((item) => !hasTrackBeenPlayed(item))
                      .map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex items-center space-x-3 p-3 bg-black/50 border border-white/5 rounded-md hover:bg-black/70">
                          <div className="flex-shrink-0 w-10 text-xs font-medium text-gray-500 text-center">{index + 1}</div>
                          <div className="flex-shrink-0">
                            {item.albumArt ? (
                              <img src={item.albumArt} alt={item.album} className="w-12 h-12 rounded shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 bg-black/70 rounded flex items-center justify-center">
                                <Music className="w-5 h-5 text-green-500/70" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0 text-white">
                            <p className="font-medium truncate">{item.name}</p>
                            <div className="flex items-center text-xs text-gray-400">
                              <p className="truncate">{item.artists}</p>
                              <span className="mx-1">•</span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(item.duration)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0 text-xs text-gray-400 bg-black/50 py-1 px-2 rounded-full">{users.find((u) => u.id === item.addedBy)?.name || 'Unknown'}</div>
                            {/* Show remove button only for host or the user who added the song */}
                            {(isHost || item.addedBy === userId) && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/20 hover:text-red-400" onClick={() => handleRemoveFromQueue(item, index)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-black/50 rounded-lg border border-white/5">
                    <Music className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                    <p className="text-lg font-medium text-white">Queue is empty</p>
                    <p className="text-sm mt-1 text-gray-400">Search and add songs to get started</p>
                  </div>
                )}

                {/* Display of played tracks (optional) */}
                {queue.filter((item) => hasTrackBeenPlayed(item)).length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-400">Recently Played</h3>
                      <div className="flex-grow ml-3 h-px bg-white/5"></div>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto opacity-60">
                      {queue
                        .filter((item) => hasTrackBeenPlayed(item))
                        .slice(0, 5) // Limit to last 5 played
                        .map((item, index) => (
                          <div key={`played-${item.id}-${index}`} className="flex items-center space-x-3 p-2 bg-black/30 rounded-md">
                            <div className="flex-shrink-0">
                              {item.albumArt ? (
                                <img src={item.albumArt} alt={item.album} className="w-9 h-9 rounded opacity-70" />
                              ) : (
                                <div className="w-9 h-9 bg-black/70 rounded flex items-center justify-center">
                                  <Music className="w-4 h-4 text-green-500/50" />
                                </div>
                              )}
                            </div>
                            <div className="flex-grow min-w-0 text-gray-400">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs truncate">{item.artists}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 mt-6 border-t border-white/5 text-center text-xs text-gray-400">
        <p>Powered by Spotify API</p>
      </footer>
    </div>
  );
}
