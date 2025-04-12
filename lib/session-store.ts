export type SessionUser = {
  id: string;
  name: string;
  avatar?: string;
  songsAdded: number;
};

export type QueuedTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string;
  duration: number;
  addedBy: string;
  addedAt: number;
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
  currentlyPlaying?: any;
};

// In-memory storage of sessions (in a real app, use a database)
const sessions = new Map<string, Session>();

export function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createSession(name: string, hostId: string, hostName: string, hostAvatar?: string): Session {
  const code = generateSessionCode();
  const id = Date.now().toString();

  const session: Session = {
    id,
    code,
    name,
    hostId,
    active: true,
    createdAt: Date.now(),
    users: [
      {
        id: hostId,
        name: hostName,
        avatar: hostAvatar,
        songsAdded: 0,
      },
    ],
    queue: [],
  };

  sessions.set(id, session);
  return session;
}

export function getSessionByCode(code: string): Session | undefined {
  return Array.from(sessions.values()).find((session) => session.code.toLowerCase() === code.toLowerCase() && session.active);
}

export function getSessionById(id: string): Session | undefined {
  return sessions.get(id);
}

export function addUserToSession(sessionId: string, userId: string, userName: string, avatar?: string): SessionUser | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Don't add duplicate users
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
    name: string;
    artists: string;
    album: string;
    albumArt: string;
    duration: number;
  },
  userId: string
): QueuedTrack | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Find the user who added the track
  const user = session.users.find((u) => u.id === userId);
  if (user) {
    user.songsAdded += 1;
  }

  const queuedTrack: QueuedTrack = {
    ...track,
    addedBy: userId,
    addedAt: Date.now(),
  };

  session.queue.push(queuedTrack);
  return queuedTrack;
}

export function updateCurrentlyPlaying(sessionId: string, currentTrack: any): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.currentlyPlaying = currentTrack;
  return true;
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}
