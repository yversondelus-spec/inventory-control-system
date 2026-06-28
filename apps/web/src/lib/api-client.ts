import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('access_token', data.data.accessToken);
        localStorage.setItem('refresh_token', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    me: () => apiClient.get('/auth/me'),
    refresh: (refreshToken: string) =>
      apiClient.post('/auth/refresh', { refreshToken }),
  },

  products: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/products', { params }),
    get: (id: string) => apiClient.get(`/products/${id}`),
    create: (data: unknown) => apiClient.post('/products', data),
    update: (id: string, data: unknown) => apiClient.put(`/products/${id}`, data),
    delete: (id: string) => apiClient.delete(`/products/${id}`),
    critical: () => apiClient.get('/products/critical'),
    risk: () => apiClient.get('/products/risk'),
  },

  inventory: {
    summary: () => apiClient.get('/inventory/summary'),
    critical: (params?: Record<string, unknown>) =>
      apiClient.get('/inventory/critical', { params }),
    differences: (limit?: number) =>
      apiClient.get('/inventory/differences', { params: { limit } }),
    recalculate: () => apiClient.post('/inventory/recalculate'),
  },

  alerts: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/alerts', { params }),
    summary: () => apiClient.get('/alerts/summary'),
    acknowledge: (id: string) => apiClient.put(`/alerts/${id}/acknowledge`),
    resolve: (id: string) => apiClient.put(`/alerts/${id}/resolve`),
    dismiss: (id: string) => apiClient.put(`/alerts/${id}/dismiss`),
  },

  movements: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/movements', { params }),
    summary: () => apiClient.get('/movements/summary'),
  },

  uploads: {
    create: (formData: FormData, onProgress?: (p: number) => void) =>
      apiClient.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      }),
    list: () => apiClient.get('/uploads'),
    get: (id: string) => apiClient.get(`/uploads/${id}`),
  },

  analytics: {
    dashboard: () => apiClient.get('/analytics/dashboard'),
  },

  reports: {
    dailyInventory: () => apiClient.get('/reports/daily-inventory'),
    movements: (days?: number) =>
      apiClient.get('/reports/movements', { params: { days } }),
    alerts: (days?: number) =>
      apiClient.get('/reports/alerts', { params: { days } }),
    criticalProducts: (days?: number) =>
      apiClient.get('/reports/critical-products', { params: { days } }),
    valuation: () => apiClient.get('/reports/valuation'),
  },

  audit: {
    logs: (params?: Record<string, unknown>) =>
      apiClient.get('/audit/logs', { params }),
    summary: (days?: number) =>
      apiClient.get('/audit/summary', { params: { days } }),
    export: (params?: Record<string, unknown>) =>
      apiClient.get('/audit/export', { params }),
  },
};