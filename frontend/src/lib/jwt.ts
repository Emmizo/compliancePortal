import { jwtDecode } from 'jwt-decode';
import type { Role } from '@/types';

interface PortalJwtClaims {
  sub: string;
  uid: number;
  role: Role;
  exp: number;
  iat: number;
  iss: string;
}

export function decodePortalToken(token: string): PortalJwtClaims {
  return jwtDecode<PortalJwtClaims>(token);
}

export function tokenHasExpired(token: string): boolean {
  try {
    const { exp } = decodePortalToken(token);
    return Date.now() / 1000 >= exp - 30;  } catch {
    return true;
  }
}
