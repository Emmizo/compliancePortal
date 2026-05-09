import { Client } from '@stomp/stompjs';
import type { Role } from '@/types';
import { getAuthToken } from '@/api/http';

// Broker DEST must stay aligned with StompJwtChannelInterceptor SUBSCRIBE allowlist (ADMIN topic is not interchangeable with reviewer/approver topics).

function wsBaseUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function connectApplicationRealtime(role: Role, onEvent: () => void): Client {
  const token = getAuthToken();
  if (!token) {
    throw new Error('connectApplicationRealtime: no access token');
  }

  const client = new Client({
    brokerURL: wsBaseUrl(),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 4000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    debug: import.meta.env.DEV ? (m) => console.debug('[stomp]', m) : () => undefined,
    onConnect: () => {
      const bump = (payloadText: string) => {
        try {
          const snapshot = JSON.parse(payloadText) as { applicationId?: number; status?: string };
          if (snapshot.applicationId != null && snapshot.status != null) {
            onEvent();
          }
        } catch {}
      };

      client.subscribe('/user/queue/application-events', (m) => bump(m.body));
      if (role === 'REVIEWER') {
        client.subscribe('/topic/reviewers/application-events', (m) => bump(m.body));
      }
      if (role === 'APPROVER') {
        client.subscribe('/topic/approvers/application-events', (m) => bump(m.body));
      }
      if (role === 'ADMIN') {
        client.subscribe('/topic/admins/application-events', (m) => bump(m.body));
      }
    },
  });

  client.activate();
  return client;
}
