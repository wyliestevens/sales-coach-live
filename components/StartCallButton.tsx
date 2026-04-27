'use client';

import { useRouter } from 'next/navigation';

export default function StartCallButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/call')}
      className="group relative px-12 py-5 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-red-900/50 hover:shadow-red-800/60"
    >
      <span className="flex items-center gap-3">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        START CALL
      </span>
    </button>
  );
}
