import { addUserToSession, getSessionByCode } from '@/lib/session-store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code, username } = await req.json();

    if (!code || !username) {
      return NextResponse.json({ error: 'Session code and username are required' }, { status: 400 });
    }

    const session = await getSessionByCode(code);

    if (!session) {
      return NextResponse.json({ error: 'Session not found. Check the code and try again.' }, { status: 404 });
    }

    // Generate a simple user ID for guests
    const userId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Add user to session
    const newUser = await addUserToSession(session.id, userId, username);

    if (!newUser) {
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
      },
      user: newUser,
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }
}
