import React from 'react';
import { useStore } from '../../store/useStore';
import SellerAgendaView from './components/SellerAgendaView';
import ClientAgendaView from './components/ClientAgendaView';

export default function Agenda() {
  const { currentUser, activeViewMode } = useStore();
  const userRole = currentUser?.role;
  const isSellerMode = userRole === 'admin' || (userRole === 'seller' && activeViewMode === 'seller');

  if (isSellerMode) return <SellerAgendaView />;
  return <ClientAgendaView />;
}
