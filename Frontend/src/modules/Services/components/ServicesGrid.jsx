import React from 'react';
import { CalendarPlus } from 'lucide-react';
import MediaCard from '../../../components/ui/MediaCard';

export default function ServicesGrid({ filteredServices, canManage, openEditModal, onDeleteRequest, onShare, navigate, revealImages }) {
  return (
    <div className="product-grid">
      {filteredServices.map(s => {
        return (
          <MediaCard
            key={s.id}
            item={s}
            variant="service"
            canManage={canManage}
            onEdit={openEditModal}
            onDelete={(item) => onDeleteRequest(item)}
            onAction={(service) => navigate(`/agenda?seller_id=${service.user_id}&service_id=${service.id}`)}
            onShare={(item) => onShare(item)}
            actionLabel="Agendar"
            actionIcon={CalendarPlus}
            revealImages={revealImages}
          />
        );
      })}
    </div>
  );
}
