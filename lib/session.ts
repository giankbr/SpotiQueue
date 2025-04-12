import { randomBytes } from 'crypto';

type QueuedTrack = {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  addedBy: string;
  addedAt: number;
};

type SessionUser = {
  id: string;
  name: string;
  avatar?: string;
  songsAdded: number;
};

export type Session = {
  id: string;
  code: string;
  name: string;
  hostId: string;
  active: boolean;
  createdAt: number;
  users: SessionUser[];
  queue: QueuedTrack[];
};

// In-memory storage of sessions
const sessions = new Map<string, Session>();

// Generate a random 6-character code that's not already in use
function generateSessionCode(): string {
  const code = randomBytes(3).toString('hex').toUpperCase();

  // Check if code already exists (unlikely but possible)
  if ([...sessions.values()].some((session) => session.code === code)) {
    return generateSessionCode(); // Try again
  }

  return code;
}

export function createSession(name: string, hostId: string): Session {
  const id = randomBytes(16).toString('hex');
  const code = generateSessionCode();

  const session: Session = {
    id,
    code,
    name,
    hostId,
    active: true,
    createdAt: Date.now(),
    users: [],
    queue: [],
  };

  sessions.set(id, session);
  return session;
}

export function getSessionByCode(code: string): Session | undefined {
  return [...sessions.values()].find((session) => session.code === code && session.active);
}

export function getSessionById(id: string): Session | undefined {
  return sessions.get(id);
}

export function addUserToSession(sessionId: string, userId: string, userName: string, avatar?: string): SessionUser | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Check if user already exists
  const existingUser = session.users.find((u) => u.id === userId);
  if (existingUser) return existingUser;

  const newUser: SessionUser = {
    id: userId,
    name: userName,
    avatar,
    songsAdded: 0,
  };

  session.users.push(newUser);
  return newUser;
}

export function addTrackToQueue(
  sessionId: string,
  track: {
    id: string;
    uri: string;
    title: string;
    artist: string;
    album: string;
    image: string;
    duration: number;
  },
  userId: string
): QueuedTrack | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const queuedTrack: QueuedTrack = {
    ...track,
    addedBy: userId,
    addedAt: Date.now(),
  };

  session.queue.push(queuedTrack);

  // Increment the songsAdded count for the user
  const user = session.users.find((u) => u.id === userId);
  if (user) {
    user.songsAdded += 1;
  }

  return queuedTrack;
}

export function getAllSessions(): Session[] {
  return [...sessions.values()];
}
