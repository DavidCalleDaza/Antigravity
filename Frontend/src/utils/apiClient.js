const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1';
export const SERVER_BASE_URL = API_BASE_URL.replace('/api/v1', '');

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor(baseUrl) {
    let cleanUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    if (cleanUrl && !cleanUrl.endsWith('/api/v1')) {
      cleanUrl = `${cleanUrl}/api/v1`;
    }
    this.baseUrl = cleanUrl;
  }

  async request(endpoint, options = {}) {
    const token = useStore.getState().currentUser?.token;

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) return null;

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: `HTTP ${response.status}` };
    }

    if (response.status === 401) {
      console.warn("401 recibido:", endpoint);

      // Solo forzar logout si SÍ había un token y el backend lo rechazó.
      // Si no había token (ej. carrera con la rehidratación de Zustand al
      // recargar en dev), no es una sesión inválida real — solo propaga el error.
      if (endpoint === "/auth/me" && token) {
        useStore.getState().logout();
        window.location.href = "/login";
      }

      throw new ApiError(
          data.detail || "No autorizado",
          response.status,
          data
      );
    }

    if (!response.ok) {
        throw new ApiError(
            data.detail || `HTTP ${response.status}`,
            response.status,
            data
        );
    }

    return data;
}

  async requestFormData(endpoint, body, method = 'POST') {
    const token = useStore.getState().currentUser?.token;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: `HTTP ${response.status}` };
    }

    if (!response.ok) {
      if (response.status === 401) {
        console.warn("401 recibido:", endpoint);

        throw new ApiError(
            data.detail || "No autorizado",
            response.status,
            data
        );
      }
    }
    return data;
  }

  /**
   * Realiza una petición GET/POST y retorna un Blob (binario), enviando el
   * header de autenticación igual que `request`. Pensado para descargas de
   * archivos (PDF, etc.) donde no se puede depender de `window.open(url)`
   * porque este último no adjunta el Authorization header.
   */
  async getBlob(endpoint, options = {}) {
    const token = useStore.getState().currentUser?.token;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      method: options.method || 'GET',
      headers,
    });

    if (!response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {
        data = { detail: `HTTP ${response.status}` };
      }

      if (response.status === 401) {
        console.warn("401 recibido:", endpoint);

        throw new ApiError(
            data.detail || "No autorizado",
            response.status,
            data
        );
      }
    }
    return response.blob();
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export { ApiClient, ApiError };

/**
 * Dispara la descarga de un Blob en el navegador (crea un <a> temporal con
 * un object URL). Usado para descargar el PDF de la factura obtenido vía
 * billingClient.downloadInvoicePDF().
 */
export function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

import { useStore } from '../store/useStore';
export const apiClient = new ApiClient(API_BASE_URL);

export const authClient = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  googleExchange: (code) => apiClient.post('/auth/google/exchange', { code }),
  me: () => apiClient.get('/auth/me'),
  updateMe: (data) => apiClient.patch('/auth/me', data),
  deleteAccount: (permanent = false) =>
    permanent
      ? apiClient.delete('/auth/me?permanent=true')
      : apiClient.delete('/auth/me?permanent=false'),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.requestFormData('/auth/me/avatar', formData, 'POST');
  },
  requestPasswordReset: (email) => apiClient.post('/auth/password-recovery/request', { email }),
  resetPassword: (email, code, newPassword) =>
    apiClient.post('/auth/password-recovery/reset', { email, code, new_password: newPassword }),
};

