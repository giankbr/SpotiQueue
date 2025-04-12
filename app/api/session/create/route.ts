import { createSession } from '@/lib/session';
import { getServerSession } from 'next-auth/react';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
  }

  const userId = session.user.email || session.user.name || 'unknown';
  const userName = session.user.name || 'Host';
  const avatar = session.user.image;

  const queueSession = createSession(name, userId, userName, avatar);

  return NextResponse.json({
    session: {
      id: queueSession.id,
      code: queueSession.code,
      name: queueSession.name,
      hostId: userId,
      hostName: userName,
    },
  });
}
