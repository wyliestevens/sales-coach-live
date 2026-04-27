import { NextRequest, NextResponse } from 'next/server';
import { getCoaching } from '@/lib/claude-coach';

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const coaching = await getCoaching(transcript);
    return NextResponse.json(coaching);
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Failed to get coaching response' },
      { status: 500 }
    );
  }
}
