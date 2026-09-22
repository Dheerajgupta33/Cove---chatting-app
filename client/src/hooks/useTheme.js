import { useEffect } from 'react';
import { useSelector } from 'react-redux';

// Keeps <html class="dark"> in sync with the chosen theme (system follows the OS setting live).
export function useTheme() {
  const theme = useSelector((s) => s.ui.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0b16' : '#ecf0f8');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export const isDarkNow = () => document.documentElement.classList.contains('dark');
