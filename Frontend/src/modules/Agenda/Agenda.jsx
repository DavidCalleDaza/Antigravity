import React from 'react';
import { useStore } from '../../store/useStore';
import SellerAgendaView from './components/SellerAgendaView';
import ClientAgendaView from './components/ClientAgendaView';

export default function Agenda() {
  const { currentUser } = useStore();
  const userRole = currentUser?.role;
  const isSeller = userRole === 'admin' || userRole === 'seller';

  if (isSeller) return <SellerAgendaView />;
  return <ClientAgendaView />;
}
