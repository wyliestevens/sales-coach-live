'use client';

interface TalkRatioMeterProps {
  youPercent: number;
  prospectPercent: number;
  wordsPerMinute: number;
  fillerWords: number;
}

export default function TalkRatioMeter({ youPercent, prospectPercent, wordsPerMinute, fillerWords }: TalkRatioMeterProps) {
  const youWidth = Math.max(youPercent, 2);
  const prospectWidth = Math.max(prospectPercent, 2);
  const talkingTooMuch = youPercent > 60;

  return (
    <div className="w-full px-6 py-4 bg-gray-900/80 border-y border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Talk Ratio</span>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>{wordsPerMinute} <span className="text-gray-600">wpm</span></span>
          <span className={fillerWords > 5 ? 'text-yellow-400' : ''}>{fillerWords} <span className="text-gray-600">fillers</span></span>
        </div>
      </div>

      <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden flex">
        <div
          className={`h-full transition-all duration-500 ${talkingTooMuch ? 'bg-red-500/80' : 'bg-blue-500/80'}`}
          style={{ width: `${youWidth}%` }}
        />
        <div
          className="h-full bg-emerald-500/80 transition-all duration-500"
          style={{ width: `${prospectWidth}%` }}
        />
        {/* Target line at 40% */}
        <div className="absolute left-[40%] top-0 bottom-0 w-0.5 bg-white/40" />
      </div>

      <div className="flex justify-between mt-1.5 text-xs">
        <span className={`font-medium ${talkingTooMuch ? 'text-red-400' : 'text-blue-400'}`}>
          You {youPercent}%
        </span>
        <span className="text-gray-600 text-[10px]">40% target</span>
        <span className="text-emerald-400 font-medium">
          Prospect {prospectPercent}%
        </span>
      </div>
    </div>
  );
}
