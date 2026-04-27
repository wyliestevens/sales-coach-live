import StartCallButton from '@/components/StartCallButton';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
          Sales Coach <span className="text-red-500">Live</span>
        </h1>
        <p className="text-gray-500 text-lg md:text-xl max-w-md mx-auto">
          Real-time AI coaching from the world&apos;s greatest closers.
        </p>
        <StartCallButton />
        <div className="flex items-center gap-6 justify-center pt-4">
          <Link href="/history" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Call History
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Sign In
          </Link>
        </div>
        <div className="flex items-center gap-6 justify-center text-xs text-gray-700 pt-4">
          <span>Powered by Claude AI</span>
          <span>&bull;</span>
          <span>Gladia Transcription</span>
          <span>&bull;</span>
          <span>Sub-300ms Latency</span>
        </div>
      </div>
    </main>
  );
}
