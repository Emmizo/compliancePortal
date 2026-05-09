import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from '@/types';

/** Last JWT validated for this SPA instance; interceptor reads this every request (no synchronous disk read per call). */
let activePortalJwt: string | null = null;

const PORTAL_JWT_SESSION_STORAGE_KEY = 'bnr.portal.accessToken';

export function setAuthToken(portalJwt: string | null): void {
  activePortalJwt = portalJwt;
  try {
    if (portalJwt === null) {
      sessionStorage.removeItem(PORTAL_JWT_SESSION_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(PORTAL_JWT_SESSION_STORAGE_KEY, portalJwt);
  } catch {
    // sessionStorage denied: token still held in-memory until tab close; logout may not persist clears across refresh.
    return;
  }
}

export function hydrateAuthTokenFromSession(): void {
  try {
    const jwtPersistedFromLastTabLoad = sessionStorage.getItem(PORTAL_JWT_SESSION_STORAGE_KEY);
    if (jwtPersistedFromLastTabLoad === null || jwtPersistedFromLastTabLoad === '') {
      return;
    }
    activePortalJwt = jwtPersistedFromLastTabLoad;
  } catch {
    // same storage failure mode as setAuthToken; leave activePortalJwt as-is (usually still null).
  }
}

export function getAuthToken(): string | null {
  return activePortalJwt;
}

let portalAuthUnauthorizedHandler: (() => void) | null = null;
let portalAuthForbiddenHandler: ((messageFromServer: string) => void) | null = null;

export function registerAuthHandlers(handlers: {
  onUnauthorized?: () => void;
  onForbidden?: (message: string) => void;
}): void {
  portalAuthUnauthorizedHandler = handlers.onUnauthorized ?? null;
  portalAuthForbiddenHandler = handlers.onForbidden ?? null;
}

/** Axios instance targeting Spring Boot REST under same-origin `/api/v1`. */
export const http: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((outgoingPortalRequestConfig: InternalAxiosRequestConfig) => {
  const jwtForAuthorizationHeader = getAuthToken();
  if (jwtForAuthorizationHeader !== null && jwtForAuthorizationHeader !== '') {
    outgoingPortalRequestConfig.headers.set('Authorization', `Bearer ${jwtForAuthorizationHeader}`);
  }
  return outgoingPortalRequestConfig;
});

http.interceptors.response.use(
  (successfulResponseFromLicensingBackend) => successfulResponseFromLicensingBackend,
  (portalRequestFailure: AxiosError<ApiErrorBody>) => {
    const httpStatusFromSpring = portalRequestFailure.response?.status;

    if (httpStatusFromSpring === 401) {
      // Spring Security rejected JWT (wrong clock, revocation, blacklist, malformed) — purge client-held secret so the next outbound call does not replay it.
      setAuthToken(null);
      if (portalAuthUnauthorizedHandler !== null) {
        portalAuthUnauthorizedHandler();
      }
      return Promise.reject(portalRequestFailure);
    }

    if (httpStatusFromSpring === 403) {
      const enforcementMessage =
        portalRequestFailure.response?.data?.message !== undefined &&
        portalRequestFailure.response.data.message !== ''
          ? portalRequestFailure.response.data.message
          : 'Access denied';
      if (portalAuthForbiddenHandler !== null) {
        portalAuthForbiddenHandler(enforcementMessage);
      }
      return Promise.reject(portalRequestFailure);
    }

    return Promise.reject(portalRequestFailure);
  },
);

/** Maps thrown values to strings for banners; Spring `ApiError` shape is assumed when `response.data` exists. */
export function describeError(maybeThrown: unknown): string {
  if (!axios.isAxiosError(maybeThrown)) {
    if (maybeThrown instanceof Error) {
      return maybeThrown.message;
    }
    return 'An unexpected error occurred';
  }

  const licensingBackendResponse = maybeThrown.response;
  if (licensingBackendResponse === undefined || licensingBackendResponse.data === undefined) {
    return maybeThrown.message;
  }

  const structuredErrorEnvelope = licensingBackendResponse.data as ApiErrorBody | undefined;

  const primaryMessage =
    structuredErrorEnvelope?.message !== undefined && structuredErrorEnvelope.message !== ''
      ? structuredErrorEnvelope.message
      : null;

  if (primaryMessage === null) {
    const statusOnly = licensingBackendResponse.status;
    if (statusOnly !== undefined) {
      return `Request failed (HTTP ${statusOnly})`;
    }
    return maybeThrown.message;
  }

  const constraintViolationsJoined = structuredErrorEnvelope?.details;
  if (constraintViolationsJoined !== undefined && constraintViolationsJoined.length > 0) {
    return `${primaryMessage} — ${constraintViolationsJoined.join('; ')}`;
  }

  return primaryMessage;
}
