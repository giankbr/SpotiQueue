import { authOptions } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // DEBUGGING: Log the session structure to understand its format
    console.log('Session structure:', JSON.stringify(session, null, 2));

    const { name, code } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
    }

    // Create a temporary user ID if none exists in session
    // Try multiple possible locations of the user ID in the session object
    const userId = session.user?.id || session.sub || session.user?.sub || session.userId || session.user?.email || uuidv4(); // Last resort fallback

    console.log('Using user ID:', userId);

    // Use the provided code instead of generating a random one
    const sessionCode = code || generateSessionCode();

    // Check if the code is already in use
    const { data: existingSession } = await supabaseClient.from('sessions').select('id').eq('code', sessionCode).eq('active', true).single();

    if (existingSession) {
      return NextResponse.json({ error: 'Session code already in use. Please try a different code.' }, { status: 409 });
    }

    // Create session in database with the extracted or generated user ID
    const { data: newSession, error: sessionError } = await supabaseClient
      .from('sessions')
      .insert({
        id: uuidv4(),
        name,
        code: sessionCode,
        host_id: userId, // Use the extracted or generated user ID
        active: true,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Create user record for the host
    const { error: userError } = await supabaseClient.from('session_users').insert({
      id: userId, // Use the same ID here
      session_id: newSession.id,
      name: session.user?.name || 'Host',
      avatar: session.user?.image,
      songs_added: 0,
    });

    if (userError) {
      console.error('Error creating user record:', userError);
      // Continue anyway as we have created the session
    }

    return NextResponse.json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// Helper function to generate random code (only used as fallback)
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
