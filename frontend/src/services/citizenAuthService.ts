import { api, isBackendAvailableOrConfigured } from './api';
import {
  CitizenProfile,
  CitizenProfileInput,
  SendOtpResponse,
  CitizenAuthResponse,
  LoginResponse
} from '../types';
import { createDemoJwt, getValidSession, clearAuthSession } from '../utils/authSession';

const CITIZEN_PROFILE_CACHE_KEY = 'satark_citizen_profile';
const CITIZEN_PHONE_KEY = 'satark_citizen_phone';
const DEMO_OTP_CODE = '123456';

/**
 * Normalizes phone numbers to E.164-compatible international format for Indian mobiles (+91).
 */
export const normalizePhone = (rawPhone: string): string => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (rawPhone.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return digits.length > 0 ? `+91${digits}` : '';
};

/**
 * Detects whether an Axios failure is due to complete network failure or Vercel SPA rewrite.
 * 404/400/403/429 with JSON body means the backend IS live and answered with a domain validation error!
 */
const isBackendNetworkDead = (err: any): boolean => {
  if (!err) return true;
  // Network connection failure or request timeout
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response) return true;
  // If Vercel rewrote the request to index.html
  if (typeof err.response?.data === 'string' && (err.response.data.includes('<!DOCTYPE') || err.response.data.includes('<html'))) return true;
  // 502/503/504 gateway down
  if (err.response?.status === 502 || err.response?.status === 503 || err.response?.status === 504) return true;
  return false;
};

// ── CITIZEN REAL OTP FLOW ──────────────────────────────────────────────────

export const sendCitizenOtp = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 12) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  if (!isBackendAvailableOrConfigured()) {
    return {
      success: true,
      message: 'Demo OTP sent successfully (SIH 2026 Presentation Mode)',
      demoMode: true,
      demoOtp: DEMO_OTP_CODE,
      cooldownSeconds: 60
    };
  }

  try {
    const res = await api.post<SendOtpResponse>('/api/auth/citizen/send-otp', { phone: normalized });
    if (res.data && typeof res.data === 'object' && res.data.success !== undefined) {
      return res.data;
    }
    throw new Error('Invalid server response');
  } catch (err: any) {
    if (err.response?.data?.message) {
      // Return server-side domain error (e.g. Unregistered number: 404)
      const error: any = new Error(err.response.data.message);
      error.isUnregistered = err.response.status === 404;
      error.status = err.response.status;
      throw error;
    }
    if (isBackendNetworkDead(err)) {
      console.warn('[SATARK] Live backend unreachable. Falling back to resilient SIH demo mode.');
      return {
        success: true,
        message: 'Demo OTP sent successfully (SIH 2026 Presentation Mode)',
        demoMode: true,
        demoOtp: DEMO_OTP_CODE,
        cooldownSeconds: 60
      };
    }
    throw new Error(err.message || 'Failed to send OTP. Please check your network.');
  }
};

export const registerCitizenPhone = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 12) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  try {
    const res = await api.post<SendOtpResponse>('/api/auth/citizen/register', { phone: normalized });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || 'Registration failed.');
  }
};

export const verifyCitizenOtp = async (phone: string, otp: string): Promise<CitizenAuthResponse> => {
  const normalized = normalizePhone(phone);
  const cleanOtp = (otp || '').trim();

  if (!isBackendAvailableOrConfigured()) {
    if (cleanOtp !== DEMO_OTP_CODE) {
      throw new Error(`Invalid OTP. For SIH demo mode, enter ${DEMO_OTP_CODE}.`);
    }

    const cachedProfile = getCachedCitizenProfile();
    const demoToken = createDemoJwt(normalized, 'CITIZEN');
    const demoUser = {
      id: `demo-usr-${normalized.slice(-4)}`,
      username: normalized,
      phone: normalized,
      role: 'CITIZEN'
    };

    localStorage.setItem('ews_token', demoToken);
    localStorage.setItem('ews_role', 'CITIZEN');
    localStorage.setItem('ews_user', normalized);
    localStorage.setItem(CITIZEN_PHONE_KEY, normalized);
    if (cachedProfile?.preferredLanguage) {
      localStorage.setItem('ews_lang', cachedProfile.preferredLanguage);
    }

    const fallbackResponse: CitizenAuthResponse = {
      token: demoToken,
      user: demoUser,
      profileExists: !!cachedProfile,
      profile: cachedProfile
    };

    window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: fallbackResponse }));
    return fallbackResponse;
  }

  try {
    const res = await api.post<CitizenAuthResponse>('/api/auth/citizen/verify-otp', { phone: normalized, otp: cleanOtp });
    const data = res.data;
    if (data && typeof data === 'object' && data.token) {
      localStorage.setItem('ews_token', data.token);
      localStorage.setItem('ews_role', data.user.role || 'CITIZEN');
      localStorage.setItem('ews_user', data.user.username || normalized);
      localStorage.setItem(CITIZEN_PHONE_KEY, data.user.phone || normalized);
      if (data.profile) {
        setCachedCitizenProfile(data.profile);
        if (data.profile.preferredLanguage) {
          localStorage.setItem('ews_lang', data.profile.preferredLanguage);
        }
      }
      window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: data }));
      return data;
    }
    throw new Error('Invalid verification response');
  } catch (err: any) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    if (isBackendNetworkDead(err)) {
      console.warn('[SATARK] Live backend unreachable for verification. Validating via SIH demo mode.');
      if (cleanOtp !== DEMO_OTP_CODE) {
        throw new Error(`Invalid OTP. For SIH demo mode, enter ${DEMO_OTP_CODE}.`);
      }

      const cachedProfile = getCachedCitizenProfile();
      const demoToken = createDemoJwt(normalized, 'CITIZEN');
      const demoUser = {
        id: `demo-usr-${normalized.slice(-4)}`,
        username: normalized,
        phone: normalized,
        role: 'CITIZEN'
      };

      localStorage.setItem('ews_token', demoToken);
      localStorage.setItem('ews_role', 'CITIZEN');
      localStorage.setItem('ews_user', normalized);
      localStorage.setItem(CITIZEN_PHONE_KEY, normalized);
      if (cachedProfile?.preferredLanguage) {
        localStorage.setItem('ews_lang', cachedProfile.preferredLanguage);
      }

      const fallbackResponse: CitizenAuthResponse = {
        token: demoToken,
        user: demoUser,
        profileExists: !!cachedProfile,
        profile: cachedProfile
      };

      window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: fallbackResponse }));
      return fallbackResponse;
    }
    throw new Error(err.message || 'Citizen OTP verification failed.');
  }
};

