import React, { useState, useEffect } from 'react';
import { 
  X, 
  Navigation, 
  MapPin, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Home, 
  Tag,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';
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

const EMPTY_CUSTOMER = {
  id_type: 'NIT', id_number: '', dv: '', business_name: '', trade_name: '',
  email: '', phone: '', tax_regime: 'Simplificado', is_tax_responsible: false,
  is_preferred: false, discount_type: 'percent', discount_value: 0,
  location: { country: '', country_code: '', state: '', state_code: '', city: '', neighborhood: '', address: '' }
};

// customerToEdit: si viene con datos, el modal entra en modo edición
// (título, botón y llamada a la API cambian de crear -> actualizar).
export default function CustomerModal({ isOpen, onClose, onSave, customerToEdit = null }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const isEditMode = !!customerToEdit;

  // Estado para capturar errores de duplicados/validación desde el backend
  const [validationErrors, setValidationErrors] = useState({});

  const [newCust, setNewCust] = useState(EMPTY_CUSTOMER);

  const [countryTaxInfo, setCountryTaxInfo] = useState(null); // { exists, default_tax_rate, is_active }
  const [checkingCountryTax, setCheckingCountryTax] = useState(false);
  const [customTaxRate, setCustomTaxRate] = useState('');

  // Prellenar el formulario cuando se abre en modo edición
  useEffect(() => {
    if (isOpen && customerToEdit) {
      setNewCust({
        id_type: customerToEdit.id_type || 'NIT',
        id_number: customerToEdit.id_number || '',
        dv: customerToEdit.dv || '',
        business_name: customerToEdit.business_name || '',
        trade_name: customerToEdit.trade_name || '',
        email: customerToEdit.email || '',
        phone: customerToEdit.phone || '',
        tax_regime: customerToEdit.tax_regime || 'Simplificado',
        is_tax_responsible: !!customerToEdit.is_tax_responsible,
        is_preferred: !!customerToEdit.is_preferred,
        discount_type: customerToEdit.discount_type || 'percent',
        discount_value: customerToEdit.discount_value || 0,
        location: {
          country: customerToEdit.location?.country || '',
          country_code: customerToEdit.location?.country_code || '',
          state: customerToEdit.location?.state || '',
          state_code: customerToEdit.location?.state_code || '',
          city: customerToEdit.location?.city || '',
          neighborhood: customerToEdit.location?.neighborhood || '',
          address: customerToEdit.location?.address || '',
        },
      });
    } else if (isOpen && !customerToEdit) {
      setNewCust(EMPTY_CUSTOMER);
    }
    setValidationErrors({});
    setCustomTaxRate('');
  }, [isOpen, customerToEdit]);

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

  useEffect(() => {
    const code = newCust.location?.country_code;
    if (!code) {
      setCountryTaxInfo(null);
      setCustomTaxRate('');
      return;
    }
    let cancelled = false;
    const fetchCountryTax = async () => {
      setCheckingCountryTax(true);
      try {
        const cs = await billingClient.getCountrySettings(code);
        if (cancelled) return;
        if (cs && cs.default_tax_rate !== undefined) {
          setCountryTaxInfo({ exists: true, default_tax_rate: parseFloat(cs.default_tax_rate), is_active: cs.is_active });
        } else {
          setCountryTaxInfo({ exists: false, default_tax_rate: 0, is_active: true });
        }
      } catch (err) {
        if (!cancelled) {
          setCountryTaxInfo({ exists: false, default_tax_rate: 0, is_active: true });
        }
      } finally {
        if (!cancelled) setCheckingCountryTax(false);
      }
    };
    fetchCountryTax();
    return () => { cancelled = true; };
  }, [newCust.location?.country_code]);

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

  // Construye el payload a enviar a la API a partir de newCust, saneando la
  // ubicación: si el usuario nunca completó ningún campo, se envía location=null
  // en vez de un objeto con strings vacíos (un country_code='' viola la FK
  // fk_locations_country_code_country_settings, que solo tolera NULL real).
  const buildCustomerPayload = () => {
    const loc = newCust.location || {};
    const hasAnyLocationData = !!(loc.country || loc.country_code || loc.state || loc.city || loc.neighborhood || loc.address);

    return {
      ...newCust,
      location: hasAnyLocationData
        ? { ...loc, country_code: loc.country_code || null }
        : null,
    };
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.business_name || !newCust.id_number || !newCust.email) {
      toast.error('Complete los campos obligatorios del cliente (Nombre, Documento, Email).');
      return;
    }
    try {
      setSubmitting(true);
      setValidationErrors({}); // Limpiar errores antes de enviar
      
      const code = newCust.location?.country_code;
      const rateNum = customTaxRate !== ''
        ? parseFloat(customTaxRate)
        : (countryTaxInfo?.exists ? countryTaxInfo.default_tax_rate : 0);

      const rateChanged = code && !isNaN(rateNum) &&
        (!countryTaxInfo?.exists || rateNum !== countryTaxInfo.default_tax_rate);

      if (rateChanged) {
        if (rateNum < 0 || rateNum > 100) {
          toast.error('El IVA debe estar entre 0 y 100.');
          setSubmitting(false);
          return;
        }
        await billingClient.upsertCountrySettings(code, {
          country_code: code,
          country_name: newCust.location.country,
          default_tax_rate: rateNum,
        });
      }

      const payload = buildCustomerPayload();

      let result;
      if (isEditMode) {
        result = await billingClient.updateCustomer(customerToEdit.id, payload);
        toast.success('Cliente actualizado exitosamente.');
      } else {
        result = await billingClient.createCustomer(payload);
        toast.success('Cliente creado exitosamente.');
      }
      onSave(result);
      resetForm();
    } catch (err) {
      console.error(err);

      const status = err.response?.status;
      const data = err.response?.data;

      const backendErrors = data?.detail?.errors || data?.errors || null;

      if (backendErrors) {
        setValidationErrors(backendErrors);
        toast.error('Corrija los campos duplicados o con errores en el formulario.');
      } else {
        let message = isEditMode ? 'Error al actualizar el cliente.' : 'Error al crear el cliente.';
        if (typeof data?.detail === 'string') {
          message = data.detail;
        } else if (typeof data?.detail === 'object' && data.detail !== null) {
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
    setNewCust(EMPTY_CUSTOMER);
    setValidationErrors({});
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('nested-modal-overlay')) {
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="nested-modal-overlay active" 
      onClick={handleOverlayClick}
    >
      <div className="nested-modal animate-scaleUp" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <h3 className="modal-title">{isEditMode ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
          <button className="modal-close" onClick={resetForm} disabled={submitting}>
            <X width="16" height="16" />
          </button>
        </div>

        {/* CUERPO */}
        <div className="nested-modal-body">
          <form onSubmit={handleSubmitCustomer} className="grid grid-2 gap-4">
            
           {/* Fila Única: Tipo Documento y Número de Documento (Proporción 1:2) */}
            <div className="grid-col-2 d-flex gap-3">
            
                {/* Tipo Documento */}
                <div className="form-group" style={{ flex: 45 }}>
                    <label className="form-label">Tipo Documento</label>
                    <div className="input-icon-wrapper">
                        <CreditCard className="input-icon" />
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
                </div>

                {/* Número de Documento y DV */}
                <div className="form-group" style={{ flex: 45 }}>
                    <label className="form-label">Número de Documento <span className="text-danger">*</span></label>
                    <div className="d-flex gap-2 w-100">
                        <div className="input-icon-wrapper flex-1">
                            <CreditCard className="input-icon" />
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
                        </div>
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
                    <label className="form-label">Razón Social / Nombre Completo <span className="text-danger">*</span></label>
                    <div className="input-icon-wrapper">
                        <Building2 className="input-icon" />
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Nombre comercial o legal"
                          value={newCust.business_name} 
                          onChange={(e) => setNewCust({ ...newCust, business_name: e.target.value })} 
                          required 
                        />
                    </div>
                </div>

                {/* Régimen Tributario */}
                <div className="form-group" style={{ flex: 35 }}>
                    <label className="form-label">Régimen Tributario</label>
                    <div className="input-icon-wrapper">
                        <ShieldCheck className="input-icon" />
                        <select className="form-select" value={newCust.tax_regime} onChange={(e) => setNewCust({ ...newCust, tax_regime: e.target.value })}>
                          <option value="Simplificado">Persona Natural / Simplificado</option>
                          <option value="Común">Responsable de IVA / Común</option>
                          <option value="Gran Contribuyente">Gran Contribuyente</option>
                        </select>
                    </div>
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
                    <label className="form-label">Email de Envío Factura <span className="text-danger">*</span></label>
                    <div className="input-icon-wrapper">
                        <Mail className="input-icon" />
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
                    </div>
                    {validationErrors.email && (
                      <span className="text-danger text-xs mt-1" style={{ display: 'block', fontSize: '11px' }}>
                        {validationErrors.email[0]}
                      </span>
                    )}
                </div>
                {/* Teléfono */}
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Número de Contacto</label>
                    <div className="input-icon-wrapper">
                        <Phone className="input-icon" />
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
                    </div>
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
                variant="embedded"
              />
            </div>
            <div className="grid-col-2 d-flex gap-3">
                {/* Dirección */}
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Dirección</label>
                    <div className="input-icon-wrapper">
                        <Home className="input-icon" />
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Calle 100 # 15-20"
                          value={newCust.location?.address || ''} 
                          onChange={(e) => setNewCust({ ...newCust, location: { ...newCust.location, address: e.target.value } })} 
                        />
                    </div>
                </div>

                {/* IVA del país — Con soporte de iconos vectoriales interactivos */}
                {newCust.location?.country_code && (
                  <div className="form-group" style={{ flex: '0 0 150px' }}>
                    <label className="form-label">
                      IVA · {newCust.location?.country || 'país'}
                    </label>
                    <div
                      className="country-tax-card"
                      data-state={checkingCountryTax ? 'checking' : countryTaxInfo?.exists ? 'configured' : 'unconfigured'}
                    >
                      <span
                        className="country-tax-card-icon country-tax-icon-tooltip"
                        data-tooltip={
                          checkingCountryTax
                            ? 'Verificando...'
                            : countryTaxInfo?.exists
                              ? 'Configurado'
                              : 'Se creará al registrar'
                        }
                      >
                        {checkingCountryTax ? (
                          <Loader2 className="animate-spin" width="13" height="13" />
                        ) : countryTaxInfo?.exists ? (
                          <Check width="13" height="13" />
                        ) : (
                          <AlertTriangle width="13" height="13" />
                        )}
                      </span>
                      <div className="country-tax-input-pill">
                        <input
                          type="number"
                          className="country-tax-input"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder={countryTaxInfo?.exists ? String(countryTaxInfo.default_tax_rate) : '0'}
                          value={customTaxRate}
                          onChange={(e) => setCustomTaxRate(e.target.value)}
                          disabled={checkingCountryTax}
                        />
                        <span className="country-tax-input-suffix">%</span>
                      </div>
                    </div>
                  </div>
                )}
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
                    <label className="form-label">Tipo de Descuento</label>
                    <div className="input-icon-wrapper">
                        <Tag className="input-icon" />
                        <select className="form-select" value={newCust.discount_type || 'percent'}
                            onChange={(e) => setNewCust({ ...newCust, discount_type: e.target.value })}>
                            <option value="percent">Porcentaje (%)</option>
                            <option value="fixed">Monto Fijo ($)</option>
                        </select>
                    </div>
                    </div>

                    {/* Valor de Descuento */}
                    <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">
                        {newCust.discount_type === 'fixed' ? 'Monto de Descuento ($)' : 'Porcentaje de Descuento (%)'}
                    </label>
                    <div className="input-icon-wrapper">
                        <Tag className="input-icon" />
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
                </div>
              </>
            )}

            <div className="grid-col-2 d-flex gap-3 justify-content-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm} disabled={submitting}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting
                  ? (isEditMode ? 'Guardando...' : 'Registrando...')
                  : (isEditMode ? 'Guardar Cambios' : 'Registrar Cliente')}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}