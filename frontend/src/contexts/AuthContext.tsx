import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { describeError, registerAuthHandlers, setAuthToken, getAuthToken, hydrateAuthTokenFromSession } from '@/api/http';
import { decodePortalToken, tokenHasExpired } from '@/lib/jwt';
import type { Role, User } from '@/types';

export type AuthStatus = 'initialising' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  forbiddenMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearForbidden: () => void;
  flashForbidden: (message: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const licensingPortalQueryLayer = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('initialising');
  const [user, setUser] = useState<User | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const initialised = useRef(false);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setStatus('unauthenticated');
    // Next sign-in must not hydrate prior tenant rows from TanStack disk cache (especially admin lookups).
    setForbiddenMessage(null);
    licensingPortalQueryLayer.clear();
  }, [licensingPortalQueryLayer]);

  const flashForbidden = useCallback((message: string) => {
    setForbiddenMessage(message);
  }, []);

  useEffect(() => {
    registerAuthHandlers({
      onUnauthorized: () => {
        setUser(null);
        setForbiddenMessage(null);
        setStatus('unauthenticated');
        licensingPortalQueryLayer.clear();
      },
      onForbidden: (message) => setForbiddenMessage(message),
    });
  }, [licensingPortalQueryLayer]);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    hydrateAuthTokenFromSession();

    const token = getAuthToken();
    if (token === null || token === '') {
      setStatus('unauthenticated');
      return;
    }
    if (tokenHasExpired(token)) {
      setAuthToken(null);
      setStatus('unauthenticated');
      return;
    }

    authApi
      .me()
      .then((u) => {
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    if (tokenHasExpired(result.accessToken)) {
      throw new Error('Server returned an already-expired token; please retry');
    }
    try {
      const claims = decodePortalToken(result.accessToken);
      if (claims.role !== result.user.role) {
        throw new Error('Token role does not match user role; refusing to authenticate');
      }
    } catch (err) {
      throw new Error(describeError(err));
    }
    setAuthToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role: user?.role ?? null,
      forbiddenMessage,
      login,
      logout,
      clearForbidden: () => setForbiddenMessage(null),
      flashForbidden,
    }),
    [status, user, forbiddenMessage, login, logout, flashForbidden],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}
