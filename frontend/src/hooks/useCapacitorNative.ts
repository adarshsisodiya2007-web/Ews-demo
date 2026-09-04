import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export function useCapacitorNative() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Configure Native Status Bar
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#161B22' }).catch(() => {});
    }
  }, []);

  // 2. Handle Android Hardware Back Button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: any = null;

    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        // Allow active mobile modals, sheets, or subviews to consume back press
        const backEvent = new CustomEvent('satark-android-back', { cancelable: true });
        const handled = !window.dispatchEvent(backEvent);
        if (handled) return;

        const currentPath = location.pathname;

        // If at root or main portals, exit app
        if (currentPath === '/' || currentPath === '/login') {
          CapApp.exitApp();
          return;
        }

        // Sub-pages navigate back to their portal roots
        if (currentPath === '/profile' || currentPath === '/privacy' || currentPath === '/offline-rescue' || currentPath === '/report') {
          navigate('/citizen');
          return;
        }

        if (currentPath === '/map') {
          navigate('/citizen');
          return;
        }

        if (currentPath === '/sih-dashboard') {
          navigate('/dashboard');
          return;
        }

        if (currentPath === '/citizen' || currentPath === '/dashboard' || currentPath === '/responder') {
          navigate('/login');
          return;
        }

        // Default navigation behavior
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [location.pathname, navigate]);
}
