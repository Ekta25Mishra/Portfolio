import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';

export default function ThemeControl() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('portfolio-theme');
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';
  return <button className="theme-control icon-button" type="button" onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>;
}
