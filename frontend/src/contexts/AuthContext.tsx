/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: {
    id: number;
    name: string;
    type: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Проверка токена при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Установим токен в заголовки
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Проверим валидность токена, получив данные пользователя
        const { data } = await api.get('/api/users/me?populate=role');
        
        setUser(data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Токен невалидный, очищаем
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const { data } = await api.post('/api/auth/local', {
        identifier,
        password,
      });
      
      // Сохраняем токен
      localStorage.setItem('token', data.jwt);
      
      // Устанавливаем токен в заголовки для всех последующих запросов
      api.defaults.headers.common['Authorization'] = `Bearer ${data.jwt}`;
      
      // Получаем полные данные пользователя с ролью
      const userResponse = await api.get('/api/users/me?populate=role');
      const userData = userResponse.data;
      
      // Сохраняем пользователя
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};