export const agendaClient = {
  // Sellers (public)
  listSellers: () => apiClient.get('/agenda/sellers'),
  getSeller: (id) => apiClient.get(`/agenda/sellers/${id}`),
  // Available slots
  getSlots: (sellerId, date, serviceId) => {
    let query = `seller_id=${sellerId}&date=${date}`;
    if (serviceId) query += `&service_id=${serviceId}`;
    return apiClient.get(`/agenda/slots?${query}`);
  },
  // Templates (seller only)
  listTemplates: () => apiClient.get('/agenda/availability/templates'),
  createTemplate: (data) => apiClient.post('/agenda/availability/templates', data),
  updateTemplate: (id, data) => apiClient.patch(`/agenda/availability/templates/${id}`, data),
  deleteTemplate: (id) => apiClient.delete(`/agenda/availability/templates/${id}`),
  // Overrides (seller only)
  listOverrides: (dateFrom, dateTo) => {
    let query = '';
    if (dateFrom) query += `date_from=${dateFrom}`;
    if (dateTo) query += `${query ? '&' : ''}date_to=${dateTo}`;
    return apiClient.get(`/agenda/availability/overrides${query ? `?${query}` : ''}`);
  },
  createOverride: (data) => apiClient.post('/agenda/availability/overrides', data),
  deleteOverride: (id) => apiClient.delete(`/agenda/availability/overrides/${id}`),
  // Appointments
  listAppointments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/agenda/appointments${query ? `?${query}` : ''}`);
  },
  createAppointment: (data) => apiClient.post('/agenda/appointments', data),
  updateAppointment: (id, data) => apiClient.patch(`/agenda/appointments/${id}`, data),
  // Store locations (migrated to locations module)
  listStoreLocations: () => apiClient.get('/locations/store-locations'),
  createStoreLocation: (data) => apiClient.post('/locations/store-locations', data),
  deleteStoreLocation: (id) => apiClient.delete(`/locations/store-locations/${id}`),
};

export const productClient = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/products${query ? `?${query}` : ''}`);
  },
  get: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.patch(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
};

export const serviceClient = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/services${query ? `?${query}` : ''}`);
  },
  get: (id) => apiClient.get(`/services/${id}`),
  create: (data) => apiClient.post('/services', data),
  update: (id, data) => apiClient.patch(`/services/${id}`, data),
  delete: (id) => apiClient.delete(`/services/${id}`),
  listCategories: () => apiClient.get('/services/categories'),
};

export const socialClient = {
  listAccounts: () => apiClient.get('/social/accounts'),
  getAuthorizeUrl: (platform) => apiClient.get(`/social/authorize/${platform}`),
  publish: (data) => apiClient.post('/social/publish', data),
  listPosts: () => apiClient.get('/social/posts'),
  deleteAccount: (platform) => apiClient.delete(`/social/accounts/platform/${platform}`),
  deleteAccountById: (accountId) => apiClient.delete(`/social/accounts/${accountId}`),
  updateAccount: (accountId, data) => apiClient.patch(`/social/accounts/${accountId}`, data),
  renewAccountToken: (accountId, access_token) => apiClient.patch(`/social/accounts/${accountId}/token`, { access_token }),
  connectManualValidate: (data) => apiClient.post('/social/accounts/manual/validate', data),
  connectManualConfirm: (data) => apiClient.post('/social/accounts/manual/confirm', data),
  getAppCredentials: (platformGroup) => apiClient.get(`/social/accounts/app-credentials/${platformGroup}`),
  revealAppCredentials: (platformGroup, password) => apiClient.post(`/social/accounts/app-credentials/${platformGroup}/reveal`, { password }),
  reconcileTikTokPosts: () => apiClient.post('/social/posts/reconcile-tiktok', {}),
};

export const adminSocialClient = {
  searchUsers: (search) => apiClient.get(`/admin/social/users?search=${encodeURIComponent(search)}`),
  listAccounts: (userId) => apiClient.get(`/admin/social/accounts/${userId}`),
  connectManualValidate: (userId, data) => apiClient.post(`/admin/social/accounts/${userId}/manual/validate`, data),
  connectManualConfirm: (userId, data) => apiClient.post(`/admin/social/accounts/${userId}/manual/confirm`, data),
  deleteAccount: (userId, platform) => apiClient.delete(`/admin/social/accounts/${userId}/${platform}`),
};

export const billingClient = {
  // Customers
  listCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/customers${query ? `?${query}` : ''}`);
  },
  createCustomer: (data) => apiClient.post('/billing/customers', data),
  updateCustomer: (id, data) => apiClient.patch(`/billing/customers/${id}`, data),
  getCustomerTaxRate: (id) => apiClient.get(`/billing/customers/${id}/tax-rate`),
  listMentionableCustomers: (search, limit = 20) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (search) query.set('search', search);
    return apiClient.get(`/billing/customers/mentionable?${query.toString()}`);
  },
  getCountrySettings: (countryCode) => apiClient.get(`/billing/country-settings/${countryCode}`),
  upsertCountrySettings: (countryCode, payload) => apiClient.put(`/billing/country-settings/${countryCode}`, payload),

  // Invoices
  listInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/invoices${query ? `?${query}` : ''}`);
  },
  createInvoice: (data) => apiClient.post('/billing/invoices', data),
  getInvoice: (id) => apiClient.get(`/billing/invoices/${id}`),
  updateInvoice: (id, data) => apiClient.patch(`/billing/invoices/${id}`, data),
  cancelInvoice: (id) => apiClient.post(`/billing/invoices/${id}/cancel`),
  markPaid: (id) => apiClient.post(`/billing/invoices/${id}/mark-paid`),

  // PDF & DIAN
  getInvoicePDFUrl: (id) => `${SERVER_BASE_URL}/api/v1/billing/invoices/${id}/download`,
  downloadInvoicePDF: (id) => apiClient.getBlob(`/billing/invoices/${id}/download`),
  sendToDian: (id) => apiClient.post(`/billing/invoices/${id}/send-dian`),
  getDianStatus: (id) => apiClient.get(`/billing/invoices/${id}/dian-status`),

  // Send Invoice Email
  sendInvoiceEmail: (id) => apiClient.post(`/billing/invoices/${id}/send-email`),

  // Credit Notes
  createCreditNote: (data) => apiClient.post('/billing/credit-notes', data),

  // Summary
  getSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/summary${query ? `?${query}` : ''}`);
  },

  // Medios de pago (opciones validas para formularios de factura)
  getPaymentMeans: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/payment-means${query ? `?${query}` : ''}`);
  },

  // Estadisticas de metodos de pago (distribucion de ingresos por metodo)
  getPaymentStats: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/payment-stats${query ? `?${query}` : ''}`);
  },

  // Top productos y servicios más vendidos (separados)
  getTopSelling: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/top-selling${query ? `?${query}` : ''}`);
  },

  // Ingresos mensuales separados por producto vs servicio.
  getRevenueByLine: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/revenue-by-line${query ? `?${query}` : ''}`);
  },

  // Distribución de ingresos por categoría, separado por tipo de entidad.
  getCategoryDistribution: (entityType, params = {}) => {
  const query = new URLSearchParams({ entity_type: entityType, ...params }).toString();
  return apiClient.get(`/billing/category-distribution${query ? `?${query}` : ''}`);
},

};

