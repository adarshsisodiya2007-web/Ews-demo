import { api } from './api';
import {
  CitizenProfile,
  CitizenProfileInput,
  SendOtpResponse,
  CitizenAuthResponse
} from '../types';

const CITIZEN_PROFILE_CACHE_KEY = 'satark_citizen_profile';
const CITIZEN_PHONE_KEY = 'satark_citizen_phone';

export const sendCitizenOtp = async (phone: string): Promise<SendOtpResponse> => {
  const res = await api.post<SendOtpResponse>('/api/auth/citizen/send-otp', { phone });
  return res.data;
};

export const verifyCitizenOtp = async (phone: string, otp: string): Promise<CitizenAuthResponse> => {
  const res = await api.post<CitizenAuthResponse>('/api/auth/citizen/verify-otp', { phone, otp });
  const data = res.data;
  if (data.token) {
    localStorage.setItem('ews_token', data.token);
    localStorage.setItem('ews_role', data.user.role);
    localStorage.setItem('ews_user', data.user.username);
    localStorage.setItem(CITIZEN_PHONE_KEY, data.user.phone || phone);
    if (data.profile) {
      setCachedCitizenProfile(data.profile);
      if (data.profile.preferredLanguage) {
        localStorage.setItem('ews_lang', data.profile.preferredLanguage);
      }
    }
    window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: data }));
  }
  return data;
};

export const getCitizenProfile = async (): Promise<CitizenProfile | null> => {
  try {
    const res = await api.get<CitizenProfile>('/api/citizen/profile');
    setCachedCitizenProfile(res.data);
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }
    return getCachedCitizenProfile();
  }
};

export const createCitizenProfile = async (input: CitizenProfileInput): Promise<CitizenProfile> => {
  const res = await api.post<CitizenProfile>('/api/citizen/profile', input);
  setCachedCitizenProfile(res.data);
  if (res.data.preferredLanguage) {
    localStorage.setItem('ews_lang', res.data.preferredLanguage);
  }
  window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: res.data }));
  return res.data;
};

export const updateCitizenProfile = async (input: CitizenProfileInput): Promise<CitizenProfile> => {
  const res = await api.put<CitizenProfile>('/api/citizen/profile', input);
  setCachedCitizenProfile(res.data);
  if (res.data.preferredLanguage) {
    localStorage.setItem('ews_lang', res.data.preferredLanguage);
  }
  window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: res.data }));
  return res.data;
};

export const deleteCitizenProfile = async (): Promise<void> => {
  await api.delete('/api/citizen/profile');
  localStorage.removeItem(CITIZEN_PROFILE_CACHE_KEY);
  window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: null }));
};

export const logoutCitizen = async (): Promise<void> => {
  try {
    await api.post('/api/auth/logout').catch(() => {});
  } finally {
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_role');
    localStorage.removeItem('ews_user');
    localStorage.removeItem(CITIZEN_PHONE_KEY);
    localStorage.removeItem(CITIZEN_PROFILE_CACHE_KEY);
    window.dispatchEvent(new CustomEvent('satark-auth-changed', { detail: null }));
  }
};

export const getCachedCitizenProfile = (): CitizenProfile | null => {
  try {
    const raw = localStorage.getItem(CITIZEN_PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedCitizenProfile = (profile: CitizenProfile | null): void => {
  if (profile) {
    localStorage.setItem(CITIZEN_PROFILE_CACHE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(CITIZEN_PROFILE_CACHE_KEY);
  }
};

export const isCitizenAuthenticated = (): boolean => {
  return !!localStorage.getItem('ews_token');
};

export const getStoredCitizenPhone = (): string | null => {
  return localStorage.getItem(CITIZEN_PHONE_KEY) || localStorage.getItem('ews_user');
};