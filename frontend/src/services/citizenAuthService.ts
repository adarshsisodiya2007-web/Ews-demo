import { api, isBackendAvailableOrConfigured } from './api';
import {
  CitizenProfile,
  CitizenProfileInput,
  SendOtpResponse,
  CitizenAuthResponse
} from '../types';

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
 * Detects whether an Axios failure is due to missing public backend, cloud sleep, network cutoff, or Vercel SPA rewrite.
 */
const isBackendUnavailable = (err: any): boolean => {
  if (!err) return true;
  // Network connection failure or request timeout
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || !err.response) return true;
  const status = err.response?.status;
  // 404 (endpoint not found on server or wrong URL), 502/503/504 (gateway down / sleeping), 500 (internal failure)
  if (status === 404 || status === 502 || status === 503 || status === 504 || status >= 500) return true;
  // If Vercel rewrote the request to index.html
  if (typeof err.response?.data === 'string' && (err.response.data.includes('<!DOCTYPE') || err.response.data.includes('<html'))) return true;
  return false;
};

export const sendCitizenOtp = async (phone: string): Promise<SendOtpResponse> => {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 12) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  // When no public backend is configured in production, immediately provide the SIH demo OTP
  // with zero network delay or hanging timeout.
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
    if (isBackendUnavailable(err)) {
      console.warn('[SATARK] Live backend unavailable for OTP. Falling back to resilient SIH demo mode.');
      return {
        success: true,
        message: 'Demo OTP sent successfully (SIH 2026 Presentation Mode)',
        demoMode: true,
        demoOtp: DEMO_OTP_CODE,
        cooldownSeconds: 60
      };
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to send OTP. Please check your network.');
  }
};

export const verifyCitizenOtp = async (phone: string, otp: string): Promise<CitizenAuthResponse> => {
  const normalized = normalizePhone(phone);
  const cleanOtp = (otp || '').trim();

  // If no backend is configured, immediately verify via SIH demo mode
  if (!isBackendAvailableOrConfigured()) {
    if (cleanOtp !== DEMO_OTP_CODE) {
      throw new Error(`Invalid OTP. For SIH demo mode, enter ${DEMO_OTP_CODE}.`);
    }

    const cachedProfile = getCachedCitizenProfile();
    const demoToken = `demo-citizen-jwt-${Date.now()}`;
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
    if (isBackendUnavailable(err)) {
      console.warn('[SATARK] Live backend unavailable for verification. Validating via SIH demo mode.');
      if (cleanOtp !== DEMO_OTP_CODE) {
        throw new Error(`Invalid OTP. For SIH demo mode, enter ${DEMO_OTP_CODE}.`);
      }

      const cachedProfile = getCachedCitizenProfile();
      const demoToken = `demo-citizen-jwt-${Date.now()}`;
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

    throw new Error(err.response?.data?.message || err.message || 'Invalid or expired OTP. Please try again.');
  }
};

export const getCitizenProfile = async (): Promise<CitizenProfile | null> => {
  if (!isBackendAvailableOrConfigured()) {
    return getCachedCitizenProfile();
  }
  try {
    const res = await api.get<CitizenProfile>('/api/citizen/profile');
    if (res.data && typeof res.data === 'object' && res.data.fullName) {
      setCachedCitizenProfile(res.data);
      return res.data;
    }
    return getCachedCitizenProfile();
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }
    return getCachedCitizenProfile();
  }
};

