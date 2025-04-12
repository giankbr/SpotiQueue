import { ThumbsUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface QueueItemProps {
  track: {
    id: string
    title: string
    artist: string
    album: string
    duration: string
    image: string
    addedBy: string
  }
  position: number
  isCurrentlyPlaying?: boolean
}

export default function QueueItem({ track, position, isCurrentlyPlaying = false }: QueueItemProps) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md ${isCurrentlyPlaying ? "bg-green-500/10 border border-green-500/30" : "hover:bg-gray-900"}`}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 border border-green-500/30 text-sm font-medium">
        {position}
      </div>

      <img src={track.image || "/placeholder.svg"} alt={track.title} className="w-12 h-12 rounded" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{track.title}</h3>
          {isCurrentlyPlaying && (
            <Badge variant="outline" className="border-green-500 bg-green-500/10 text-green-500 text-xs">
              Now Playing
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-400 truncate">
          {track.artist} • {track.album}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-500">Added by</span>
          <span className="text-xs text-green-500">{track.addedBy}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">{track.duration}</span>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-green-500/10 text-green-500">
          <ThumbsUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
