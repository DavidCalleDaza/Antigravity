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

    if (!response.ok) {
      if (response.status === 401) {
        useStore.getState().logout();
        window.location.href = '/login';
      }
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
        useStore.getState().logout();
        window.location.href = '/login';
      }
      throw new ApiError(
        data.detail || `HTTP ${response.status}`,
        response.status,
        data
      );
    }
    return data;
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

import { useStore } from '../store/useStore';
export const apiClient = new ApiClient(API_BASE_URL);

export const authClient = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
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
  deleteAccount: (platform) => apiClient.delete(`/social/accounts/${platform}`),
};

export const billingClient = {
  // Customers
  listCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/customers${query ? `?${query}` : ''}`);
  },
  createCustomer: (data) => apiClient.post('/billing/customers', data),
  updateCustomer: (id, data) => apiClient.patch(`/billing/customers/${id}`, data),

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
  getInvoicePDFUrl: (id) => `${SERVER_BASE_URL}/api/v1/billing/invoices/${id}/pdf`,
  sendToDian: (id) => apiClient.post(`/billing/invoices/${id}/send-dian`),
  getDianStatus: (id) => apiClient.get(`/billing/invoices/${id}/dian-status`),

  // Credit Notes
  createCreditNote: (data) => apiClient.post('/billing/credit-notes', data),

  // Summary
  getSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/billing/summary${query ? `?${query}` : ''}`);
  },
};

