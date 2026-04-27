import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.GLADIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gladia API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.gladia.io/v2/live', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gladia-key': apiKey,
      },
      body: JSON.stringify({
        encoding: 'wav/pcm',
        sample_rate: 16000,
        bit_depth: 16,
        channels: 1,
        language_config: {
          languages: ['en'],
        },
      }),
    });

    if (!response.ok) {
      let detail = 'Failed to create Gladia session';
      try {
        const errorData = await response.json();
        detail = errorData.message || detail;
      } catch {
        detail = await response.text().catch(() => detail);
      }
      console.error('Gladia session error:', detail);
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('Gladia session error:', error);
    return NextResponse.json({ error: 'Failed to create Gladia session' }, { status: 500 });
  }
}
