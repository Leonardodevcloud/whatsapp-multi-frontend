// src/stores/authStore.js
import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  usuario: null,
  carregando: true,
  logado: false,

  login: async (email, senha) => {
    const data = await api.post('/api/auth/login', { email, senha });
    set({ usuario: data.usuario, logado: true });
    return data.usuario;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignorar erro no logout
    }
    set({ usuario: null, logado: false });
  },

  verificarSessao: async () => {
    try {
      const usuario = await api.get('/api/auth/me');
      set({ usuario, logado: true, carregando: false });
      return usuario;
    } catch {
      set({ usuario: null, logado: false, carregando: false });
      return null;
    }
  },

  atualizarUsuario: (dados) => {
    set((state) => ({ usuario: { ...state.usuario, ...dados } }));
  },
}));
