// src/stores/themeStore.js
import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create((set) => ({
  tema: getInitialTheme(),

  toggleTema: () =>
    set((state) => {
      const novoTema = state.tema === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', novoTema);
      document.documentElement.classList.toggle('dark', novoTema === 'dark');
      return { tema: novoTema };
    }),

  inicializarTema: () => {
    const tema = getInitialTheme();
    document.documentElement.classList.toggle('dark', tema === 'dark');
    set({ tema });
  },
}));
