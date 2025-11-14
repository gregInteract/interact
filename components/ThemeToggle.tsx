import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
      aria-label="Toggle theme"
    >
      <SunIcon className={`w-6 h-6 ${theme === 'light' ? 'hidden' : 'block'}`} />
      <MoonIcon className={`w-6 h-6 ${theme === 'dark' ? 'hidden' : 'block'}`} />
    </button>
  );
};