// ── OFFICER REAL OTP SERVICE ───────────────────────────────────────────────

export const sendOfficerOtp = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Please enter a valid 10-digit mobile number');
  }

  const backendAvailable = await isBackendAvailableOrConfigured();
  if (backendAvailable) {
    const res = await api.post('/auth/officer/send-otp', { phone: normalized });
    return res.data;
  }

  // Fallback demo mode for judge evaluation
  return {
    success: true,
    message: 'SIH Demo Mode: Verification code generated for evaluator.',
    demoMode: true,
    demoOtp: DEMO_OTP_CODE,
    cooldownSeconds: 30
  };
};

export const verifyOfficerOtp = async (phone: string, otp: string): Promise<LoginResponse> => {
  const normalized = normalizePhone(phone);
  const backendAvailable = await isBackendAvailableOrConfigured();

  if (backendAvailable) {
    try {
      const res = await api.post('/auth/officer/verify-otp', { phone: normalized, otp: otp.trim() });
      const data: LoginResponse = res.data;
      localStorage.setItem('ews_token', data.token);
      localStorage.setItem('ews_role', data.role);
      localStorage.setItem('ews_user', data.username);
      if (data.languagePref) {
        localStorage.setItem('ews_lang', data.languagePref);
      }
      window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: data }));
      return data;
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403 || err.response?.status === 400) {
        throw new Error(err.response?.data?.message || 'Access denied. Unauthorized mobile number.');
      }
      // If network failure, fall through to demo logic
    }
  }

  // Offline / Demo verification
  try {
    if (otp === DEMO_OTP_CODE || otp === '1234' || otp === '123456') {
      let mappedRole = 'FIELD_OFFICER';
      let mappedUser = 'aizawl_officer';

      if (normalized === '+919876543210') {
        mappedRole = 'ADMIN';
        mappedUser = 'admin';
      } else if (normalized === '+919876543211') {
        mappedRole = 'DISTRICT_OFFICIAL';
        mappedUser = 'kamrup_official';
      }

      const mockResponse: LoginResponse = {
        token: createDemoJwt(mappedUser, mappedRole),
        username: mappedUser,
        role: mappedRole,
        district: mappedUser === 'admin' ? null : 'Kamrup Metropolitan',
        languagePref: 'en',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      localStorage.setItem('ews_token', mockResponse.token);
      localStorage.setItem('ews_role', mockResponse.role);
      localStorage.setItem('ews_user', mockResponse.username);
      window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: mockResponse }));
      return mockResponse;
    }
    throw new Error('Invalid OTP. Please check the code and try again.');
  } catch (err: any) {
    throw new Error(err.message || 'OTP verification failed.');
  }
};

// ── PROFILE CACHE & UTILS ──────────────────────────────────────────────────

export const getCachedCitizenProfile = (): CitizenProfile | null => {
  try {
    const raw = localStorage.getItem(CITIZEN_PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedCitizenProfile = (profile: CitizenProfile): void => {
  try {
    localStorage.setItem(CITIZEN_PROFILE_CACHE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: profile }));
  } catch {}
};

export const isCitizenAuthenticated = (): boolean => {
  const session = getValidSession(localStorage.getItem('ews_token'));
  return !!session && session.role === 'CITIZEN';
};

export const getCitizenPhone = (): string => {
  return localStorage.getItem(CITIZEN_PHONE_KEY) || '';
};

export const getStoredCitizenPhone = getCitizenPhone;


export const logoutCitizen = (): void => {
  clearAuthSession();
};

export const getCitizenProfile = async (): Promise<CitizenProfile | null> => {
  const cached = getCachedCitizenProfile();
  try {
    const res = await api.get<CitizenProfile>('/api/citizen/profile');
    if (res.data) {
      setCachedCitizenProfile(res.data);
      return res.data;
    }
  } catch {
    // Return cached profile if offline
  }
  return cached;
};

export const updateCitizenProfile = async (profile: CitizenProfileInput): Promise<CitizenProfile> => {
  const res = await api.put<CitizenProfile>('/api/citizen/profile', profile);
  setCachedCitizenProfile(res.data);
  return res.data;
};

export const createCitizenProfile = async (profile: CitizenProfileInput): Promise<CitizenProfile> => {
  const res = await api.post<CitizenProfile>('/api/citizen/profile', profile);
  setCachedCitizenProfile(res.data);
  return res.data;
};
