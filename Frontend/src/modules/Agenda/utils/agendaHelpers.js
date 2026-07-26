// ── Agenda Module Helpers ─────────────────────────────────────────────────

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function generateAllSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  return slots;
}

export const ALL_SLOTS = generateAllSlots();

export function slotToMin(s) {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

export function formatDur(start, end) {
  const diff = slotToMin(end) - slotToMin(start);
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60), m = diff % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
