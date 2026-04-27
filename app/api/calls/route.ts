import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sql = getDb();
  const calls = await sql`
    SELECT id, started_at, duration, talk_ratio_you, talk_ratio_prospect,
           filler_words, sentiment_journey, objections, buying_signals, audio_url,
           created_at
    FROM calls
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return NextResponse.json({ calls });
}
