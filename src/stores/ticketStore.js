// src/stores/ticketStore.js
import { create } from 'zustand';

export const useTicketStore = create((set, get) => ({
  ticketAtivo: null,
  abaAtiva: 'fila', // 'meusChats' | 'fila' | 'emAtendimento'
  filtros: {
    status: null,
    filaId: null,
    busca: '',
  },

  selecionarTicket: (ticket) => set({ ticketAtivo: ticket }),
  limparTicketAtivo: () => set({ ticketAtivo: null }),
  setAba: (aba) => set({ abaAtiva: aba }),

  setFiltro: (campo, valor) =>
    set((state) => ({
      filtros: { ...state.filtros, [campo]: valor },
    })),

  limparFiltros: () =>
    set({ filtros: { status: null, filaId: null, busca: '' } }),
}));