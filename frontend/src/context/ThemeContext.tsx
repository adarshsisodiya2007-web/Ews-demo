import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = 'satark_theme';
export const LEGACY_MOBILE_THEME_KEY = 'satark_mobile_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_MOBILE_THEME_KEY);
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });

  const applyTheme = (nextTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(LEGACY_MOBILE_THEME_KEY, theme);
  }, [theme]);

  // Listen to storage events from other tabs / windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY || e.key === LEGACY_MOBILE_THEME_KEY) {
        const val = e.newValue;
        if (val === 'light' || val === 'dark') {
          setThemeState(val);
        }
      }
    };
    const handleCustomChange = (e: any) => {
      const val = e.detail;
      if (val === 'light' || val === 'dark') {
        setThemeState(val);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('satark-theme-change', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('satark-theme-change', handleCustomChange);
    };
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    localStorage.setItem(LEGACY_MOBILE_THEME_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent('satark-theme-change', { detail: nextTheme }));
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
