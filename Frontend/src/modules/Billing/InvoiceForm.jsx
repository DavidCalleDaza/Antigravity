import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash, Save, Send, UserPlus, Search, X } from 'lucide-react';
import { FcPlus, FcEmptyTrash} from "react-icons/fc";
import { AiOutlineClear } from "react-icons/ai";
import { billingClient, productClient, serviceClient, categoryClient } from '../../utils/apiClient';
import { useToast } from '../../components/ui/Toast';
import Drawer from '../../components/ui/Drawer';
import MediaUploader from '../../components/ui/MediaUploader';
import { useFileUpload } from '../../hooks/useFileUpload';
import Helpers from '../../utils/helpers';
import "../../../css/pages/InvoiceModal.css";
import { usePaymentMeans } from '../../hooks/usePaymentMeans';
import CustomerModal from './CustomerModal'; 
import SearchableSelect from '../../components/common/SearchableSelect';

const ITEM_UNITS = ["UND", "KG", "LT", "MT", "HR", "SRV", "MES", "CJA", "PAR", "ROL"];
const UNIT_LABELS = {
  UND: "UND - Unidad",
  KG:  "KG  - Kilogramo",
  LT:  "LT  - Litro",
  MT:  "MT  - Metro",
  HR:  "HR  - Hora",
  SRV: "SRV - Servicio",
  MES: "MES - Mes",
  CJA: "CJA - Caja",
  PAR: "PAR - Par",
  ROL: "ROL - Rollo",
};

const EMPTY_ITEM = {
  description: '',
  code: '',
  unit: 'UND',
  quantity: 1,
  unit_price: 0,
  discount: 0,
  tax_rate: 19.00,
  product_id: null,
  service_id: null,
};

