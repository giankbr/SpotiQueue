import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Music } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-900 to-black text-white p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-green-500 p-4 rounded-full">
            <Music className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-4xl font-bold">SpotiQueue</h1>
          <p className="text-lg text-gray-300">Collaborative music queue for your parties and gatherings</p>
        </div>

        <div className="space-y-4 pt-8">
          <Link href="/host">
            <Button className="w-full py-6 text-lg bg-green-500 hover:bg-green-600 text-black">Host a Session</Button>
          </Link>

          <Link href="/join">
            <Button
              variant="outline"
              className="w-full py-6 mt-2 text-lg border-green-500 text-green-500 hover:bg-green-500/10"
            >
              Join a Session
            </Button>
          </Link>
        </div>

        <div className="pt-12 text-sm text-gray-400">
          <p>Powered by Spotify API</p>
          <p>Premium account required for hosting</p>
        </div>
      </div>
    </div>
  )
}
