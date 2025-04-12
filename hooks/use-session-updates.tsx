'use client';

import { useEffect, useState } from 'react';

type SessionUpdateProps = {
  sessionId: string;
  onQueueUpdate?: (queue: any[]) => void;
  onUserUpdate?: (users: any[]) => void;
  onPlayerUpdate?: (player: any) => void;
};

export function useSessionUpdates({ sessionId, onQueueUpdate, onUserUpdate, onPlayerUpdate }: SessionUpdateProps) {
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/session/listen?sessionId=${sessionId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Failed to connect to session updates');
      eventSource.close();
    };

    eventSource.addEventListener('queue', (event) => {
      if (onQueueUpdate) {
        try {
          const data = JSON.parse(event.data);
          onQueueUpdate(data.queue);
        } catch (err) {
          console.error('Error parsing queue update', err);
        }
      }
    });

    eventSource.addEventListener('users', (event) => {
      if (onUserUpdate) {
        try {
          const data = JSON.parse(event.data);
          onUserUpdate(data.users);
        } catch (err) {
          console.error('Error parsing users update', err);
        }
      }
    });

    eventSource.addEventListener('player', (event) => {
      if (onPlayerUpdate) {
        try {
          const data = JSON.parse(event.data);
          onPlayerUpdate(data.player);
        } catch (err) {
          console.error('Error parsing player update', err);
        }
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId, onQueueUpdate, onUserUpdate, onPlayerUpdate]);

  return { isConnected, error };
}