export default function InvoiceForm({ isOpen, onClose, onSave, invoiceToEdit = null }) {
  const toast = useToast();

  const [customers, setCustomers]                     = useState([]);
  const [products, setProducts]                       = useState([]);
  const [services, setServices]                       = useState([]);
  const [dbProductCategories, setDbProductCategories] = useState([]);
  const [dbServiceCategories, setDbServiceCategories] = useState([]);
  const [searchCust, setSearchCust]                   = useState('');
  const [loadingCustomers, setLoadingCustomers]       = useState(false);
  const [submitting, setSubmitting]                   = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false); 
  const [showQuickProduct, setShowQuickProduct]       = useState(false);
  const [showQuickService, setShowQuickService]       = useState(false);
  const [activeRowIndex, setActiveRowIndex]           = useState(null);

  // Cliente seleccionado (descuento preferencial)
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [quickProduct, setQuickProduct] = useState({
    name: '', category_id: '', price: 0, stock: 0,
    status: 'active', description: '', image_url: '', video_url: '',
    additionalImages: [], media_urls: [],
  });
  const [quickService, setQuickService] = useState({
    name: '', category_id: '', price: 0, duration: '',
    status: 'active', description: '', image_url: '', video_url: '',
    additionalImages: [], media_urls: [],
  });

  const [productMediaError, setProductMediaError] = useState(null);
  const [serviceMediaError, setServiceMediaError] = useState(null);

  const fileUploadProd = useFileUpload({
    onSuccess: (data) => {
      setQuickProduct(prev => ({
        ...prev,
        image_url: data.url,
        video_url: data.type === 'video' ? data.url : prev.video_url
      }));
      toast.success('Media del producto subido correctamente');
    },
    onError: (err) => { setProductMediaError(err); toast.error(err); },
  });

  const fileUploadServ = useFileUpload({
    onSuccess: (data) => {
      setQuickService(prev => ({
        ...prev,
        image_url: data.url,
        video_url: data.type === 'video' ? data.url : prev.video_url
      }));
      toast.success('Media del servicio subido correctamente');
    },
    onError: (err) => { setServiceMediaError(err); toast.error(err); },
  });

  const [customerId, setCustomerId]       = useState('');
  const [dueDate, setDueDate]             = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Contado');
  const [paymentMeans, setPaymentMeans]   = useState('10');
  const { options: validPaymentMeans, loading: loadingPaymentMeans } = usePaymentMeans(paymentMethod);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [custFocused, setCustFocused]           = useState(false);
  const [highlightedIdx, setHighlightedIdx]     = useState(-1);

  // Sincronizar selectedCustomer
  useEffect(() => {
    const found = customers.find(c => c.id === customerId) || null;
    setSelectedCustomer(found);
  }, [customerId, customers]);

  // Consultar configuración del país y auto-asignar el IVA por defecto del país a todas las líneas
  useEffect(() => {
    if (!selectedCustomer) return;
    const countryCode = selectedCustomer.location?.country_code;
    if (!countryCode) return;

    const fetchCountryTax = async () => {
      try {
        const cs = await billingClient.getCountrySettings(countryCode);
        if (cs && cs.default_tax_rate !== undefined) {
          const rate = parseFloat(cs.default_tax_rate);
          setItems(prevItems => prevItems.map(item => ({ ...item, tax_rate: rate })));
        }
      } catch (err) {
        console.warn("No se pudo obtener el IVA por defecto del país del cliente:", err);
      }
    };
    fetchCountryTax();
  }, [selectedCustomer]);

  // Sincronizar el buscador de texto con el cliente seleccionado (evita que quede en blanco al cargar o seleccionar)
  useEffect(() => {
    if (customerId && customers.length > 0) {
      const found = customers.find(c => c.id === customerId);
      if (found && searchCust !== found.business_name) {
        setSearchCust(found.business_name);
      }
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (!isOpen) return;
    loadInitialData();
    const initializeInvoice = async () => {
      if (!invoiceToEdit) {
        setCustomerId('');
        setSearchCust('');
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setDueDate(defaultDue.toISOString().split('T')[0]);
        setPaymentMethod('Contado');
        setPaymentMeans('10');
        setNotes('');
        setItems([{ ...EMPTY_ITEM }]);
        return;
      }
      setCustomerId(invoiceToEdit.customer_id || '');
      setDueDate(invoiceToEdit.due_date ? invoiceToEdit.due_date.split('T')[0] : '');
      setPaymentMethod(invoiceToEdit.payment_method || 'Contado');
      setPaymentMeans(invoiceToEdit.payment_means || '10');
      setNotes(invoiceToEdit.notes || '');
      let rawItems =
        invoiceToEdit.items || invoiceToEdit.invoice_items ||
        invoiceToEdit.details || invoiceToEdit.invoice_details ||
        invoiceToEdit.line_items || invoiceToEdit.lines || [];
      if (rawItems.length === 0 && invoiceToEdit.id) {
        try {
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
              fullInvoice.items || fullInvoice.invoice_items ||
              fullInvoice.details || fullInvoice.invoice_details ||
              fullInvoice.line_items || fullInvoice.lines || [];
          }
        } catch (e) {
          console.warn("Consulta de factura completa fallida", e);
        }
        if (rawItems.length === 0) {
          try {
            if (typeof billingClient.getInvoiceItems === 'function')       rawItems = await billingClient.getInvoiceItems(invoiceToEdit.id);
            else if (typeof billingClient.listInvoiceItems === 'function')  rawItems = await billingClient.listInvoiceItems(invoiceToEdit.id);
            else if (typeof billingClient.getInvoiceDetails === 'function') rawItems = await billingClient.getInvoiceDetails(invoiceToEdit.id);
            else if (typeof billingClient.getItems === 'function')          rawItems = await billingClient.getItems(invoiceToEdit.id);
            else if (typeof billingClient.getLines === 'function')          rawItems = await billingClient.getLines(invoiceToEdit.id);
          } catch (err) {
            console.error("No se pudo obtener ítems:", err);
          }
        }
      }
      let parsedItems = rawItems.map(item => {
        const qty    = item.quantity   ?? item.quantity_ordered ?? item.qty ?? 1;
        const price  = item.unit_price ?? item.price ?? item.unitPrice ?? item.value ?? 0;
        const tax    = item.tax_rate   ?? item.taxRate ?? item.tax_percent ?? item.tax ?? item.iva ?? 19.00;
        const desc   = item.description ?? item.name ?? item.item_name ?? '';
        const prodId = item.product_id ?? item.productId ?? null;
        const servId = item.service_id ?? item.serviceId ?? null;
        const rawUnit = (item.unit ?? 'UND').toString().trim().toUpperCase();
        const unit    = ITEM_UNITS.includes(rawUnit) ? rawUnit : 'UND';
        return {
          description: desc, code: item.code || item.sku || '', unit,
          quantity: parseFloat(qty), unit_price: parseFloat(price),
          // No cargamos item.discount al editar: no es un valor manual del usuario,
          // es el resultado calculado por el backend a partir del % del cliente.
          // El backend lo vuelve a calcular en cada guardado (create/update_invoice),
          // así que cargarlo aquí solo generaba doble conteo con preferredDiscount.
          discount: 0,
          tax_rate: parseFloat(tax),
          product_id: prodId || null, service_id: servId || null,
        };
      });
      if (parsedItems.length === 0) parsedItems = [{ ...EMPTY_ITEM }];
      setItems(parsedItems);
    };
    initializeInvoice();
  }, [isOpen, invoiceToEdit]);

  useEffect(() => {
    if (!paymentMeans || loadingPaymentMeans) return;
    const stillValid = validPaymentMeans.some(opt => opt.value === paymentMeans);
    if (!stillValid) setPaymentMeans(validPaymentMeans[0]?.value || '');
  }, [validPaymentMeans, loadingPaymentMeans]);

  const filteredCustomers = useMemo(() => {
    if (!searchCust) return customers;
    return customers.filter(c =>
      c.business_name.toLowerCase().includes(searchCust.toLowerCase()) ||
      c.id_number.includes(searchCust)
    );
  }, [customers, searchCust]);

  // Autocompletado inteligente
  useEffect(() => {
    if (!searchCust.trim()) {
      setHighlightedIdx(-1);
      return;
    }
    if (selectedCustomer && searchCust === selectedCustomer.business_name) {
      setShowCustDropdown(false);
      return;
    }
    if (filteredCustomers.length === 1) {
      const unico = filteredCustomers[0];
      if (unico.id !== customerId) setCustomerId(unico.id);
      setShowCustDropdown(false);
    } else if (filteredCustomers.length > 1) {
      setShowCustDropdown(true);
      setHighlightedIdx(0);
    } else {
      if (customerId) setCustomerId('');
      setShowCustDropdown(false);
    }
  }, [filteredCustomers, searchCust]);

  const loadInitialData = async () => {
    setLoadingCustomers(true);
    try {
      const [custData, prodData, servData, prodCatData, servCatData] = await Promise.all([
        billingClient.listCustomers(),
        productClient.list({ limit: 100 }),
        serviceClient.list({ limit: 100 }),
        categoryClient.list('product').catch(() => []),
        categoryClient.list('service').catch(() => [])
      ]);
      setCustomers(custData);
      setProducts(prodData);
      setServices(servData);
      setDbProductCategories(prodCatData);
      setDbServiceCategories(servCatData);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos iniciales para la factura.');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const selectedProductIds = useMemo(() => {
    return items.map(item => item.product_id).filter(id => id !== null && id !== undefined);
  }, [items]);

  const selectedServiceIds = useMemo(() => {
    return items.map(item => item.service_id).filter(id => id !== null && id !== undefined);
  }, [items]);

  const totals = useMemo(() => {
  let subtotal = 0, lineDiscount = 0, tax_total = 0;
  const taxesGrouped = {};
  const safeItems = Array.isArray(items) ? items : [];

  safeItems.forEach(item => {
    const qty     = parseFloat(item.quantity)   || 0;
    const price   = parseFloat(item.unit_price) || 0;
    const disc    = parseFloat(item.discount)   || 0;  // siempre 0 hoy
    const taxRate = parseFloat(item.tax_rate)   || 0;
    subtotal     += qty * price;
    lineDiscount += disc;
  });

  let preferredDiscount = 0;
  const base = subtotal - lineDiscount;  // base = subtotal, porque lineDiscount = 0
  if (selectedCustomer?.is_preferred && Number(selectedCustomer?.discount_value) > 0) {
    preferredDiscount = selectedCustomer.discount_type === 'percent'
      ? base * (Number(selectedCustomer.discount_value) / 100)
      : Math.min(Number(selectedCustomer.discount_value), base);
  }

  const discount_total = lineDiscount + preferredDiscount; // = preferredDiscount
  const tax_base_before_tax = subtotal - discount_total;

  // El IVA se calcula sobre cada línea ya neta de su parte proporcional del descuento preferencial,
  // igual que hace el backend (_distribute_discount_across_items), para que el desglose por
  // tasa de IVA en pantalla coincida con lo que el backend terminará guardando.
  safeItems.forEach(item => {
    const qty     = parseFloat(item.quantity)   || 0;
    const price   = parseFloat(item.unit_price) || 0;
    const taxRate = parseFloat(item.tax_rate)   || 0;
    const lineBase = qty * price;
    const lineShare = subtotal > 0 ? lineBase / subtotal : 0;
    const lineNet = lineBase - (discount_total * lineShare);
    const lineTax = lineNet * (taxRate / 100);
    tax_total += lineTax;
    if (taxRate > 0) taxesGrouped[taxRate] = (taxesGrouped[taxRate] || 0) + lineTax;
  });

  const tax_base = tax_base_before_tax;
  const total     = tax_base + tax_total;

  return { subtotal, lineDiscount, preferredDiscount, discount_total, tax_base, tax_total, taxesGrouped, total };
}, [items, selectedCustomer]);

  const handleAddItem = async () => {
    let rate = 19.00; // default general fallback si no hay cliente seleccionado
    if (selectedCustomer) {
      try {
        const { tax_rate } = await billingClient.getCustomerTaxRate(selectedCustomer.id);
        const parsed = parseFloat(tax_rate);
        if (!isNaN(parsed)) rate = parsed;
      } catch (err) {
        console.warn("No se pudo obtener el IVA del cliente para la nueva línea:", err);
      }
    }
    setItems([...items, { ...EMPTY_ITEM, tax_rate: rate }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) { toast.warning('La factura debe tener al menos una línea de detalle.'); return; }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleClearItems = (index = null) => {
    if (typeof index === 'number' && !index?.target) {
      const updated = [...items]; updated[index] = { ...EMPTY_ITEM };
      setItems(updated); toast.info('Línea limpiada');
    } else {
      setItems([{ ...EMPTY_ITEM }]); toast.info('Tabla limpiada');
    }
  };

  const handleItemChange = (index, field, value) => { 
    const updated = [...items];
    if (field === 'product_select') {
      if (value) {
        const prod = products.find(p => p.id === value);
        if (prod) updated[index] = { ...updated[index], description: prod.name, code: prod.sku || '', unit_price: parseFloat(prod.price) || 0, quantity: 1, product_id: prod.id, service_id: null };
      } else {
        // Deseleccionado: limpiar campos que eran autocompletados por el producto
        updated[index] = { ...updated[index], product_id: null, description: '', code: '', unit_price: 0 };
      }
    } else if (field === 'service_select') {
      if (value) {
        const serv = services.find(s => s.id === value);
        if (serv) updated[index] = { ...updated[index], description: serv.name, code: serv.code || '', unit_price: parseFloat(serv.price) || 0, quantity: 1, service_id: serv.id, product_id: null };
      } else {
        // Deseleccionado: limpiar campos que eran autocompletados por el servicio
        updated[index] = { ...updated[index], service_id: null, description: '', code: '', unit_price: 0 };
      }
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const handleProductFileSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setProductMediaError(null);
    const validation = fileUploadProd.validateFile(file);
    if (!validation.valid) { setProductMediaError(validation.error); return; }
    fileUploadProd.upload(file);
  };

  const handleServiceFileSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setServiceMediaError(null);
    const validation = fileUploadServ.validateFile(file);
    if (!validation.valid) { setServiceMediaError(validation.error); return; }
    fileUploadServ.upload(file);
  };

  const handleCreateQuickProduct = async (e) => {
    e.preventDefault();
    if (!quickProduct.name) { toast.error('El nombre del producto es requerido.'); return; }
    try {
      setSubmitting(true);
      const meansIsValid = validPaymentMeans.some(opt => opt.value === paymentMeans);
      if (!meansIsValid) { toast.error('El medio de pago seleccionado no es válido para el método de pago elegido.'); return; }
      const payload = { ...quickProduct, category_id: quickProduct.category_id || null };
      
      // Upload additional images first
      let extraUrls = [];
      if (quickProduct.additionalImages && quickProduct.additionalImages.length > 0) {
        const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        const token = useStore.getState().currentUser?.token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const uploadPromises = quickProduct.additionalImages.map(img => {
          const form = new FormData();
          form.append('file', img.blob, `product_gallery_${Date.now()}.png`);
          return fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: form })
            .then(r => r.json())
            .then(data => data.url || null);
        });
        const uploaded = await Promise.all(uploadPromises);
        extraUrls = uploaded.filter(Boolean);
      }
      
      const existingMedia = quickProduct.media_urls || [];
      const primary = quickProduct.image_url;
      const allUrlsSet = new Set();
      if (primary) allUrlsSet.add(primary);
      existingMedia.forEach(url => allUrlsSet.add(url));
      extraUrls.forEach(url => allUrlsSet.add(url));
      
      const allUrls = Array.from(allUrlsSet);
      if (allUrls.length > 0) payload.media_urls = allUrls;
      delete payload.additionalImages;

      const created = await productClient.create(payload);
      toast.success('Producto creado y seleccionado exitosamente.');
      setProducts(prev => [created, ...prev]);
      if (activeRowIndex !== null) {
        const updated = [...items];
        updated[activeRowIndex] = { ...updated[activeRowIndex], description: created.name, code: created.sku || '', unit_price: parseFloat(created.price) || 0, quantity: 1, product_id: created.id, service_id: null };
        setItems(updated);
      }
      resetQuickProductForm();
    } catch (err) { console.error(err); toast.error(err.message || 'Error al registrar el producto.'); }
    finally { setSubmitting(false); }
  };

  const resetQuickProductForm = () => {
    setShowQuickProduct(false);
    setQuickProduct({ name: '', category_id: '', price: 0, stock: 0, status: 'active', description: '', image_url: '', video_url: '', additionalImages: [], media_urls: [] });
    fileUploadProd.reset(); setProductMediaError(null);
  };

  const handleCreateQuickService = async (e) => {
    e.preventDefault();
    if (!quickService.name) { toast.error('El nombre del servicio es requerido.'); return; }
    try {
      setSubmitting(true);
      const payload = {
        name: quickService.name, price: quickService.price, status: quickService.status,
        description: String(quickService.description || ''), duration: String(quickService.duration || ''),
        category_id: quickService.category_id === '' ? null : quickService.category_id,
      };
      if (quickService.image_url) payload.image_url = quickService.image_url;
      if (quickService.video_url) payload.video_url = quickService.video_url;

      // Upload additional images first
      let extraUrls = [];
      if (quickService.additionalImages && quickService.additionalImages.length > 0) {
        const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
        const token = useStore.getState().currentUser?.token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const uploadPromises = quickService.additionalImages.map(img => {
          const form = new FormData();
          form.append('file', img.blob, `service_gallery_${Date.now()}.png`);
          return fetch(`${API_BASE_URL}/uploads/media`, { method: 'POST', headers, body: form })
            .then(r => r.json())
            .then(data => data.url || null);
        });
        const uploaded = await Promise.all(uploadPromises);
        extraUrls = uploaded.filter(Boolean);
      }
      
      const existingMedia = quickService.media_urls || [];
      const primary = quickService.image_url;
      const allUrlsSet = new Set();
      if (primary) allUrlsSet.add(primary);
      existingMedia.forEach(url => allUrlsSet.add(url));
      extraUrls.forEach(url => allUrlsSet.add(url));
      
      const allUrls = Array.from(allUrlsSet);
      if (allUrls.length > 0) payload.media_urls = allUrls;

      const created = await serviceClient.create(payload);
      toast.success('Servicio creado y seleccionado exitosamente.');
      setServices(prev => [created, ...prev]);
      if (activeRowIndex !== null) {
        const updated = [...items];
        updated[activeRowIndex] = { ...updated[activeRowIndex], description: created.name, code: created.code || '', unit_price: parseFloat(created.price) || 0, quantity: 1, service_id: created.id, product_id: null };
        setItems(updated);
      }
      resetQuickServiceForm();
    } catch (err) { console.error(err); toast.error(err.message || 'Error al registrar el servicio.'); }
    finally { setSubmitting(false); }
  };

  const resetQuickServiceForm = () => {
    setShowQuickService(false);
    setQuickService({ name: '', category_id: '', price: 0, duration: '', status: 'active', description: '', image_url: '', video_url: '', additionalImages: [], media_urls: [] });
    fileUploadServ.reset(); setServiceMediaError(null);
  };

  const handleCustomerCreated = (newCustomer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    setCustomerId(newCustomer.id);
    setIsCustomerModalOpen(false);
  };

  const handleSubmitInvoice = async (statusType) => {
    if (!customerId) { toast.error('Debe seleccionar un cliente.'); return; }
    const invalidItem = items.some(item => !item.description || item.unit_price < 0 || item.quantity <= 0);
    
    const productIds = items.map(i => i.product_id).filter(Boolean);
    const serviceIds = items.map(i => i.service_id).filter(Boolean);
    const hasDuplicateProduct = new Set(productIds).size !== productIds.length;
    const hasDuplicateService = new Set(serviceIds).size !== serviceIds.length;

    if (hasDuplicateProduct || hasDuplicateService) {
      toast.error('No se permiten productos o servicios duplicados en la misma factura.');
      return;
    }

    if (invalidItem) { toast.error('Complete todas las líneas: descripción, cantidad > 0 y precio >= 0.'); return; }
    const conflictItem = items.some(item => item.product_id && item.service_id);
    if (conflictItem) { toast.error('Un ítem no puede tener producto y servicio al mismo tiempo.'); return; }
    const payload = {
      customer_id: customerId, due_date: dueDate || null,
      payment_method: paymentMethod, payment_means: paymentMeans,
      notes: notes || null, status: statusType,
      items: items.map(i => ({
        description: i.description, code: i.code || null,
        unit: (i.unit || 'UND').toUpperCase(),
        quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price),
        discount: parseFloat(i.discount) || 0, tax_rate: parseFloat(i.tax_rate),
        product_id: i.product_id || null, service_id: i.service_id || null,
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
      onSave(result); onClose();
    } catch (err) { console.error(err); toast.error(err.message || 'Error al guardar la factura.'); }
    finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  const disabledStyle   = { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' };
  const baseSelectStyle = { height: '28px', padding: '2px 6px', flex: 1, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' };

  const lockedFieldStyle = {
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: 'var(--text-secondary)',
    cursor: 'not-allowed',
  };  


  return (
    <div 
      className="modal-overlay active" 
      onClick={handleOverlayClick} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 20000 // <--- Asegura que el formulario de editar esté POR ENCIMA del detalle (zIndex 10000)
      }}
    >
      <div className="modal modal-lg animate-scaleUp">

        {/* HEADER */}
        <div className="modal-header">
          <h3 className="modal-title">
            {invoiceToEdit ? `Editar Factura Borrador ${invoiceToEdit.full_number}` : 'Nueva Factura de Venta'}
          </h3>
          <button className="modal-close" onClick={onClose} disabled={submitting}>
            <X width="16" height="16" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="modal-body">
          <div className="invoice-form-column">

            {/* 1. CLIENTE */}
            <div className="customer-section">
              <div className="customer-title-block">
                <span className="font-bold customer-title">Información del Cliente</span>
              </div>
              
              <div className="customer-fields-block">
                <label className="form-label">Buscar y Seleccionar Cliente <span className="text-danger">*</span></label>
                <div className="customer-inputs-row">
                  <div className="input-group">
                    <span className="input-icon-left"><Search size={14} /></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Escribe Nombre o NIT..."
                      value={searchCust}
                      onChange={(e) => {
                        setSearchCust(e.target.value);
                        if (customerId) setCustomerId('');
                      }}
                      onFocus={() => {
                        setCustFocused(true);
                        setShowCustDropdown(true);
                      }}
                      onClick={() => {
                        setShowCustDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setCustFocused(false), 150)}
                      onKeyDown={(e) => {
                        if (!showCustDropdown || filteredCustomers.length === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlightedIdx(prev => Math.min(prev + 1, filteredCustomers.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlightedIdx(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          const chosen = filteredCustomers[highlightedIdx];
                          if (chosen) {
                            setCustomerId(chosen.id);
                            setSearchCust(chosen.business_name);
                            setShowCustDropdown(false);
                          }
                        } else if (e.key === 'Escape') {
                          setShowCustDropdown(false);
                        }
                      }}
                      autoComplete="off"
                    />
                    {searchCust && (
                      <button
                        type="button"
                        className="input-icon-right-btn"
                        onClick={() => { setSearchCust(''); setCustomerId(''); setShowCustDropdown(false); }}
                        title="Limpiar búsqueda"
                      >
                        <X size={14} />
                      </button>
                    )}

                    {showCustDropdown && custFocused && (
                      <div className="customer-dropdown">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((c, idx) => (
                            <div
                              key={c.id}
                              className={`customer-dropdown-item ${idx === highlightedIdx ? 'is-highlighted' : ''}`}
                              onMouseEnter={() => setHighlightedIdx(idx)}
                              onClick={() => {
                                setCustomerId(c.id);
                                setSearchCust(c.business_name);
                                setShowCustDropdown(false);
                              }}
                            >
                              <strong>{c.business_name}</strong>
                              <span className="customer-dropdown-meta">
                                {c.id_type} {c.id_number} {c.email ? `· ${c.email}` : ''}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="customer-dropdown-empty">Sin coincidencias</div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedCustomer?.is_preferred && (
                    <div className="customer-preferred-badge">
                      ★ Cliente Preferencial -&nbsp;
                      <strong>
                        {selectedCustomer.discount_type === 'percent'
                          ? `${selectedCustomer.discount_value}% de descuento`
                          : `Descuento fijo: ${Helpers.formatCurrency(selectedCustomer.discount_value)}`
                        }
                      </strong>
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="customer-selected-info">
                    <span><strong>Correo:</strong> {selectedCustomer.email}</span>
                    <span><strong>Régimen:</strong> {selectedCustomer.tax_regime}</span>
                    <span>
                      <strong>IVA:</strong>{' '}
                      {selectedCustomer.is_tax_responsible ? 'Responsable de IVA' : 'No responsable de IVA'}
                    </span>
                  </div>
                )}
              </div>

              <div className="customer-button-block">
                <button type="button" className="btn-new-customer" onClick={() => setIsCustomerModalOpen(true)}>
                  <FcPlus size={14} /> Nuevo Cliente
                </button>
              </div>
            </div>

            {/* 2. PAGO Y FECHAS */}
            <div className="card-raised d-flex flex-column gap-2">
              <span className="font-bold text-sm text-primary">Detalles de Pago y Fechas</span>
              <div className="grid grid-3 gap-0">
                <div className="form-group">
                  <label className="form-label g-0">Método de Pago</label>
                  <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label mb-1">Medio de Pago</label>
                  <select className="form-select" value={paymentMeans} onChange={(e) => setPaymentMeans(e.target.value)}
                    disabled={!paymentMethod || loadingPaymentMeans}
                    title={!paymentMethod ? 'Selecciona primero el Método de Pago' : ''}>
                    <option value="">Seleccionar...</option>
                    {validPaymentMeans.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label mb-1">Vencimiento</label>
                  <input type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 3. LÍNEAS DE DETALLE */}
            <div className="card-raised items-card-section">
              <div className="d-flex justify-content-between align-items-center">
                <span className="font-bold text-sm text-primary">Líneas de Detalle</span>
                <button type="button" className="btn btn-outline btn-sm btn-icon gap-1" onClick={handleAddItem} style={{ padding: '4px 8px', fontSize: '12px' }}>
                  <FcPlus size={14} /> Agregar Línea
                </button>
              </div>
              <div className="table-responsive-wrapper">
                <table className="table-invoice-items">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Producto</th>
                      <th style={{ textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Servicio</th>
                      <th style={{ textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Descripción</th>
                      <th style={{ width: '110px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Unidad</th>
                      <th style={{ width: '80px',  textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Cant.</th>
                      <th style={{ width: '120px', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Precio Unit.</th>
                      <th style={{ width: '90px',  textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>IVA %</th>
                      <th style={{ width: 'auto',  textAlign: 'right',fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Subtotal</th>
                      <th style={{ width: 'auto' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const productLocked = !!item.service_id;
                      const serviceLocked = !!item.product_id;
                      const hasSelection = !!(item.product_id || item.service_id);

                      const availableProducts = products.filter(
                        p => !selectedProductIds.includes(p.id) || item.product_id === p.id
                      );
                      const availableServices = services.filter(
                        s => !selectedServiceIds.includes(s.id) || item.service_id === s.id
                      );

                      return (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                          {/* PRODUCTO */}
                          <td style={{ width: '220px' }}>
                            <div className="d-flex align-items-center gap-1">
                              <div style={{ flex: 1 }}>
                                <SearchableSelect
                                  value={item.product_id || ''}
                                  onChange={(id) => handleItemChange(index, 'product_select', id || '')}
                                  options={availableProducts}
                                  getLabel={(p) => p.name}
                                  getValue={(p) => p.id}
                                  placeholder="Seleccionar..."
                                  searchPlaceholder="Buscar producto..."
                                  emptyText="Sin productos disponibles"
                                  disabled={productLocked}
                                  clearable
                                  size="compact"
                                />
                              </div>
                              <button type="button" className="btn btn-ghost btn-sm btn-icon-only text-primary"
                                style={{ padding: '2px', height: '28px', width: '28px', ...(productLocked ? disabledStyle : {}) }}
                                disabled={productLocked}
                                title={productLocked ? 'Deselecciona el servicio primero' : 'Crear nuevo producto'}
                                onClick={() => { setActiveRowIndex(index); setShowQuickProduct(true); }}>
                                <FcPlus size={14} />
                              </button>
                            </div>
                          </td>
                          {/* SERVICIO */}
                          <td style={{ width: '220px' }}>
                            <div className="d-flex align-items-center gap-1">
                              <div style={{ flex: 1 }}>
                                <SearchableSelect
                                  value={item.service_id || ''}
                                  onChange={(id) => handleItemChange(index, 'service_select', id || '')}
                                  options={availableServices}
                                  getLabel={(s) => s.name}
                                  getValue={(s) => s.id}
                                  placeholder="Seleccionar..."
                                  searchPlaceholder="Buscar servicio..."
                                  emptyText="Sin servicios disponibles"
                                  disabled={serviceLocked}
                                  clearable
                                  size="compact"
                                />
                              </div>
                              <button type="button" className="btn btn-ghost btn-sm btn-icon-only text-primary"
                                style={{ padding: '2px', height: '28px', width: '28px', ...(serviceLocked ? disabledStyle : {}) }}
                                disabled={serviceLocked}
                                title={serviceLocked ? 'Deselecciona el producto primero' : 'Crear nuevo servicio'}
                                onClick={() => { setActiveRowIndex(index); setShowQuickService(true); }}>
                                <FcPlus size={12} />
                              </button>
                            </div>
                          </td>
                          {/* DESCRIPCIÓN */}
                          <td>
                            <input type="text" className="form-control text-sm" placeholder="Ej: Consultoría, Producto A, etc."
                            style={{ height: '28px', fontSize: '10px', padding: '2px 6px', ...(hasSelection ? lockedFieldStyle : {}) }}
                            value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            disabled={hasSelection} required />
                          </td>
                          {/* CANTIDAD */}
                          <td>
                            <input type="number" className="form-control text-sm text-right"
                              value={item.quantity} min="0.0001" step="any"
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} required />
                          </td>
                          {/* UNIDAD */}
                          <td>
                            <select className="form-select text-sm" value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}>
                              {ITEM_UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                            </select>
                          </td>
                          {/* PRECIO */}
                          <td>
                            <input type="number" className="form-control text-sm text-right"
                            style={hasSelection ? lockedFieldStyle : undefined}
                            value={item.unit_price} min="0" step="any"
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            disabled={hasSelection} required />
                          </td>
                          {/* IVA */}
                          <td>
                            <input
                              type="number"
                              className="form-control text-sm text-right"
                              style={hasSelection ? lockedFieldStyle : undefined}
                              value={item.tax_rate}
                              min="0"
                              max="100"
                              step="0.01"
                              onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                              disabled={hasSelection}
                            />
                          </td>
                          {/* SUBTOTAL */}
                          <td style={{ textAlign: 'right' }}>
                            <strong className="text-sm text-nowrap">
                              {Helpers.formatCurrency((item.quantity * item.unit_price) - (item.discount || 0))}
                            </strong>
                          </td>
                          {/* ACCIONES */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <button type="button" className="btn btn-ghost btn-sm btn-icon-only text-warning"
                                title="Limpiar campos de la línea" onClick={() => handleClearItems(index)}>
                                <AiOutlineClear size={10} />
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm btn-icon-only text-danger"
                                title="Eliminar línea" onClick={() => handleRemoveItem(index)}>
                                <FcEmptyTrash size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. OBSERVACIONES */}
            <div className="card-raised d-flex flex-column gap-1" style={{ padding: '12px 16px !important' }}>
              <span className="form-label mb-1">Observaciones de la Factura</span>
              <textarea className="form-control" rows="2" placeholder="Términos de pago, datos bancarios, etc."
                value={notes} onChange={(e) => setNotes(e.target.value)}
                style={{ height: '54px', resize: 'none' }} />
            </div>
          </div>

          {/* SIDEBAR TOTALES */}
          <div className="totals-sidebar card-raised">
            <div className="d-flex flex-column gap-3">
              <span className="font-bold text-sm text-primary">Resumen de Importes</span>
              <div className="d-flex flex-column gap-2 text-sm">

                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Subtotal bruto:</span>
                  <span className="font-medium">{Helpers.formatCurrency(totals.subtotal)}</span>
                </div>

                {totals.lineDiscount > 0 && (
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Descuento líneas:</span>
                    <span className="font-medium text-danger">-{Helpers.formatCurrency(totals.lineDiscount)}</span>
                  </div>
                )}

                {totals.preferredDiscount > 0 && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-secondary d-flex align-items-center gap-1">
                      <span style={{ background: '#f59e0b', color: '#fff', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        ★ PREF
                      </span>
                      Descuento cliente:
                    </span>
                    <span className="font-medium text-danger">
                      -{Helpers.formatCurrency(totals.preferredDiscount)}
                      {selectedCustomer?.discount_type === 'percent' && (
                        <span style={{ fontSize: '10px', opacity: 0.6 }}> ({selectedCustomer.discount_value}%)</span>
                      )}
                    </span>
                  </div>
                )}

                {totals.lineDiscount > 0 && totals.preferredDiscount > 0 && (
                  <div className="d-flex justify-content-between" style={{ borderTop: '1px dashed var(--border)', paddingTop: '4px' }}>
                    <span className="text-secondary">Total descuentos:</span>
                    <span className="font-medium text-danger">-{Helpers.formatCurrency(totals.discount_total)}</span>
                  </div>
                )}

                {totals.lineDiscount === 0 && totals.preferredDiscount === 0 && (
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Descuento:</span>
                    <span className="font-medium text-danger">-{Helpers.formatCurrency(0)}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Base Gravable:</span>
                  <span className="font-medium">{Helpers.formatCurrency(totals.tax_base)}</span>
                </div>

                {totals.taxesGrouped && Object.keys(totals.taxesGrouped).length > 0 ? (
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
              <button type="button" className="btn btn-primary w-100 btn-icon gap-2 justify-content-center"
                onClick={() => handleSubmitInvoice('sent')} disabled={submitting}>
                <Send width="16" height="16" /> Emitir Factura (DIAN)
              </button>
              <button type="button" className="btn btn-outline w-100 btn-icon gap-2 justify-content-center"
                onClick={() => handleSubmitInvoice('draft')} disabled={submitting}>
                <Save width="16" height="16" /> Guardar Borrador
              </button>
            </div>
          </div>
        </div>

        {/* MODAL ANIDADO INDEPENDIENTE PARA NUEVO CLIENTE */}
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSave={handleCustomerCreated}
        />

        {/* DRAWER: Nuevo Producto */}
        <Drawer isOpen={showQuickProduct} onClose={resetQuickProductForm} position="right" title="Nuevo Producto">
          <form className="d-flex flex-col gap-5" onSubmit={handleCreateQuickProduct}>
            <MediaUploader preview={fileUploadProd.preview || Helpers.resolveMediaUrl(quickProduct.image_url)}
              uploading={fileUploadProd.uploading} compressing={fileUploadProd.compressing}
              progress={fileUploadProd.progress}
              onSelect={handleProductFileSelect} onClear={fileUploadProd.reset} error={productMediaError} />
            
            {/* Galería de imágenes adicionales */}
            <div className="share-multi-img">
              <div className="share-multi-img-header">
                <label className="form-label" style={{ marginBottom: 0 }}>Imágenes adicionales</label>
                <span className="share-multi-img-count">
                  {quickProduct.additionalImages?.length > 0 || (quickProduct.media_urls?.length > 1) 
                    ? `${(quickProduct.additionalImages?.length || 0) + (quickProduct.media_urls?.length > 1 ? quickProduct.media_urls.length - 1 : 0)} adicionales` 
                    : 'Opcional'}
                </span>
              </div>
              <div className="share-multi-img-strip">
                {/* Existing additional URLs */}
                {quickProduct.media_urls?.filter(url => url !== quickProduct.image_url).map((url, idx) => (
                  <div key={`existing-${idx}`} className="share-multi-img-thumb">
                    <img src={Helpers.resolveMediaUrl(url)} alt={`Adicional ${idx}`} />
                    <button
                      type="button"
                      className="share-multi-img-remove"
                      onClick={() => {
                        const newMediaUrls = quickProduct.media_urls.filter(u => u !== url);
                        setQuickProduct({ ...quickProduct, media_urls: newMediaUrls });
                      }}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* New additional images */}
                {quickProduct.additionalImages?.map((img, idx) => (
                  <div key={`new-${idx}`} className="share-multi-img-thumb">
                    <img src={img.previewUrl} alt={`Nueva ${idx}`} />
                    <button
                      type="button"
                      className="share-multi-img-remove"
                      onClick={() => {
                        URL.revokeObjectURL(img.previewUrl);
                        const newImages = quickProduct.additionalImages.filter((_, i) => i !== idx);
                        setQuickProduct({ ...quickProduct, additionalImages: newImages });
                      }}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="share-multi-img-add"
                  onClick={() => {
                    const fileInput = document.getElementById('quickProductGalleryInput');
                    if(fileInput) fileInput.click();
                  }}
                  title="Agregar imagen"
                >
                  +
                </button>
                <input
                  id="quickProductGalleryInput"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const blob = file;
                    const previewUrl = URL.createObjectURL(blob);
                    setQuickProduct({
                      ...quickProduct,
                      additionalImages: [...(quickProduct.additionalImages || []), { blob, previewUrl }]
                    });
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre del producto <span className="required">*</span></label>
              <input type="text" className="form-input" value={quickProduct.name}
                onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={quickProduct.category_id}
                  onChange={(e) => setQuickProduct({ ...quickProduct, category_id: e.target.value })}>
                  <option value="">Seleccionar categoría</option>
                  {dbProductCategories.map(c => <option key={c.id} value={c.id}>{'-'.repeat(c.depth || 0)} {c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Precio <span className="required">*</span></label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0"
                  value={quickProduct.price === 0 ? '' : quickProduct.price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setQuickProduct({ ...quickProduct, price: parseFloat(e.target.value) || 0 })} 
                  required 
                  min="0" 
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Stock</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0"
                  value={quickProduct.stock === 0 ? '' : quickProduct.stock}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setQuickProduct({ ...quickProduct, stock: parseInt(e.target.value) || 0 })} 
                  min="0" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={quickProduct.status}
                  onChange={(e) => setQuickProduct({ ...quickProduct, status: e.target.value })}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="out_of_stock">Agotado</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={quickProduct.description}
                onChange={(e) => setQuickProduct({ ...quickProduct, description: e.target.value })} rows="3" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ border: 'none', padding: 0, marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn-outline" onClick={resetQuickProductForm}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : 'Crear Producto'}</button>
            </div>
          </form>
        </Drawer>

        {/* DRAWER: Nuevo Servicio */}
        <Drawer isOpen={showQuickService} onClose={resetQuickServiceForm} position="right" title="Nuevo Servicio">
          <form className="d-flex flex-col gap-5" onSubmit={handleCreateQuickService}>
            <MediaUploader preview={fileUploadServ.preview || Helpers.resolveMediaUrl(quickService.image_url)}
              uploading={fileUploadServ.uploading} compressing={fileUploadServ.compressing}
              progress={fileUploadServ.progress}
              onSelect={handleServiceFileSelect} onClear={fileUploadServ.reset} error={serviceMediaError} />
            
            {/* Galería de imágenes adicionales */}
            <div className="share-multi-img">
              <div className="share-multi-img-header">
                <label className="form-label" style={{ marginBottom: 0 }}>Imágenes adicionales</label>
                <span className="share-multi-img-count">
                  {quickService.additionalImages?.length > 0 || (quickService.media_urls?.length > 1) 
                    ? `${(quickService.additionalImages?.length || 0) + (quickService.media_urls?.length > 1 ? quickService.media_urls.length - 1 : 0)} adicionales` 
                    : 'Opcional'}
                </span>
              </div>
              <div className="share-multi-img-strip">
                {/* Existing additional URLs */}
                {quickService.media_urls?.filter(url => url !== quickService.image_url).map((url, idx) => (
                  <div key={`existing-${idx}`} className="share-multi-img-thumb">
                    <img src={Helpers.resolveMediaUrl(url)} alt={`Adicional ${idx}`} />
                    <button
                      type="button"
                      className="share-multi-img-remove"
                      onClick={() => {
                        const newMediaUrls = quickService.media_urls.filter(u => u !== url);
                        setQuickService({ ...quickService, media_urls: newMediaUrls });
                      }}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* New additional images */}
                {quickService.additionalImages?.map((img, idx) => (
                  <div key={`new-${idx}`} className="share-multi-img-thumb">
                    <img src={img.previewUrl} alt={`Nueva ${idx}`} />
                    <button
                      type="button"
                      className="share-multi-img-remove"
                      onClick={() => {
                        URL.revokeObjectURL(img.previewUrl);
                        const newImages = quickService.additionalImages.filter((_, i) => i !== idx);
                        setQuickService({ ...quickService, additionalImages: newImages });
                      }}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="share-multi-img-add"
                  onClick={() => {
                    const fileInput = document.getElementById('quickServiceGalleryInput');
                    if(fileInput) fileInput.click();
                  }}
                  title="Agregar imagen"
                >
                  +
                </button>
                <input
                  id="quickServiceGalleryInput"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const blob = file;
                    const previewUrl = URL.createObjectURL(blob);
                    setQuickService({
                      ...quickService,
                      additionalImages: [...(quickService.additionalImages || []), { blob, previewUrl }]
                    });
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre <span className="required">*</span></label>
              <input type="text" className="form-input" value={quickService.name}
                onChange={(e) => setQuickService({ ...quickService, name: e.target.value })} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={quickService.category_id}
                  onChange={(e) => setQuickService({ ...quickService, category_id: e.target.value })}>
                  <option value="">Seleccionar categoría</option>
                  {dbServiceCategories.map(c => <option key={c.id} value={c.id}>{'-'.repeat(c.depth || 0)} {c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Precio</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0"
                  value={quickService.price === 0 ? '' : quickService.price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setQuickService({ ...quickService, price: parseFloat(e.target.value) || 0 })} 
                  min="0" 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Duración</label>
              <input type="text" className="form-input" value={quickService.duration}
                onChange={(e) => setQuickService({ ...quickService, duration: e.target.value })} placeholder="30 min, 1 hora..." />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" value={quickService.description}
                onChange={(e) => setQuickService({ ...quickService, description: e.target.value })} rows="3" />
            </div>
            <div style={{ border: 'none', padding: 0, marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn-outline" onClick={resetQuickServiceForm}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : 'Crear Servicio'}</button>
            </div>
          </form>
        </Drawer>

      </div>
    </div>
  );
}