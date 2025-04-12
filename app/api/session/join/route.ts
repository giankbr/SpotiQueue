import { NextRequest, NextResponse } from 'next/server';
import { getSessionByCode, addUserToSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { code, username } = await req.json();

    if (!code || !username) {
      return NextResponse.json({ error: 'Session code and username are required' }, { status: 400 });
    }

    const session = getSessionByCode(code);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate a simple user ID for non-authenticated users
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const user = addUserToSession(session.id, userId, username);

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
      },
      user,
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }
}
