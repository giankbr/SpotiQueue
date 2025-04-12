"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SearchResultProps {
  track: {
    id: string
    title: string
    artist: string
    album: string
    duration: string
    image: string
  }
  onAddToQueue: () => void
}

export default function SearchResult({ track, onAddToQueue }: SearchResultProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-900">
      <img src={track.image || "/placeholder.svg"} alt={track.title} className="w-12 h-12 rounded" />

      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{track.title}</h3>
        <p className="text-sm text-gray-400 truncate">
          {track.artist} • {track.album}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">{track.duration}</span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-green-500/10 text-green-500"
          onClick={onAddToQueue}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
