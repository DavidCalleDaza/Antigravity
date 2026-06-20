import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash, Save, Send, UserPlus, Search, X } from 'lucide-react';
import { FcPlus, FcEmptyTrash} from "react-icons/fc";
import { AiOutlineClear } from "react-icons/ai";
import { billingClient, productClient, serviceClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Helpers from '../../utils/helpers';
import "../../../css/pages/InvoiceModal.css";

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

export default function InvoiceForm({ isOpen, onClose, onSave, invoiceToEdit = null }) {
  const toast = useToast();
  
  // Lists fetched from DB
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [searchCust, setSearchCust] = useState('');
  
  // Loading states
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Show new customer sub-form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  
  // Invoice form state
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Contado'); // Predeterminado de tu DB: 'Contado'
  const [paymentMeans, setPaymentMeans] = useState('10');      // Predeterminado de tu DB: '10' (Efectivo)
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState([
    { description: '', code: '', unit: 'UND', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19.00 }
  ]);

  // New customer form state
  const [newCust, setNewCust] = useState({
    id_type: 'NIT',
    id_number: '',
    dv: '',
    business_name: '',
    trade_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    department: '',
    tax_regime: 'Simplificado',
    is_tax_responsible: false
  });

  //Carga de datos y limpieza de estados al abrir/cerrar el modal
  useEffect(() => {
    if (!isOpen) return; // Retorno temprano: si no está abierto, no ejecuta nada

    loadInitialData();

    const initializeInvoice = async () => {
      if (!invoiceToEdit) {
        // 1. NUEVA FACTURA (LIMPIEZA DE ESTADOS)
        setCustomerId('');
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setDueDate(defaultDue.toISOString().split('T')[0]);
        setPaymentMethod('Contado');
        setPaymentMeans('10');
        setNotes('');
        setItems([
          { description: '', code: '', unit: 'UND', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19.00 }
        ]);
        return;
      }

      // 2. CARGA DE DATOS GENERALES (Tabla 'invoices')
      setCustomerId(invoiceToEdit.customer_id || '');
      setDueDate(invoiceToEdit.due_date ? invoiceToEdit.due_date.split('T')[0] : '');
      setPaymentMethod(invoiceToEdit.payment_method || 'Contado');
      setPaymentMeans(invoiceToEdit.payment_means || '10');
      setNotes(invoiceToEdit.notes || '');

      // Intentamos extraer ítems directamente del objeto por si ya vienen pre-cargados
      let rawItems = 
        invoiceToEdit.items || 
        invoiceToEdit.invoice_items || 
        invoiceToEdit.details || 
        invoiceToEdit.invoice_details || 
        invoiceToEdit.line_items || 
        invoiceToEdit.lines || 
        [];

      // 3. CONSULTA EN CASCADA PARA TRAER LOS DATOS DESDE LA TABLA 'invoice_items'
      if (rawItems.length === 0 && invoiceToEdit.id) {
        try {
          // Intento A: Traer la factura completa con sus relaciones (joins)
          let fullInvoice = null;
          if (typeof billingClient.getInvoice === 'function') {
            fullInvoice = await billingClient.getInvoice(invoiceToEdit.id);
          } else if (typeof billingClient.get === 'function') {
            fullInvoice = await billingClient.get(invoiceToEdit.id);
          }

          if (fullInvoice) {
            setCustomerId(fullInvoice.customer_id || '');
            setDueDate(fullInvoice.due_date ? fullInvoice.due_date.split('T')[0] : '');
            setPaymentMethod(fullInvoice.payment_method || 'Contado');
            setPaymentMeans(fullInvoice.payment_means || '10');
            setNotes(fullInvoice.notes || '');
            
            rawItems = 
              fullInvoice.items || 
              fullInvoice.invoice_items || 
              fullInvoice.details || 
              fullInvoice.invoice_details || 
              fullInvoice.line_items || 
              fullInvoice.lines || 
              [];
          }
        } catch (e) {
          console.warn("Intento de consulta de factura completa fallido, probando consultas directas de ítems...", e);
        }

        // Intento B: Si sigue vacío, llamamos a los métodos específicos de la tabla relacional independiente
        if (rawItems.length === 0) {
          try {
            if (typeof billingClient.getInvoiceItems === 'function') {
              rawItems = await billingClient.getInvoiceItems(invoiceToEdit.id);
            } else if (typeof billingClient.listInvoiceItems === 'function') {
              rawItems = await billingClient.listInvoiceItems(invoiceToEdit.id);
            } else if (typeof billingClient.getInvoiceDetails === 'function') {
              rawItems = await billingClient.getInvoiceDetails(invoiceToEdit.id);
            } else if (typeof billingClient.getItems === 'function') {
              rawItems = await billingClient.getItems(invoiceToEdit.id);
            } else if (typeof billingClient.getLines === 'function') {
              rawItems = await billingClient.getLines(invoiceToEdit.id);
            }
          } catch (err) {
            console.error("No se pudo obtener la relación de ítems desde los métodos del cliente de API:", err);
          }
        }
      }

      // 4. MAPEO DE LOS CAMPOS DE LA TABLA RELACIONAL 'invoice_items'
      let parsedItems = rawItems.map(item => {
        const qty = item.quantity ?? item.quantity_ordered ?? item.qty ?? 1;
        const price = item.unit_price ?? item.price ?? item.unitPrice ?? item.value ?? 0;
        const disc = item.discount ?? item.discount_value ?? item.discountValue ?? 0;
        const tax = item.tax_rate ?? item.taxRate ?? item.tax_percent ?? item.tax ?? item.iva ?? 19.00;
        const desc = item.description ?? item.name ?? item.item_name ?? '';
        const prodId = item.product_id ?? item.productId ?? item.product_select ?? '';
        const servId = item.service_id ?? item.serviceId ?? item.service_select ?? '';

        return {
          description: desc,
          code: item.code || item.sku || '',
          unit: item.unit || 'UND',
          quantity: parseFloat(qty),
          unit_price: parseFloat(price),
          discount: parseFloat(disc),
          tax_rate: parseFloat(tax),
          product_id: prodId,
          service_id: servId
        };
      });

      // Aseguramos una línea mínima de edición por defecto si el resultado final sigue vacío
      if (parsedItems.length === 0) {
        parsedItems = [{ description: '', code: '', unit: 'UND', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19.00 }];
      }

      setItems(parsedItems);
    };

    initializeInvoice();
  }, [isOpen, invoiceToEdit]);

/*  Carga de datos del backend */
  const loadInitialData = async () => {
    setLoadingCustomers(true);
    try {
      const [custData, prodData, servData] = await Promise.all([
        billingClient.listCustomers(),
        productClient.list({ limit: 100 }),
        serviceClient.list({ limit: 100 })
      ]);
      setCustomers(custData);
      setProducts(prodData);
      setServices(servData);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos iniciales para la factura.');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchCust) return customers;
    return customers.filter(c => 
      c.business_name.toLowerCase().includes(searchCust.toLowerCase()) ||
      c.id_number.includes(searchCust)
    );
  }, [customers, searchCust]);

  // Invoice calculations
  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let tax_total = 0;
    const taxesGrouped = {}; // <- Esencial para guardar los totales por tarifa (19%, 5%, etc.)
    
    const safeItems = Array.isArray(items) ? items : [];
    
    safeItems.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const disc = parseFloat(item.discount) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      
      const lineSub = (qty * price) - disc;
      const lineTax = lineSub * (taxRate / 100);
      
      subtotal += lineSub;
      discount += disc;
      tax_total += lineTax;

      // Agrupar los IVAs que son mayores a 0%
      if (taxRate > 0) {
        taxesGrouped[taxRate] = (taxesGrouped[taxRate] || 0) + lineTax;
      }
    });

    return {
      subtotal,
      discount,
      tax_base: subtotal,
      tax_total,
      taxesGrouped, // <- Esencial para que el JSX del sidebar pueda leerlo
      total: subtotal + tax_total-discount
    };
  }, [items]);

  // Items manipulation
  const handleAddItem = () => {
    setItems([
      ...items,
      { description: '', code: '', unit: 'UND', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19.00 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.warning('La factura debe tener al menos una línea de detalle.');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleClearItems = (index = null) => {
    if (typeof index === 'number' && !index?.target) {
      const updated = [...items];
      updated[index] = { description: '', code: '', unit: 'UND', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19.00 };
      setItems(updated);
      toast.info('Línea limpiada');
    } else {
      setItems([
        { description: '', code: '', unit: 'UND', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19.00 }
      ]);
      toast.info('Tabla limpiada');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    
    if (field === 'product_select' && value) {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index] = {
          ...updated[index],
          description: prod.name,
          code: prod.sku || '',
          unit_price: parseFloat(prod.price) || 0,
          quantity: 1,
          product_id: prod.id,
          service_id: undefined
        };
      }
    } else if (field === 'service_select' && value) {
      const serv = services.find(s => s.id === value);
      if (serv) {
        updated[index] = {
          ...updated[index],
          description: serv.name,
          code: serv.code || '',
          unit_price: parseFloat(serv.price) || 0,
          quantity: 1,
          service_id: serv.id,
          product_id: undefined
        };
      }
    } else {
      updated[index][field] = value;
    }
    
    setItems(updated);
  };

  // Create Customer Inline
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.business_name || !newCust.id_number || !newCust.email) {
      toast.error('Complete los campos obligatorios del cliente (Nombre, Documento, Email).');
      return;
    }

    try {
      setSubmitting(true);
      const created = await billingClient.createCustomer(newCust);
      toast.success('Cliente creado exitosamente.');
      setCustomers([created, ...customers]);
      setCustomerId(created.id);
      setShowNewCustomer(false);
      setNewCust({
        id_type: 'NIT',
        id_number: '',
        dv: '',
        business_name: '',
        trade_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        department: '',
        tax_regime: 'Simplificado',
        is_tax_responsible: false
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al crear el cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Invoice
  const handleSubmitInvoice = async (statusType) => {
    if (!customerId) {
      toast.error('Debe seleccionar un cliente.');
      return;
    }
    
    const invalidItem = items.some(item => !item.description || item.unit_price < 0 || item.quantity <= 0);
    if (invalidItem) {
      toast.error('Complete todas las líneas de detalle con descripciones válidas, cantidades > 0 y precios >= 0.');
      return;
    }

    const payload = {
      customer_id: customerId,
      due_date: dueDate || null,
      payment_method: paymentMethod,
      payment_means: paymentMeans,
      notes: notes || null,
      status: statusType,
      items: items.map(i => ({
        description: i.description,
        code: i.code || null,
        unit: i.unit,
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price),
        discount: parseFloat(i.discount) || 0,
        tax_rate: parseFloat(i.tax_rate),
        product_id: i.product_id || null,
        service_id: i.service_id || null
      }))
    };

    setSubmitting(true);
    try {
      let result;
      if (invoiceToEdit) {
        result = await billingClient.updateInvoice(invoiceToEdit.id, payload);
        toast.success('Factura actualizada exitosamente.');
      } else {
        result = await billingClient.createInvoice(payload);
        toast.success(`Factura ${result.full_number} creada exitosamente.`);
      }
      onSave(result);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al guardar la factura.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      if (showNewCustomer) {
        setShowNewCustomer(false);
      } else {
        onClose();
      }
    }
  };
  

  /* Obtener las tarifas de IVA únicas mayores a 0% usadas actualmente en los ítems
  const activeRates = [...new Set(items.map(item => parseFloat(item.tax_rate) || 0).filter(rate => rate > 0))];

    // Determinar el texto dinámico de la etiqueta
    let ivaLabel = "IVA (0%)";
    if (activeRates.length === 1) {
      ivaLabel = `IVA (${activeRates[0]}%)`;
    } else if (activeRates.length > 1) {
      ivaLabel = "IVA (Múltiple)";
  }*/

  return (
    <div className="modal-overlay active" onClick={handleOverlayClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal modal-lg animate-scaleUp">
        
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">
            {showNewCustomer 
              ? 'Registrar Nuevo Cliente' 
              : (invoiceToEdit ? `Editar Factura Borrador ${invoiceToEdit.full_number}` : 'Nueva Factura de Venta')
            }
          </h3>
          <button className="modal-close" onClick={() => showNewCustomer ? setShowNewCustomer(false) : onClose()} disabled={submitting}>
            <X width="16" height="16" />
          </button>
        </div>

        {/* Content */}
        <div className={`modal-body ${showNewCustomer ? 'customer-only' : ''}`}>
          
          {!showNewCustomer ? (
            <>
              {/*Formulario de la Factura */}
              <div className="invoice-form-column">
                
                {/* 1. Customer Section */}
                <div className="customer-section">
  
                  {/* Column 1: Título (Extremo Izquierdo) */}
                  <div className="customer-title-block">
                    <span className="font-bold customer-title">Información del Cliente</span>
                  </div>
                  
                  {/* Column 2: Campos con su etiqueta (Centro) */}
                  <div className="customer-fields-block">
                    <label className="form-label">Buscar y Seleccionar Cliente <span className="text-danger">*</span></label>
                    <div className="customer-inputs-row">
                      
                      {/* Buscador de Cliente */}
                      <div className="input-group">
                        <span className="input-icon-left">
                          <Search size={14} />
                        </span>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Escribe Nombre o NIT..."
                          value={searchCust}
                          onChange={(e) => setSearchCust(e.target.value)}
                        />
                      </div>

                      {/* Selector de Cliente */}
                      <select 
                        className="form-select" 
                        value={customerId} 
                        onChange={(e) => setCustomerId(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {filteredCustomers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.business_name} ({c.id_type} {c.id_number})
                          </option>
                        ))}
                      </select>

                    </div>
                  </div>

                  {/* Column 3: Botón de Acción (Extremo Derecho) */}
                  <div className="customer-button-block">
                    <button 
                      type="button" 
                      className="btn-new-customer" 
                      onClick={() => setShowNewCustomer(true)}
                    >
                      <FcPlus size={14} />
                      Nuevo Cliente
                    </button>
                  </div>
                </div>

                {/* 2. Detalles de Pago y Fechas */}
                <div className="card-raised d-flex flex-column gap-2">
                  <span className="font-bold text-sm text-primary">Detalles de Pago y Fechas</span>
                  <div className="grid grid-3 gap-0">
                    <div className="form-group">
                      <label className="form-label g-0">Método de Pago</label>
                      <select 
                        className="form-select" 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Contado">Contado</option>
                        <option value="Crédito">Crédito</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label mb-1">Medio de Pago</label>
                      <select 
                        className="form-select" 
                        value={paymentMeans} 
                        onChange={(e) => setPaymentMeans(e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="10">10 - Efectivo</option>
                        <option value="42">42 - Consignación Bancaria</option>
                        <option value="47">47 - Transferencia</option>
                        <option value="48">48 - Tarjeta de Crédito</option>
                        <option value="49">49 - Tarjeta de Débito</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label mb-1">Vencimiento</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={dueDate} 
                        onChange={(e) => setDueDate(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Listado de Items  */}
                <div className="card-raised items-card-section">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="font-bold text-sm text-primary">Líneas de Detalle</span>
                    <div className="d-flex gap-2">
                      {/*<button 
                        type="button" 
                        className="btn btn-outline btn-sm btn-icon gap-1 text-danger"
                        onClick={handleClearItems}
                        style={{ padding: '4px 8px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      >
                        <Trash size={14} />
                        Limpiar Tabla
                      </button>*/}
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm btn-icon gap-1"
                        onClick={handleAddItem}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        <FcPlus size={14} />
                        Agregar Línea
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive-wrapper">
                    <table className="table-invoice-items">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}> Producto</th>
                          <th style={{ textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}> Servicio</th>
                          <th style={{ textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Descripción</th>
                          <th style={{ width: '80px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Cant.</th>
                          <th style={{ width: '120px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Precio Unit.</th>
                          <th style={{ width: '90px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>IVA %</th>
                          <th style={{ width: 'auto', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Subtotal</th>
                          <th style={{ width: 'auto' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ width: '220px' }}>
                              <div className="d-flex flex-column gap-1">
                                <select 
                                  className="form-select text-xs" 
                                  style={{ height: '28px', padding: '2px 6px' }}
                                  value={item.product_id || ''} 
                                  onChange={(e) => handleItemChange(index, 'product_select', e.target.value)}
                                >
                                  <option value="">Seleccionar...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                               
                              </div>
                            </td>
                            <td style={{ width: '220px' }}>
                              <div className="d-flex flex-column gap-1">
                                
                                <select 
                                  className="form-select text-xs" 
                                  style={{ height: '28px', padding: '2px 6px' }}
                                  value={item.service_id || ''} 
                                  onChange={(e) => handleItemChange(index, 'service_select', e.target.value)}
                                >
                                  <option value="">Seleccionar...</option>
                                  {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="form-control text-sm" 
                                placeholder="Ej: Consultoría, Producto A, etc."
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="form-control text-sm text-right" 
                                value={item.quantity}
                                min="0.01"
                                step="any"
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                required
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="form-control text-sm text-right" 
                                value={item.unit_price}
                                min="0"
                                step="any"
                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                required
                              />
                            </td>
                            <td>
                              <select 
                                className="form-select text-sm" 
                                value={item.tax_rate} 
                                onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                              >
                                <option value="19">19%</option>
                                <option value="5">5%</option>
                                <option value="0">0%</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <strong className="text-sm text-nowrap">
                                {Helpers.formatCurrency((item.quantity * item.unit_price) - (item.discount || 0))}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="d-flex align-items-center justify-content-center gap-1">
                                {/* Botón de Limpiar / Resetear */}
                                <button 
                                  type="button" 
                                  className="btn btn-ghost btn-sm btn-icon-only text-warning" 
                                  title="Limpiar campos de la línea"
                                  onClick={() => handleClearItems(index)}
                                >
                                  <AiOutlineClear size={16} />
                                </button>

                                {/* Botón de Eliminar */}
                                <button 
                                  type="button" 
                                  className="btn btn-ghost btn-sm btn-icon-only text-danger" 
                                  title="Eliminar línea"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <FcEmptyTrash size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Observaciones */}
                <div className="card-raised d-flex flex-column gap-1" style={{ padding: '12px 16px !important' }}>
                  <span className="form-label mb-1">Observaciones de la Factura</span>
                  <textarea 
                    className="form-control" 
                    rows="2" 
                    placeholder="Términos de pago, datos bancarios, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ height: '54px', resize: 'none' }}
                  />
                </div>
              </div>

              {/* COLUMNA 2: Sidebar de Totales */}
              <div className="totals-sidebar card-raised">
                <div className="d-flex flex-column gap-3">
                  <span className="font-bold text-sm text-primary">Resumen de Importes</span>
                  
                  <div className="d-flex flex-column gap-2 text-sm">
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary">Subtotal:</span>
                      <span className="font-medium">{Helpers.formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary">Descuento:</span>
                      <span className="font-medium text-danger">{Helpers.formatCurrency(totals.discount)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary">Base Gravable:</span>
                      <span className="font-medium">{Helpers.formatCurrency(totals.tax_base)}</span>
                    </div>
              
                    {/* SECCIÓN DINÁMICA DE IVA AGRUPADO (CON VALIDACIÓN DE SEGURIDAD) */}
                    {totals && totals.taxesGrouped && Object.keys(totals.taxesGrouped).length > 0 ? (
                      Object.entries(totals.taxesGrouped).map(([rate, amount]) => (
                        <div className="d-flex justify-content-between" key={rate}>
                          <span className="text-secondary">IVA ({rate}%):</span>
                          <span className="font-medium">{Helpers.formatCurrency(amount || 0)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="d-flex justify-content-between">
                        <span className="text-secondary">IVA (0%):</span>
                        <span className="font-medium">{Helpers.formatCurrency(0)}</span>
                      </div>
                    )}
                   
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="font-bold text-base text-primary">Total Factura:</span>
                      <span className="font-bold text-lg text-gold">{Helpers.formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-primary w-100 btn-icon gap-2 justify-content-center"
                    onClick={() => handleSubmitInvoice('pending')}
                    disabled={submitting}
                  >
                    <Send width="16" height="16" />
                    Emitir Factura (DIAN)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline w-100 btn-icon gap-2 justify-content-center"
                    onClick={() => handleSubmitInvoice('draft')}
                    disabled={submitting}
                  >
                    <Save width="16" height="16" />
                    Guardar Borrador
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* SUB-FORMULARIO: Registro de Nuevo Cliente */
            <div className="customer-form-container card-raised">
              <form onSubmit={handleCreateCustomer} className="grid grid-2 gap-4">
                <div className="form-group">
                  <label className="form-label mb-1">Tipo Documento</label>
                  <select 
                    className="form-select"
                    value={newCust.id_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const dv = newType === 'NIT' ? calculateDV(newCust.id_number) : '';
                      setNewCust({ ...newCust, id_type: newType, dv });
                    }}
                  >
                    <option value="NIT">NIT (Empresa)</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PP">Pasaporte</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label mb-1">Número de Documento <span className="text-danger">*</span></label>
                  <div className="d-flex gap-2 w-100">
                    <input 
                      type="text" 
                      className="form-control input-id-number" 
                      placeholder="Ej: 900800700"
                      value={newCust.id_number}
                      onChange={(e) => {
                        const val = e.target.value;
                        const dv = newCust.id_type === 'NIT' ? calculateDV(val) : newCust.dv;
                        setNewCust({ ...newCust, id_number: val, dv });
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
                        title="Dígito de Verificación (Auto-calculado)"
                      />
                    )}
                  </div>
                </div>

                <div className="form-group grid-col-2">
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

                <div className="form-group">
                  <label className="form-label mb-1">Régimen Tributario</label>
                  <select 
                    className="form-select"
                    value={newCust.tax_regime}
                    onChange={(e) => setNewCust({ ...newCust, tax_regime: e.target.value })}
                  >
                    <option value="Simplificado">Persona Natural / Simplificado</option>
                    <option value="Común">Responsable de IVA / Común</option>
                    <option value="Gran Contribuyente">Gran Contribuyente</option>
                  </select>
                </div>

                <div className="form-group d-flex align-items-center" style={{ height: '38px', marginTop: 'auto' }}>
                  <label className="d-flex align-items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={newCust.is_tax_responsible}
                      onChange={(e) => setNewCust({ ...newCust, is_tax_responsible: e.target.checked })}
                      className="form-checkbox"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span className="text-sm">Responsable de IVA</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label mb-1">Email de Envío Factura <span className="text-danger">*</span></label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="cliente@correo.com"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="300 123 4567"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  />
                </div>

                <div className="form-group grid-col-2">
                  <label className="form-label mb-1">Dirección</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Calle 100 # 15-20"
                    value={newCust.address}
                    onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label mb-1">Ciudad</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Bogotá"
                    value={newCust.city}
                    onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label mb-1">Departamento</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Cundinamarca"
                    value={newCust.department}
                    onChange={(e) => setNewCust({ ...newCust, department: e.target.value })}
                  />
                </div>

                <div className="grid-col-2 d-flex gap-3 justify-content-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setShowNewCustomer(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Registrando...' : 'Registrar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}