export const categoryClient = {
  list: (entityType = 'product') =>
    apiClient.get(`/categories?entity_type=${entityType}`),
  create: (data) =>
    apiClient.post('/categories', data),
  update: (id, data) =>
    apiClient.patch(`/categories/${id}`, data),
  delete: (id) =>
    apiClient.delete(`/categories/${id}`),
};

export const locationClient = {
  getNeighborhoods: (cityIdentifier) => 
    apiClient.get(`/locations/neighborhoods/${encodeURIComponent(cityIdentifier)}`),
  createNeighborhood: (data) => 
    apiClient.post('/locations/neighborhoods', data),
};

export const aiClient = {
  generateCopy: (data) => apiClient.post('/ai/generate-copy', data),
  generateVideo: (data) => apiClient.post('/ai/generate-video', data),
  getTaskStatus: (taskId) => apiClient.get(`/ai/task/${taskId}`),
  enhanceImage: (file, prompt) => {
    const formData = new FormData();
    formData.append('file', file);
    if (prompt) formData.append('prompt', prompt);
    return apiClient.requestFormData('/ai/enhance-image', formData);
  },
  enhanceAudio: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.requestFormData('/ai/enhance-audio', formData);
  },
  enhanceVideo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.requestFormData('/ai/enhance-video', formData);
  },
  describeMedia: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.requestFormData('/ai/describe-media', formData);
  },
  improvePostCopy: (data) => apiClient.post('/ai/improve-post-copy', data),
};

export const tokensClient = {
  getUsage: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/tokens/usage${query ? `?${query}` : ''}`);
  },
  getHourlyUsage: () => apiClient.get('/tokens/usage/hourly'),
  getExchangeRate: () => apiClient.get('/tokens/exchange-rate'),
  updateExchangeRate: (usdToCop) => apiClient.put('/tokens/exchange-rate', { usd_to_cop: usdToCop }),
};

export const whatsappClient = {
  generateOtp: () => apiClient.post('/whatsapp/link/otp'),
  getLinkStatus: () => apiClient.get('/whatsapp/link/status'),
  unlink: () => apiClient.delete('/whatsapp/link'),
};

export const contactClient = {
  send: (payload) => apiClient.post('/contact', payload),
};
