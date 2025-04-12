import { createSession } from '@/lib/session-store';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
    }

    const userId = session.user.email || session.user.name || 'unknown';
    const userName = session.user.name || 'Host';
    const avatar = session.user.image;

    const newSession = await createSession(name, userId, userName, avatar);

    return NextResponse.json({
      session: {
        id: newSession.id,
        code: newSession.code,
        name: newSession.name,
      },
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
