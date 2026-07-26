import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { agendaClient, serviceClient } from '../../../utils/apiClient';
import { useToast } from '../../../components/ui/Toast';
import Helpers from '../../../utils/helpers';
import BookingCalendar from './BookingCalendar';
import BookingTimeSlots from './BookingTimeSlots';
import BookingConfirmation from './BookingConfirmation';

export default function ClientBookView() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedService, setSelectedService] = useState(searchParams.get('service_id') || '');
  const [sellerServices, setSellerServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);

  const sellerId = searchParams.get('seller_id');
  const sellerName = searchParams.get('seller_name') || '';

  useEffect(() => {
    if (sellerId) {
      serviceClient.list({ seller_id: sellerId })
        .then(data => setSellerServices(data))
        .catch(() => setSellerServices([]));
    }
  }, [sellerId]);

  useEffect(() => {
    if (sellerId && selectedDate) {
      setLoadingSlots(true);
      agendaClient.getSlots(sellerId, selectedDate, selectedService || undefined)
        .then(data => setSlots(data.slots || []))
        .catch(() => toast.error('Error al cargar horarios'))
        .finally(() => setLoadingSlots(false));
    }
  }, [sellerId, selectedDate, selectedService]);

  const handleSelectDate = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  }, []);

  const handleSelectSlot = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const handleConfirm = async () => {
    if (!selectedSlot || !sellerId) return;
    setBooking(true);
    try {
      await agendaClient.createAppointment({
        seller_id: sellerId,
        service_id: selectedService || null,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      });
      toast.success('Cita agendada exitosamente');
      setSelectedDate('');
      setSelectedSlot('');
      setSlots([]);
    } catch (e) {
      toast.error('Error al agendar cita');
    } finally {
      setBooking(false);
    }
  };

  const navigateDate = useCallback((newDate) => {
    setCurrentDate(newDate);
  }, []);

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h2 className="booking-title">Selecciona la fecha y hora</h2>
        {sellerName && <p className="booking-subtitle">con {sellerName}</p>}
      </div>

      {sellerServices.length > 0 && (
        <div className="booking-service-select">
          <label className="form-label">Servicio (opcional)</label>
          <select className="form-select" value={selectedService} onChange={e => setSelectedService(e.target.value)}>
            <option value="">Sin servicio específico</option>
            {sellerServices.map(s => (
              <option key={s.id} value={s.id}>{s.name} - {Helpers.formatCurrency(s.price)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="booking-layout">
        <BookingCalendar
          currentDate={currentDate}
          onNavigate={navigateDate}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
        <BookingTimeSlots
          date={selectedDate}
          slots={slots}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          loading={loadingSlots}
        />
      </div>

      <BookingConfirmation
        date={selectedDate}
        slot={selectedSlot}
        onConfirm={handleConfirm}
        booking={booking}
      />
    </div>
  );
}