export const createCitizenProfile = async (input: CitizenProfileInput): Promise<CitizenProfile> => {
  if (!isBackendAvailableOrConfigured()) {
    const phone = getStoredCitizenPhone() || '+919876543210';
    const localProfile: CitizenProfile = {
      id: `demo-prof-${Date.now()}`,
      userId: `demo-usr-${Date.now()}`,
      fullName: input.fullName.trim(),
      phone,
      gender: input.gender,
      ageGroup: input.ageGroup,
      preferredLanguage: input.preferredLanguage || 'en',
      bloodGroup: input.bloodGroup,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      accessibilityNeeds: input.accessibilityNeeds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCachedCitizenProfile(localProfile);
    if (localProfile.preferredLanguage) {
      localStorage.setItem('ews_lang', localProfile.preferredLanguage);
    }
    window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: localProfile }));
    return localProfile;
  }
  try {
    const res = await api.post<CitizenProfile>('/api/citizen/profile', input);
    if (res.data && typeof res.data === 'object' && res.data.fullName) {
      setCachedCitizenProfile(res.data);
      if (res.data.preferredLanguage) {
        localStorage.setItem('ews_lang', res.data.preferredLanguage);
      }
      window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: res.data }));
      return res.data;
    }
    throw new Error('Invalid profile creation response');
  } catch (err: any) {
    if (isBackendUnavailable(err)) {
      console.warn('[SATARK] Live backend unavailable for profile creation. Saving locally.');
      const phone = getStoredCitizenPhone() || '+919876543210';
      const localProfile: CitizenProfile = {
        id: `demo-prof-${Date.now()}`,
        userId: `demo-usr-${Date.now()}`,
        fullName: input.fullName.trim(),
        phone,
        gender: input.gender,
        ageGroup: input.ageGroup,
        preferredLanguage: input.preferredLanguage || 'en',
        bloodGroup: input.bloodGroup,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        accessibilityNeeds: input.accessibilityNeeds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setCachedCitizenProfile(localProfile);
      if (localProfile.preferredLanguage) {
        localStorage.setItem('ews_lang', localProfile.preferredLanguage);
      }
      window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: localProfile }));
      return localProfile;
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to save profile');
  }
};

export const updateCitizenProfile = async (input: CitizenProfileInput): Promise<CitizenProfile> => {
  if (!isBackendAvailableOrConfigured()) {
    const existing = getCachedCitizenProfile();
    const updated: CitizenProfile = {
      id: existing?.id || `demo-prof-${Date.now()}`,
      userId: existing?.userId || `demo-usr-${Date.now()}`,
      fullName: input.fullName.trim(),
      phone: existing?.phone || getStoredCitizenPhone() || '+919876543210',
      gender: input.gender ?? existing?.gender,
      ageGroup: input.ageGroup ?? existing?.ageGroup,
      preferredLanguage: input.preferredLanguage || existing?.preferredLanguage || 'en',
      bloodGroup: input.bloodGroup ?? existing?.bloodGroup,
      emergencyContactName: input.emergencyContactName ?? existing?.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone ?? existing?.emergencyContactPhone,
      accessibilityNeeds: input.accessibilityNeeds ?? existing?.accessibilityNeeds,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCachedCitizenProfile(updated);
    if (updated.preferredLanguage) {
      localStorage.setItem('ews_lang', updated.preferredLanguage);
    }
    window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: updated }));
    return updated;
  }
  try {
    const res = await api.put<CitizenProfile>('/api/citizen/profile', input);
    if (res.data && typeof res.data === 'object' && res.data.fullName) {
      setCachedCitizenProfile(res.data);
      if (res.data.preferredLanguage) {
        localStorage.setItem('ews_lang', res.data.preferredLanguage);
      }
      window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: res.data }));
      return res.data;
    }
    throw new Error('Invalid profile update response');
  } catch (err: any) {
    if (isBackendUnavailable(err)) {
      const existing = getCachedCitizenProfile();
      const updated: CitizenProfile = {
        id: existing?.id || `demo-prof-${Date.now()}`,
        userId: existing?.userId || `demo-usr-${Date.now()}`,
        fullName: input.fullName.trim(),
        phone: existing?.phone || getStoredCitizenPhone() || '+919876543210',
        gender: input.gender ?? existing?.gender,
        ageGroup: input.ageGroup ?? existing?.ageGroup,
        preferredLanguage: input.preferredLanguage || existing?.preferredLanguage || 'en',
        bloodGroup: input.bloodGroup ?? existing?.bloodGroup,
        emergencyContactName: input.emergencyContactName ?? existing?.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone ?? existing?.emergencyContactPhone,
        accessibilityNeeds: input.accessibilityNeeds ?? existing?.accessibilityNeeds,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setCachedCitizenProfile(updated);
      if (updated.preferredLanguage) {
        localStorage.setItem('ews_lang', updated.preferredLanguage);
      }
      window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: updated }));
      return updated;
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to update profile');
  }
};

export const deleteCitizenProfile = async (): Promise<void> => {
  try {
    await api.delete('/api/citizen/profile').catch(() => {});
  } finally {
    localStorage.removeItem(CITIZEN_PROFILE_CACHE_KEY);
    window.dispatchEvent(new CustomEvent('satark-profile-updated', { detail: null }));
  }
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