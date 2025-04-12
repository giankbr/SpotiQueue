import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Main Card */}
        <div className="w-full max-w-md bg-black/30 border border-white/5 rounded-2xl p-8 shadow-xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-500 p-4 rounded-full shadow-lg shadow-green-500/20">
              <Music className="w-12 h-12 text-black" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">SpotiQueue</h1>
            <p className="text-lg text-gray-300">Collaborative music queue for your parties and gatherings</p>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <Link href="/host" className="block">
              <Button className="w-full py-6 text-lg bg-green-500 hover:bg-green-600 text-black font-medium">Host a Session</Button>
            </Link>

            <Link href="/join" className="block">
              <Button variant="outline" className="w-full py-6 text-lg border-green-500 text-green-500 hover:bg-green-500/10">
                Join a Session
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-400">Powered by Spotify API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
