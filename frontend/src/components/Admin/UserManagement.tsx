/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Typography,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Switch,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 1, // Default to authenticated role
  });

  // Получение пользователей с улучшенной обработкой
  const { data: usersResponse, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/users?populate=role');
        console.log('Users API response:', response);
        return response.data;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
  });

  // Получение ролей с улучшенной обработкой
  const { data: rolesResponse, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/users-permissions/roles');
        console.log('Roles API response:', response);
        
        if (response?.data?.roles && Array.isArray(response.data.roles)) {
          return response.data.roles;
        }
        
        console.warn('Unexpected roles response format:', response);
        return [];
      } catch (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }
    },
  });

  // Безопасное извлечение данных
  const users = Array.isArray(usersResponse) ? usersResponse : [];
  const roles = Array.isArray(rolesResponse) ? rolesResponse : [];

  console.log('Safe users:', users);
  console.log('Safe roles:', roles);

  // Создание/обновление пользователя
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingUser) {
        // При обновлении не отправляем пароль, если он не изменен
        const updateData = { ...data };
        if (!updateData.password) {
          delete updateData.password;
        }
        return api.put(`/api/users/${editingUser.id}`, updateData);
      } else {
        return api.post('/api/users', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseDialog();
    },
  });

  // Удаление пользователя
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        fullName: user.fullName || '',
        phone: user.phone || '',
        role: user.role?.id || 1,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  // Состояния загрузки
  if (usersLoading || rolesLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Обработка ошибок
  if (usersError || rolesError) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Ошибка загрузки данных. Попробуйте обновить страницу.
          <br />
          <small>
            {usersError?.message || rolesError?.message || 'Неизвестная ошибка'}
          </small>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить пользователя
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Логин</TableCell>
              <TableCell>ФИО</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Нет пользователей
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => {
                if (!user || !user.id) {
                  console.warn('Invalid user data:', user);
                  return null;
                }

                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.username || 'Без логина'}</TableCell>
                    <TableCell>{user.fullName || '-'}</TableCell>
                    <TableCell>{user.email || 'Без email'}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role?.name || 'User'}
                        color={user.role?.type === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenDialog(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteMutation.mutate(user.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              }).filter(Boolean) // Убираем null элементы
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Логин"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!!editingUser}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              helperText={editingUser ? 'Оставьте пустым, чтобы не менять' : ''}
            />

            <TextField
              fullWidth
              label="ФИО"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />

            <TextField
              fullWidth
              label="Телефон"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>Администратор:</Typography>
              <Switch
                checked={formData.role === roles.find((r: any) => r?.type === 'admin')?.id}
                onChange={(e) => {
                  const adminRole = roles.find((r: any) => r?.type === 'admin');
                  const userRole = roles.find((r: any) => r?.type === 'authenticated');
                  setFormData({
                    ...formData,
                    role: e.target.checked ? adminRole?.id : userRole?.id,
                  });
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;