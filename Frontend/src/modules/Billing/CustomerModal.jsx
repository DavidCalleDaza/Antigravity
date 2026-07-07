import React, { useState } from 'react';
import { X, Navigation, MapPin } from 'lucide-react';
import { billingClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import LocationSelects from '../../components/ui/LocationSelects';
import "../../../css/pages/CustomerModal.css";

const calculateDV = (nit) => {
  if (!nit) return '';
  const cleanNit = nit.toString().replace(/\D/g, '');
  if (!cleanNit) return '';
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  for (let i = 0; i < cleanNit.length; i++) {
    sum += parseInt(cleanNit[cleanNit.length - 1 - i]) * weights[i];
  }
  const mod = sum % 11;
  return mod === 0 || mod === 1 ? mod.toString() : (11 - mod).toString();
};

export default function CustomerModal({ isOpen, onClose, onSave }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Estado para capturar errores de duplicados/validación desde el backend
  const [validationErrors, setValidationErrors] = useState({});

  const [newCust, setNewCust] = useState({
    id_type: 'NIT', id_number: '', dv: '', business_name: '', trade_name: '',
    email: '', phone: '', tax_regime: 'Simplificado', is_tax_responsible: false,
    is_preferred: false, discount_type: 'percent', discount_value: 0,
    location: { country: '', country_code: '', state: '', state_code: '', city: '', neighborhood: '', address: '' }
  });

  const handleLocationChange = (loc) => {
    setNewCust(prev => ({
      ...prev,
      location: {
        ...prev.location,
        country: loc.country,
        country_code: loc.countryCode,
        state: loc.state,
        state_code: loc.stateCode,
        city: loc.city,
        neighborhood: loc.neighborhood,
      }
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no está soportada por tu navegador.', 'Error');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            setNewCust(prev => ({
              ...prev,
              location: {
                ...prev.location,
                country: data.address.country || prev.location.country,
                country_code: data.address.country_code ? data.address.country_code.toUpperCase() : prev.location.country_code,
                state: data.address.state || data.address.region || prev.location.state,
                state_code: '',
                city: data.address.city || data.address.town || data.address.village || prev.location.city,
                neighborhood: data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.quarter || data.address.hamlet || prev.location.neighborhood,
                address: data.address.road ? `${data.address.road} ${data.address.house_number || ''}`.trim() : prev.location.address
              }
            }));
            toast.success('Ubicación obtenida con éxito.', 'GPS');
          } else {
            toast.error('No se pudo resolver la ubicación.', 'Error');
          }
        } catch (error) {
          toast.error('Error al conectarse al servicio de mapas.', 'Error');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Permiso denegado o no se pudo obtener la ubicación.', 'Error GPS');
      }
    );
  };

  if (!isOpen) return null;

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.business_name || !newCust.id_number || !newCust.email) {
      toast.error('Complete los campos obligatorios del cliente (Nombre, Documento, Email).');
      return;
    }
    try {
      setSubmitting(true);
      setValidationErrors({}); // Limpiar errores antes de enviar
      
      const created = await billingClient.createCustomer(newCust);
      toast.success('Cliente creado exitosamente.');
      onSave(created); 
      resetForm();
    } catch (err) {
      console.error(err);

      const status = err.response?.status;
      const data = err.response?.data;

      // Intenta extraer errores estructurados venga como venga (422 estándar o 400 con objeto)
      const backendErrors = data?.detail?.errors || data?.errors || null;

      if (backendErrors) {
        setValidationErrors(backendErrors);
        toast.error('Corrija los campos duplicados o con errores en el formulario.');
      } else {
        // Extrae siempre un STRING legible, nunca un objeto
        let message = 'Error al crear el cliente.';
        if (typeof data?.detail === 'string') {
          message = data.detail;
        } else if (typeof data?.detail === 'object' && data.detail !== null) {
          // Si detail es un objeto {errors: {...}}, saca el primer mensaje disponible
          const firstField = Object.values(data.detail.errors || data.detail)[0];
          message = Array.isArray(firstField) ? firstField[0] : String(firstField || message);
        } else if (err.message) {
          message = err.message;
        }
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewCust({
      id_type: 'NIT', id_number: '', dv: '', business_name: '', trade_name: '',
      email: '', phone: '', tax_regime: 'Simplificado', is_tax_responsible: false,
      is_preferred: false, discount_type: 'percent', discount_value: 0,
      location: { country: '', country_code: '', state: '', state_code: '', city: '', neighborhood: '', address: '' }
    });
    setValidationErrors({}); // Limpiar estado de errores
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('nested-modal-overlay')) {
      resetForm();
    }
  };

 return (
    <div 
      className="nested-modal-overlay active" 
      onClick={(e) => {
        e.stopPropagation(); 
        if (e.target.classList.contains('nested-modal-overlay')) {
          resetForm();
        }
      }}
    >
      <div className="nested-modal animate-scaleUp" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <h3 className="modal-title">Registrar Nuevo Cliente</h3>
          <button className="modal-close" onClick={resetForm} disabled={submitting}>
            <X width="16" height="16" />
          </button>
        </div>

        {/* CUERPO */}
        <div className="nested-modal-body">
          <form onSubmit={handleCreateCustomer} className="grid grid-2 gap-4">
            
           {/* Fila Única: Tipo Documento y Número de Documento (Proporción 1:2) */}
            <div className="grid-col-2 d-flex gap-3">
            
                {/* Tipo Documento */}
                <div className="form-group" style={{ flex: 45 }}>
                    <label className="form-label mb-1">Tipo Documento</label>
                    <select className="form-select" value={newCust.id_type}
                    onChange={(e) => {
                        const t = e.target.value;
                        setNewCust({ ...newCust, id_type: t, dv: t === 'NIT' ? calculateDV(newCust.id_number) : '' });
                    }}>
                    <option value="NIT">NIT (Empresa)</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PP">Pasaporte</option>
                    </select>
                </div>

                {/* Número de Documento y DV */}
                <div className="form-group" style={{ flex: 45 }}>
                    <label className="form-label mb-1">Número de Documento <span className="text-danger">*</span></label>
                    <div className="d-flex gap-2 w-100">
                    <input 
                        type="text" 
                        className={`form-control input-id-number ${validationErrors.id_number ? 'is-invalid' : ''}`} 
                        placeholder="Ej: 900800700"
                        value={newCust.id_number}
                        onChange={(e) => {
                        const v = e.target.value;
                        setNewCust({ ...newCust, id_number: v, dv: newCust.id_type === 'NIT' ? calculateDV(v) : newCust.dv });
                        if (validationErrors.id_number) setValidationErrors({ ...validationErrors, id_number: null });
                        }}
                        required 
                    />
                    {newCust.id_type === 'NIT' && (
                        <input 
                        type="text" 
                        className="form-control text-center input-dv" 
                        placeholder="DV"
                        value={newCust.dv} 
                        readOnly 
                        title="Dígito de Verificación" 
                        />
                    )}
                    </div>
                    {validationErrors.id_number && (
                      <span className="text-danger text-xs mt-1" style={{ display: 'block', fontSize: '11px' }}>
                        {validationErrors.id_number[0]}
                      </span>
                    )}
                </div>
            </div>

           {/* Fila Única: Razón Social, Régimen Tributario y Responsable de IVA */}
            <div className="grid-col-2 d-flex gap-3">
                {/* Razón Social / Nombre Completo */}
                <div className="form-group" style={{ flex: 45 }}>
                    <label className="form-label mb-1">Razón Social / Nombre Completo <span className="text-danger">*</span></label>
                    <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Nombre comercial o legal"
                    value={newCust.business_name} 
                    onChange={(e) => setNewCust({ ...newCust, business_name: e.target.value })} 
                    required 
                    />
                </div>

                {/* Régimen Tributario */}
                <div className="form-group" style={{ flex: 35 }}>
                    <label className="form-label mb-1">Régimen Tributario</label>
                    <select className="form-select" value={newCust.tax_regime} onChange={(e) => setNewCust({ ...newCust, tax_regime: e.target.value })}>
                    <option value="Simplificado">Persona Natural / Simplificado</option>
                    <option value="Común">Responsable de IVA / Común</option>
                    <option value="Gran Contribuyente">Gran Contribuyente</option>
                    </select>
                </div>

                {/* Responsable de IVA */}
                <div className="form-group d-flex align-items-center" style={{ flex: 20, height: '34px', marginTop: 'auto' }}>
                    <label 
                        className="d-flex align-items-center gap-2 cursor-pointer select-none custom-tooltip-container"
                        data-tooltip="Responsable de IVA: Persona o empresa obligada a facturar, cobrar y declarar este impuesto ante la DIAN."
                    >
                        <input 
                        type="checkbox" 
                        checked={newCust.is_tax_responsible}
                        onChange={(e) => setNewCust({ ...newCust, is_tax_responsible: e.target.checked })}
                        className="form-checkbox" 
                        />
                        <span className="text-sm">Responsable de IVA</span>
                    </label>
                    </div>
                </div>

            {/* Fila Única: Email de Envío Factura y Teléfono (Proporción 50:50) */}
            <div className="grid-col-2 d-flex gap-3">
                {/* Email de Envío Factura */}
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label mb-1">Email de Envío Factura <span className="text-danger">*</span></label>
                    <input 
                    type="email" 
                    className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`} 
                    placeholder="cliente@correo.com"
                    value={newCust.email} 
                    onChange={(e) => {
                      setNewCust({ ...newCust, email: e.target.value });
                      if (validationErrors.email) setValidationErrors({ ...validationErrors, email: null });
                    }} 
                    required 
                    />
                    {validationErrors.email && (
                      <span className="text-danger text-xs mt-1" style={{ display: 'block', fontSize: '11px' }}>
                        {validationErrors.email[0]}
                      </span>
                    )}
                </div>
                {/* Teléfono */}
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label mb-1">Número de Contacto</label>
                    <input 
                    type="text" 
                    className={`form-control ${validationErrors.phone ? 'is-invalid' : ''}`} 
                    placeholder="300 123 4567"
                    value={newCust.phone} 
                    onChange={(e) => {
                      setNewCust({ ...newCust, phone: e.target.value });
                      if (validationErrors.phone) setValidationErrors({ ...validationErrors, phone: null });
                    }} 
                    />
                    {validationErrors.phone && (
                      <span className="text-danger text-xs mt-1" style={{ display: 'block', fontSize: '11px' }}>
                        {validationErrors.phone[0]}
                      </span>
                    )}
                </div>
            </div>

           {/* Fila: Ubicación */}
            <div className="grid-col-2" style={{ gridColumn: 'span 2' }}>
              <div className="d-flex justify-content-between align-items-center mb-3" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <h4 className="m-0 d-flex align-items-center gap-2" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  <MapPin width="18" height="18" style={{ color: 'var(--primary)' }} /> Información de Ubicación
                </h4>
                <button
                  type="button"
                  className="btn btn-outline btn-sm d-flex align-items-center"
                  onClick={handleGetLocation}
                  disabled={gettingLocation || submitting}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                >
                  {gettingLocation ? (
                    <><span className="animate-spin" style={{ marginRight: '0.5rem', display: 'inline-block' }}>◌</span> Buscando GPS...</>
                  ) : (
                    <><Navigation width="14" height="14" style={{ marginRight: '0.25rem' }} /> Autocompletar con GPS</>
                  )}
                </button>
              </div>
            </div>
            <div className="grid-col-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <LocationSelects
                countryValue={newCust.location?.country}
                stateValue={newCust.location?.state}
                cityValue={newCust.location?.city}
                neighborhoodValue={newCust.location?.neighborhood}
                onLocationChange={handleLocationChange}
                disabled={submitting || gettingLocation}
              />
            </div>
            <div className="form-group grid-col-2">
                <label className="form-label mb-1">Dirección</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Calle 100 # 15-20"
                  value={newCust.location?.address || ''} 
                  onChange={(e) => setNewCust({ ...newCust, location: { ...newCust.location, address: e.target.value } })} 
                />
            </div>

            <div className="form-group grid-col-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
              <label className="d-flex align-items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={newCust.is_preferred || false}
                  onChange={(e) => setNewCust({ ...newCust, is_preferred: e.target.checked })}
                  className="form-checkbox" />
                <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>★ Cliente Preferencial</span>
              </label>
            </div>

            {newCust.is_preferred && (
              <>
                {/* Fila Única Condicional: Tipo de Descuento y Valor de Descuento (Proporción 50:50) */}
                <div className="grid-col-2 d-flex gap-3">
    
                    {/* Tipo de Descuento */}
                    <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label mb-1">Tipo de Descuento</label>
                    <select className="form-select" value={newCust.discount_type || 'percent'}
                        onChange={(e) => setNewCust({ ...newCust, discount_type: e.target.value })}>
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto Fijo ($)</option>
                    </select>
                    </div>

                    {/* Valor de Descuento */}
                    <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label mb-1">
                        {newCust.discount_type === 'fixed' ? 'Monto de Descuento ($)' : 'Porcentaje de Descuento (%)'}
                    </label>
                    <input 
                        type="number" 
                        className="form-control"
                        placeholder={newCust.discount_type === 'fixed' ? '50000' : '10'}
                        value={newCust.discount_value === 0 ? '' : newCust.discount_value} 
                        min="0"
                        max={newCust.discount_type === 'percent' ? 100 : undefined}
                        onFocus={(e) => e.target.select()} 
                        onChange={(e) => setNewCust({ ...newCust, discount_value: parseFloat(e.target.value) || 0 })} 
                    />
                    </div>
                </div>
              </>
            )}

            <div className="grid-col-2 d-flex gap-3 justify-content-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm} disabled={submitting}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registrando...' : 'Registrar Cliente'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}