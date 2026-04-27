import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const sql = getDb();

  // Only allow updating prospect_name and notes
  const { prospectName, notes } = body;

  await sql`
    UPDATE calls
    SET prospect_name = COALESCE(${prospectName ?? null}, prospect_name),
        notes = COALESCE(${notes ?? null}, notes)
    WHERE id = ${parseInt(id)} AND user_id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
