import { Capacitor } from '@capacitor/core';

/**
 * Returns true ONLY when running inside the native Android Capacitor shell,
 * or when explicitly debugging via ?platform=android in the query string.
 *
 * Guaranteed to return false for normal desktop browsers and mobile web browsers.
 */
export const isCapacitorAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Manual URL override for local testing / QA verification
  const params = new URLSearchParams(window.location.search);
  if (params.get('platform') === 'android') {
    return true;
  }

  // Native Capacitor check
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};
