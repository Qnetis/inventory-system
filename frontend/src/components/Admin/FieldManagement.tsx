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
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

const FieldManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    fieldType: 'TEXT',
    isRequired: false,
    options: [] as string[],
    order: 0,
  });
  const [newOption, setNewOption] = useState('');

  // Получение полей с улучшенной обработкой ошибок
  const { data: fields = [], isLoading, error } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/custom-fields?sort=order');
        console.log('Custom fields full response:', response);
        console.log('Custom fields response data:', response.data);
        
        // Проверяем различные возможные форматы ответа
        if (response?.data?.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        
        // Fallback: если данные пришли в корневом data
        if (response?.data && Array.isArray(response.data)) {
          return response.data;
        }
        
        // Если ничего не найдено, возвращаем пустой массив
        console.warn('Unexpected response format:', response);
        return [];
      } catch (error) {
        console.error('Error fetching custom fields:', error);
        throw error;
      }
    },
  });

  // Дополнительная проверка на случай если fields не массив
  const safeFields = Array.isArray(fields) ? fields : [];

  // Создание/обновление поля
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingField) {
        return api.put(`/api/custom-fields/${editingField.id}`, { data });
      } else {
        return api.post('/api/custom-fields', { data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      handleCloseDialog();
    },
  });

  // Удаление поля
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/custom-fields/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });

  const handleOpenDialog = (field?: any) => {
    if (field) {
      // Обрабатываем оба формата данных
      const fieldData = field.attributes || field;
      setEditingField(field);
      setFormData({
        name: fieldData.name || '',
        fieldType: fieldData.fieldType || 'TEXT',
        isRequired: fieldData.isRequired || false,
        options: fieldData.options || [],
        order: fieldData.order || 0,
      });
    } else {
      setEditingField(null);
      setFormData({
        name: '',
        fieldType: 'TEXT',
        isRequired: false,
        options: [],
        order: safeFields.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingField(null);
    setNewOption('');
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      });
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  // Обработка состояния загрузки
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Обработка ошибки
  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Ошибка загрузки полей. Попробуйте обновить страницу.
          <br />
          <small>Детали ошибки: {error.message}</small>
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
          Добавить поле
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Обязательное</TableCell>
              <TableCell>Опции</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeFields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Нет созданных полей
                </TableCell>
              </TableRow>
            ) : (
              safeFields.map((field: any) => {
                // Безопасное извлечение данных с поддержкой обоих форматов
                const fieldData = field?.attributes || field;
                const fieldId = field?.id;
                
                if (!fieldData || !fieldId) {
                  console.warn('Invalid field data:', field);
                  return null;
                }

                return (
                  <TableRow key={fieldId}>
                    <TableCell>
                      <DragIcon color="disabled" />
                    </TableCell>
                    <TableCell>{fieldData.name || 'Без названия'}</TableCell>
                    <TableCell>{fieldData.fieldType || 'TEXT'}</TableCell>
                    <TableCell>
                      {fieldData.isRequired ? 'Да' : 'Нет'}
                    </TableCell>
                    <TableCell>
                      {fieldData.fieldType === 'SELECT' && fieldData.options && Array.isArray(fieldData.options) && (
                        <>
                          {fieldData.options.map((opt: string, idx: number) => (
                            <Chip 
                              key={`${fieldId}-opt-${idx}`} 
                              label={opt} 
                              size="small" 
                              sx={{ mr: 0.5, mb: 0.5 }} 
                            />
                          ))}
                        </>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenDialog(field)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteMutation.mutate(fieldId)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingField ? 'Редактировать поле' : 'Создать поле'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Название поля"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              error={saveMutation.isError && !formData.name}
              helperText={saveMutation.isError && !formData.name ? 'Обязательное поле' : ''}
            />

            <FormControl fullWidth>
              <InputLabel>Тип поля</InputLabel>
              <Select
                value={formData.fieldType}
                label="Тип поля"
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value })}
              >
                <MenuItem value="TEXT">Текст</MenuItem>
                <MenuItem value="NUMBER">Число</MenuItem>
                <MenuItem value="MONEY">Деньги</MenuItem>
                <MenuItem value="SELECT">Выпадающий список</MenuItem>
                <MenuItem value="CHECKBOX">Чекбокс</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                />
              }
              label="Обязательное поле"
            />

            {formData.fieldType === 'SELECT' && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    label="Добавить опцию"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    fullWidth
                  />
                  <Button onClick={handleAddOption} variant="outlined">
                    Добавить
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {formData.options.map((option, index) => (
                    <Chip
                      key={index}
                      label={option}
                      onDelete={() => handleRemoveOption(index)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saveMutation.isPending || !formData.name}
          >
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FieldManagement;