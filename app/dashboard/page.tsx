"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Music, ListMusic, Users, SkipForward, Pause, Play, Volume2, VolumeX } from "lucide-react"
import QueueItem from "@/components/queue-item"
import SearchResult from "@/components/search-result"
import UserItem from "@/components/user-item"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

// Mock data
const mockUsers = [
  { id: 1, name: "Alex", songsAdded: 5, avatar: "/placeholder.svg?height=40&width=40" },
  { id: 2, name: "Taylor", songsAdded: 3, avatar: "/placeholder.svg?height=40&width=40" },
  { id: 3, name: "Jordan", songsAdded: 2, avatar: "/placeholder.svg?height=40&width=40" },
  { id: 4, name: "Casey", songsAdded: 1, avatar: "/placeholder.svg?height=40&width=40" },
]

const mockQueue = [
  {
    id: "1",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    duration: "5:55",
    image: "/placeholder.svg?height=60&width=60",
    addedBy: "Alex",
  },
  {
    id: "2",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: "3:20",
    image: "/placeholder.svg?height=60&width=60",
    addedBy: "Taylor",
  },
  {
    id: "3",
    title: "Dance Monkey",
    artist: "Tones and I",
    album: "The Kids Are Coming",
    duration: "3:29",
    image: "/placeholder.svg?height=60&width=60",
    addedBy: "Jordan",
  },
]

const mockSearchResults = [
  {
    id: "101",
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    duration: "3:53",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "102",
    title: "Bad Guy",
    artist: "Billie Eilish",
    album: "When We All Fall Asleep, Where Do We Go?",
    duration: "3:14",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "103",
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    album: "Uptown Special",
    duration: "4:30",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "104",
    title: "Someone Like You",
    artist: "Adele",
    album: "21",
    duration: "4:45",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: "105",
    title: "Despacito",
    artist: "Luis Fonsi ft. Daddy Yankee",
    album: "Vida",
    duration: "3:47",
    image: "/placeholder.svg?height=60&width=60",
  },
]

export default function Dashboard() {
  const searchParams = useSearchParams()
  const sessionName = searchParams.get("session") || "My Session"
  const username = searchParams.get("username") || "Host"

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState(mockSearchResults)
  const [queue, setQueue] = useState(mockQueue)
  const [users, setUsers] = useState(mockUsers)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(35)
  const [currentTime, setCurrentTime] = useState("1:58")
  const [totalTime, setTotalTime] = useState("5:55")

  // Simulate search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults(mockSearchResults)
      return
    }

    const filtered = mockSearchResults.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artist.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    setSearchResults(filtered)
  }, [searchQuery])

  // Simulate progress
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 0
        }
        return prev + 1
      })

      // Update current time based on progress
      const totalSeconds = convertTimeToSeconds(totalTime)
      const currentSeconds = Math.floor(totalSeconds * (progress / 100))
      setCurrentTime(convertSecondsToTime(currentSeconds))
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, totalTime])

  const handleAddToQueue = (track) => {
    const newQueueItem = {
      ...track,
      addedBy: username,
    }

    setQueue((prev) => [...prev, newQueueItem])
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const skipTrack = () => {
    if (queue.length > 0) {
      const newQueue = [...queue]
      newQueue.shift()
      setQueue(newQueue)
      setProgress(0)
    }
  }

  // Helper functions
  const convertTimeToSeconds = (timeString) => {
    const [minutes, seconds] = timeString.split(":").map(Number)
    return minutes * 60 + seconds
  }

  const convertSecondsToTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-green-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-full">
              <Music className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-xl">{sessionName}</h1>
              <p className="text-xs text-gray-400">
                Session Code: <span className="text-green-500 font-mono">ABC123</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-500 text-green-500">
              {username}
            </Badge>
            <Avatar className="h-8 w-8 border border-green-500/30">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt={username} />
              <AvatarFallback className="bg-green-900 text-green-100">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black border border-green-500/20">
            <TabsTrigger value="search" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="queue" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
              <ListMusic className="w-4 h-4 mr-2" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="pt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search for songs, artists, or albums"
                  className="pl-10 bg-black/60 border-green-500/30 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <SearchResult key={result.id} track={result} onAddToQueue={() => handleAddToQueue(result)} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">No results found. Try a different search term.</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue" className="pt-4">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-green-500" />
                Current Queue
              </h2>

              {queue.length > 0 ? (
                <div className="space-y-2">
                  {queue.map((item, index) => (
                    <QueueItem key={item.id} track={item} position={index + 1} isCurrentlyPlaying={index === 0} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  The queue is empty. Add some songs from the search tab!
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="pt-4">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Connected Users
              </h2>

              <div className="space-y-2">
                {users.map((user) => (
                  <UserItem key={user.id} user={user} />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Now Playing Bar */}
      <footer className="sticky bottom-0 z-10 bg-black/80 backdrop-blur-sm border-t border-green-500/20 p-4">
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{currentTime}</span>
            <span>{totalTime}</span>
          </div>
          <Progress value={progress} className="h-1 bg-gray-800 [&>div]:bg-green-500" />

          {/* Track info and controls */}
          <div className="flex items-center gap-3">
            {/* Album art and track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={queue[0]?.image || "/placeholder.svg?height=48&width=48"}
                alt="Album art"
                className="w-12 h-12 rounded"
              />
              <div className="min-w-0">
                <h3 className="font-medium truncate">{queue[0]?.title || "No track playing"}</h3>
                <p className="text-sm text-gray-400 truncate">{queue[0]?.artist || "Add songs to the queue"}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-green-500/10 text-green-500"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-green-500/10 text-green-500"
                onClick={skipTrack}
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-green-500/10 text-green-500"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
