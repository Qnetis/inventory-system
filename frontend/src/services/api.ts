// frontend/src/services/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Только если это не запрос на логин
      if (!error.config.url?.includes('/auth/local')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API для записей
export const recordsApi = {
  getAll: async (params?: { showAll?: boolean }) => {
    const response = await api.get('/api/records', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/records/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/api/records', { data });
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/api/records/${id}`, { data });
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/api/records/${id}`);
    return response.data;
  },
  
  getStatistics: async (period: string) => {
    const response = await api.get(`/api/records/statistics?period=${period}`);
    return response.data;
  },
  
  export: async (params: { format: string; fields?: string[] }) => {
    const response = await api.post('/api/records/export', params, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// API для пользовательских полей
export const fieldsApi = {
  getAll: async () => {
    const response = await api.get('/api/custom-fields');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/custom-fields/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/api/custom-fields', { data });
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/api/custom-fields/${id}`, { data });
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/api/custom-fields/${id}`);
    return response.data;
  }
};

// API для пользователей
export const usersApi = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

// API для аутентификации
export const authApi = {
  login: async (credentials: { identifier: string; password: string }) => {
    const response = await api.post('/api/auth/local', credentials);
    return response.data;
  },
  
  me: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
  
  forgotPassword: async (email: string) => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (data: { code: string; password: string; passwordConfirmation: string }) => {
    const response = await api.post('/api/auth/reset-password', data);
    return response.data;
  }
};

export default api;