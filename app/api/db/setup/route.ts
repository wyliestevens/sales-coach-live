import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';
import { seedDefaultUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-setup-secret');
  if (secret !== process.env.SETUP_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    await seedDefaultUser();
    return NextResponse.json({ success: true, message: 'Database initialized and default user created' });
  } catch (error) {
    console.error('DB setup error:', error);
    return NextResponse.json({ error: `Setup failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
