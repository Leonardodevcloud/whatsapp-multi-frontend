// src/pages/TicketsPage.jsx
import TicketSidebar from '../components/tickets/TicketSidebar';
import ChatArea from '../components/chat/ChatArea';
import TicketPanel from '../components/tickets/TicketPanel';
import { useTicketStore } from '../stores/ticketStore';

export default function TicketsPage() {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);

  return (
    <div className="flex h-full">
      <TicketSidebar />
      <ChatArea />
      {ticketAtivo && <TicketPanel />}
    </div>
  );
}
