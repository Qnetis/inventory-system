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
  // Получение всех записей с поддержкой параметра showAll
  getAll: async (params?: { showAll?: boolean }) => {
    console.log('API getAll вызван с параметрами:', params);
    
    const queryParams: any = {};
    
    // Передаем параметр showAll если он указан
    if (params?.showAll !== undefined) {
      queryParams.showAll = params.showAll;
    }
    
    console.log('Отправляем запрос с параметрами:', queryParams);
    const response = await api.get('/api/records', { params: queryParams });
    console.log('API ответ:', response.data);
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
// Обновленная версия API для пользовательских полей с поддержкой Strapi 5

export const fieldsApi = {
  getAll: async () => {
    try {
      console.log('📡 API: Getting all custom fields');
      const response = await api.get('/api/custom-fields?sort=order');
      console.log('📡 API: Custom fields response:', response);
      return response.data;
    } catch (error) {
      console.error('📡 API: Error getting custom fields:', error);
      throw error;
    }
  },
  
  getById: async (id: string) => {
    try {
      console.log('📡 API: Getting custom field by ID:', id);
      const response = await api.get(`/api/custom-fields/${id}`);
      console.log('📡 API: Custom field response:', response);
      return response.data;
    } catch (error) {
      console.error('📡 API: Error getting custom field:', error);
      throw error;
    }
  },
  
  create: async (data: any) => {
    try {
      console.log('📡 API: Creating custom field with data:', data);
      const response = await api.post('/api/custom-fields', { data });
      console.log('📡 API: Create response:', response);
      return response.data;
    } catch (error) {
      console.error('📡 API: Error creating custom field:', error);
      throw error;
    }
  },
  
  update: async (id: string, data: any) => {
    try {
      console.log('📡 API: Updating custom field:', id, 'with data:', data);
      const response = await api.put(`/api/custom-fields/${id}`, { data });
      console.log('📡 API: Update response:', response);
      return response.data;
    } catch (error) {
      console.error('📡 API: Error updating custom field:', error);
      throw error;
    }
  },
  
  delete: async (id: string) => {
    try {
      console.log('📡 API: Deleting custom field with ID:', id);
      
      // Валидация ID
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid field ID provided');
      }
      
      // Выполняем запрос на удаление
      const response = await api.delete(`/api/custom-fields/${id}`);
      console.log('📡 API: Delete response:', response);
      
      return response.data;
    } catch (error: any) {
      console.error('📡 API: Error deleting custom field:', {
        id,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Дополнительная информация для отладки
      if (error.response) {
        console.error('📡 API: Response error details:', {
          headers: error.response.headers,
          config: error.config
        });
      }
      
      throw error;
    }
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