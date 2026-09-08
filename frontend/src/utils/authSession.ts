/**
 * SATARK Authentication Session & JWT Validator
 * Ensures that both Web and Android require a cryptographically formatted, unexpired JWT token
 * to access authenticated routes. Prevents stale localStorage values from bypassing authentication.
 */

export interface DecodedJwt {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Safely decodes base64url or base64 string
 */
export function decodeJwtPayload(token: string): DecodedJwt | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch {
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - parts[1].length % 4) % 4);
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}

/**
 * Validates whether a token string is a well-formed, unexpired JWT with a valid role.
 * Returns decoded payload if valid; returns null if missing, malformed, expired, or invalid.
 */
export function getValidSession(token: string | null | undefined): DecodedJwt | null {
  if (!token || typeof token !== 'string' || !token.trim()) return null;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') return null;

  // Verify expiration
  if (typeof payload.exp !== 'number' || isNaN(payload.exp)) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds >= payload.exp) {
    return null; // Expired token
  }

  // Extract and normalize role
  let role: string | undefined = payload.role;
  if (!role && payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
    role = payload.roles[0];
  }
  if (!role && typeof payload.authorities === 'string') {
    role = payload.authorities;
  }
  if (!role || typeof role !== 'string' || !role.trim()) {
    // If payload doesn't contain a role claim, check stored role as fallback only if unexpired
    const storedRole = localStorage.getItem('ews_role');
    if (storedRole && storedRole.trim()) {
      role = storedRole.trim();
    } else {
      return null;
    }
  }

  const cleanRole = role.replace(/^ROLE_/, '').trim().toUpperCase();

  return {
    ...payload,
    role: cleanRole
  };
}

/**
 * Purges all authentication session artifacts from localStorage.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_role');
    localStorage.removeItem('ews_user');
    localStorage.removeItem('satark_citizen_phone');
    localStorage.removeItem('satark_citizen_profile');
    localStorage.removeItem('citizenOnboardingCompleted');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: null }));
    }
  } catch {}
}

/**
 * Creates a validly formatted JWT for demo accounts / presentation mode with unexpired exp timestamp.
 */
export function createDemoJwt(username: string, role: string, expiresInHours: number = 24): string {
  const headerObj = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const iat = Math.floor(Date.now() / 1000);
  const cleanRole = role.replace(/^ROLE_/, '').trim().toUpperCase();

  const payloadObj: DecodedJwt = {
    sub: username,
    role: cleanRole,
    exp,
    iat
  };

  const toB64Url = (obj: any) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${toB64Url(headerObj)}.${toB64Url(payloadObj)}.demo-signature`;
}
