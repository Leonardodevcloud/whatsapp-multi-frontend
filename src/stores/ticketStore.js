// src/stores/ticketStore.js
import { create } from 'zustand';

export const useTicketStore = create((set, get) => ({
  ticketAtivo: null,
  filtros: {
    status: null,
    filaId: null,
    busca: '',
  },

  selecionarTicket: (ticket) => set({ ticketAtivo: ticket }),
  limparTicketAtivo: () => set({ ticketAtivo: null }),

  setFiltro: (campo, valor) =>
    set((state) => ({
      filtros: { ...state.filtros, [campo]: valor },
    })),

  limparFiltros: () =>
    set({
      filtros: { status: null, filaId: null, busca: '' },
    }),
}));
