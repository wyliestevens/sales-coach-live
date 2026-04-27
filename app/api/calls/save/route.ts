import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    const rows = await sql`
      INSERT INTO calls (
        user_id, started_at, duration, talk_ratio_you, talk_ratio_prospect,
        filler_words, transcript, coaching_log, sentiment_journey,
        objections, buying_signals, audio_url
      ) VALUES (
        ${user.id},
        ${body.startedAt},
        ${body.duration},
        ${body.talkRatioYou},
        ${body.talkRatioProspect},
        ${body.fillerWords},
        ${JSON.stringify(body.transcript)},
        ${JSON.stringify(body.coachingLog || [])},
        ${JSON.stringify(body.sentimentJourney)},
        ${JSON.stringify(body.objections)},
        ${JSON.stringify(body.buyingSignals)},
        ${body.audioUrl || null}
      )
      RETURNING id
    `;

    return NextResponse.json({ id: rows[0].id });
  } catch (error) {
    console.error('Save call error:', error);
    return NextResponse.json({ error: 'Failed to save call' }, { status: 500 });
  }
}
