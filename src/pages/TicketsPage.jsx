// src/pages/TicketsPage.jsx
import { useState } from 'react';
import TicketSidebar from '../components/tickets/TicketSidebar';
import ChatArea from '../components/chat/ChatArea';
import TicketPanel from '../components/tickets/TicketPanel';
import { useTicketStore } from '../stores/ticketStore';

export default function TicketsPage() {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const [painelAberto, setPainelAberto] = useState(false);

  return (
    <div className="flex h-full">
      <TicketSidebar />
      <ChatArea onTogglePainel={() => setPainelAberto(!painelAberto)} painelAberto={painelAberto} />
      {ticketAtivo && painelAberto && <TicketPanel onFechar={() => setPainelAberto(false)} />}
    </div>
  );
}