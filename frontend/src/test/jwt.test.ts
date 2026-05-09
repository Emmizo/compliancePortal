import { describe, expect, it } from 'vitest';
import { decodePortalToken, tokenHasExpired } from '@/lib/jwt';

function buildJwt(claims: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedClaims = base64Url(JSON.stringify(claims));
  return `${header}.${encodedClaims}.ignored-signature`;
}

function base64Url(input: string): string {
  return btoa(input).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

describe('decodePortalToken', () => {
  it('extracts the role claim verbatim', () => {
    const token = buildJwt({
      sub: 'reviewer@bnr.rw',
      uid: 7,
      role: 'REVIEWER',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: 'bnr-compliance-portal',
    });

    const claims = decodePortalToken(token);
    expect(claims.role).toBe('REVIEWER');
    expect(claims.uid).toBe(7);
    expect(claims.sub).toBe('reviewer@bnr.rw');
  });

  it('handles each portal role', () => {
    for (const role of ['APPLICANT', 'REVIEWER', 'APPROVER', 'ADMIN'] as const) {
      const token = buildJwt({
        sub: `${role}@bnr.rw`,
        uid: 1,
        role,
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        iss: 'bnr-compliance-portal',
      });
      expect(decodePortalToken(token).role, role).toBe(role);
    }
  });
});

describe('tokenHasExpired', () => {
  it('treats a token expiring in the past as expired', () => {
    const token = buildJwt({
      sub: 'x@y.rw', uid: 1, role: 'APPLICANT',
      exp: Math.floor(Date.now() / 1000) - 60,
      iat: Math.floor(Date.now() / 1000) - 120,
      iss: 'bnr-compliance-portal',
    });
    expect(tokenHasExpired(token)).toBe(true);
  });

  it('treats a token expiring well in the future as fresh', () => {
    const token = buildJwt({
      sub: 'x@y.rw', uid: 1, role: 'APPLICANT',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: 'bnr-compliance-portal',
    });
    expect(tokenHasExpired(token)).toBe(false);
  });

  it('treats a malformed token as expired (fail-closed)', () => {
    expect(tokenHasExpired('not.a.jwt')).toBe(true);
  });
});
