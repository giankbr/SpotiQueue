import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
    }

    const userId = session.user?.email || 'unknown';
    const newSession = createSession(name, userId);

    return NextResponse.json({ session: newSession });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
