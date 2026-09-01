import React from 'react';
import { CalendarPlus, Wrench } from 'lucide-react';
import MediaCard from '../../../components/ui/MediaCard';

export default function ServicesGrid({
  filteredServices,
  canManage,
  isAdmin = false,
  selectedIds = [],
  onToggleSelect,
  openEditModal,
  onDeleteRequest,
  onShare,
  navigate,
  revealImages
}) {
  return (
    <div className="product-grid">
      {filteredServices.length === 0 ? (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <div className="empty-state-icon"><Wrench width="48" height="48" /></div>
          <div className="empty-state-title">Sin servicios</div>
          <div className="empty-state-text">No hay servicios que coincidan con los filtros.</div>
        </div>
      ) : (
        filteredServices.map(s => {
          return (
            <MediaCard
              key={s.id}
              item={s}
              variant="service"
              canManage={canManage}
              selectable={isAdmin}
              isSelected={selectedIds.includes(s.id)}
              onToggleSelect={onToggleSelect}
              onEdit={openEditModal}
              onDelete={(item) => onDeleteRequest(item)}
              onAction={(service) => navigate(`/agenda?seller_id=${service.user_id}&service_id=${service.id}`)}
              actionLabel="Agendar"
              actionIcon={CalendarPlus}
              revealImages={revealImages}
            />
          );
        })
      )}
    </div>
  );
}

