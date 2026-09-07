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
 * Accepts: 9876543210, +919876543210, 919876543210, 09876543210, or spaces/hyphens.
 */
export const normalizePhone = (rawPhone: string): string => {
  if (!rawPhone || !rawPhone.trim()) return '';
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return '';
  }
  return `+91${cleaned}`;
};

// ── CITIZEN REAL OTP FLOW ──────────────────────────────────────────────────

export const sendCitizenOtp = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  try {
    const res = await api.post<SendOtpResponse>('/api/auth/citizen/send-otp', { phone: normalized });
    if (res.data && typeof res.data === 'object' && res.data.success !== undefined) {
      return res.data;
    }
    throw new Error('Unable to send OTP right now. Please try again.');
  } catch (err: any) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response) {
      throw new Error('Network connection unavailable. Please check your internet connection and try again.');
    }
    throw new Error(err.message || 'Unable to send OTP right now. Please try again.');
  }
};

export const registerCitizenPhone = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  try {
    const res = await api.post<SendOtpResponse>('/api/auth/citizen/register', { phone: normalized });
    return res.data;
  } catch (err: any) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw new Error(err.message || 'Registration failed.');
  }
};

export const verifyCitizenOtp = async (phone: string, otp: string): Promise<CitizenAuthResponse> => {
  const normalized = normalizePhone(phone);
  const cleanOtp = (otp || '').trim();
  if (!cleanOtp) {
    throw new Error('Incorrect OTP. Please try again.');
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
    throw new Error('Incorrect OTP. Please try again.');
  } catch (err: any) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response) {
      throw new Error('Network connection unavailable. Please check your internet connection and try again.');
    }
    throw new Error(err.message || 'Incorrect OTP. Please try again.');
  }
};

// ── OFFICER REAL OTP SERVICE ───────────────────────────────────────────────

export const sendOfficerOtp = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  try {
    const res = await api.post<SendOtpResponse>('/api/auth/officer/send-otp', { phone: normalized });
    return res.data;
  } catch (err: any) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response) {
      throw new Error('Network connection unavailable. Please check your internet connection and try again.');
    }
    throw new Error(err.message || 'Unable to send OTP right now. Please try again.');
  }
};

export const verifyOfficerOtp = async (phone: string, otp: string): Promise<LoginResponse> => {
  const normalized = normalizePhone(phone);
  const cleanOtp = (otp || '').trim();
  if (!cleanOtp) {
    throw new Error('Incorrect OTP. Please try again.');
  }

  try {
    const res = await api.post<LoginResponse>('/api/auth/officer/verify-otp', { phone: normalized, otp: cleanOtp });
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
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response) {
      throw new Error('Network connection unavailable. Please check your internet connection and try again.');
    }
    throw new Error(err.message || 'Incorrect OTP. Please try again.');
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
