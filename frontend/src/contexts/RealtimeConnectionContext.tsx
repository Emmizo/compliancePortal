import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface RealtimeConnectionContextValue {
  realtimeConnected: boolean;
  setRealtimeConnected: (connected: boolean) => void;
}

const RealtimeConnectionContext = createContext<RealtimeConnectionContextValue | null>(null);

export function RealtimeConnectionProvider({ children }: { children: ReactNode }) {
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const value = useMemo(
    () => ({ realtimeConnected, setRealtimeConnected }),
    [realtimeConnected],
  );

  return (
    <RealtimeConnectionContext.Provider value={value}>{children}</RealtimeConnectionContext.Provider>
  );
}

/** Read-only for use in queries; `RealtimeSync` drives the value via STOMP lifecycle. */
export function useRealtimeConnection(): boolean {
  const ctx = useContext(RealtimeConnectionContext);
  if (ctx === null) {
    throw new Error('useRealtimeConnection requires RealtimeConnectionProvider');
  }
  return ctx.realtimeConnected;
}

/** @internal Only `RealtimeSync` should call this. */
export function useRealtimeConnectionDispatch(): (connected: boolean) => void {
  const ctx = useContext(RealtimeConnectionContext);
  if (ctx === null) {
    throw new Error('useRealtimeConnectionDispatch requires RealtimeConnectionProvider');
  }
  return ctx.setRealtimeConnected;
}
