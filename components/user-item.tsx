import { Music } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserItemProps {
  user: {
    id: number
    name: string
    songsAdded: number
    avatar: string
  }
}

export default function UserItem({ user }: UserItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md hover:bg-gray-900">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-green-500/30">
          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
          <AvatarFallback className="bg-green-900 text-green-100">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div>
          <h3 className="font-medium">{user.name}</h3>
          <p className="text-sm text-gray-400">Joined the session</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-green-500">
          <Music className="h-4 w-4" />
          <span>{user.songsAdded}</span>
        </div>
        <span className="text-xs text-gray-400">songs added</span>
      </div>
    </div>
  )
}
