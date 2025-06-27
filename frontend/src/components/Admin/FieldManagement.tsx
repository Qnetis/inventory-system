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
  Snackbar,
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
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Получение полей с улучшенной обработкой ошибок
  const { data: fields = [], isLoading, error } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      try {
        console.log('🚀 QUERY STARTING - about to fetch custom fields');
        const response = await api.get('/api/custom-fields?sort=order');
        console.log('Custom fields full response:', response);
        console.log('Custom fields response data:', response.data);
        
        let extractedFields = [];
        
        // Проверяем различные возможные форматы ответа
        if (response?.data?.data && Array.isArray(response.data.data)) {
          extractedFields = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          extractedFields = response.data;
        } else {
          console.warn('Unexpected response format:', response);
          return [];
        }
        
        // Детальное логирование структуры каждого поля
        console.log('🔍 DETAILED FIELD STRUCTURE ANALYSIS:');
        extractedFields.forEach((field: any, index: number) => {
          console.log(`\n--- Field ${index + 1} ---`);
          console.log('Field object:', field);
          console.log('field.id:', field.id);
          console.log('field.documentId:', field.documentId);
          console.log('field.attributes:', field.attributes);
          console.log('Field name:', field.name || field.attributes?.name);
          console.log('Field type:', field.fieldType || field.attributes?.fieldType);
          
          // Проверяем все возможные варианты ID
          const possibleIds = {
            'field.id': field.id,
            'field.documentId': field.documentId,
            'field.attributes?.id': field.attributes?.id,
            'field.attributes?.documentId': field.attributes?.documentId
          };
          console.log('All possible IDs:', possibleIds);
        });
        
        return extractedFields;
      } catch (error) {
        console.error('Error fetching custom fields:', error);
        throw error;
      }
    },
    enabled: true,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Дополнительная проверка на случай если fields не массив
  const safeFields = Array.isArray(fields) ? fields : [];

  // Создание/обновление поля
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('💾 Saving field data:', data);
      if (editingField) {
        console.log('📝 Updating field with ID:', editingField.id);
        return api.put(`/api/custom-fields/${editingField.id}`, { data });
      } else {
        console.log('➕ Creating new field');
        return api.post('/api/custom-fields', { data });
      }
    },
    onSuccess: (response) => {
      console.log('✅ Save successful:', response);
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      handleCloseDialog();
      setNotification({
        open: true,
        message: editingField ? 'Поле успешно обновлено' : 'Поле успешно создано',
        severity: 'success'
      });
    },
    onError: (error: any) => {
      console.error('❌ Save error:', error);
      setNotification({
        open: true,
        message: `Ошибка сохранения: ${error.response?.data?.error?.message || error.message}`,
        severity: 'error'
      });
    }
  });

  // Удаление поля с улучшенной обработкой ошибок
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Starting delete operation for field ID:', id);
      
      if (!id) {
        throw new Error('ID поля не указан');
      }

      try {
        const response = await api.delete(`/api/custom-fields/${id}`);
        console.log('✅ Delete response:', response);
        return response.data;
      } catch (error: any) {
        console.error('❌ Delete error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ Delete successful for field ID:', variables);
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      setNotification({
        open: true,
        message: 'Поле успешно удалено',
        severity: 'success'
      });
    },
    onError: (error: any, variables) => {
      console.error('❌ Delete mutation error for field ID:', variables, error);
      
      let errorMessage = 'Неизвестная ошибка';
      
      if (error.response?.status === 404) {
        errorMessage = 'Поле не найдено';
      } else if (error.response?.status === 403) {
        errorMessage = 'Недостаточно прав для удаления';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setNotification({
        open: true,
        message: `Ошибка удаления: ${errorMessage}`,
        severity: 'error'
      });
    }
  });

  const handleOpenDialog = (field?: any) => {
    if (field) {
      // Обрабатываем оба формата данных
      const fieldData = field.attributes || field;
      
      // Определяем правильный ID для редактирования
      let fieldId = null;
      if (field.documentId) {
        fieldId = field.documentId;
      } else if (field.id) {
        fieldId = field.id;
      } else if (field.attributes?.documentId) {
        fieldId = field.attributes.documentId;
      } else if (field.attributes?.id) {
        fieldId = field.attributes.id;
      }
      
      console.log('📝 Opening edit dialog for field:', {
        name: fieldData.name,
        id: fieldId,
        fullField: field
      });
      
      // Сохраняем поле с правильным ID
      setEditingField({ ...field, id: fieldId });
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

  const handleDelete = (field: any) => {
    const fieldData = field.attributes || field;
    
    // Ищем правильный ID среди всех возможных вариантов
    const possibleIds = {
      'field.id': field.id,
      'field.documentId': field.documentId,
      'field.attributes?.id': field.attributes?.id,
      'field.attributes?.documentId': field.attributes?.documentId
    };
    
    console.log('🗑️ Delete button clicked for field:', {
      fieldName: fieldData.name,
      fullField: field,
      possibleIds: possibleIds
    });
    
    // Определяем, какой ID использовать
    let fieldId = null;
    
    // Приоритет: documentId > id
    if (field.documentId) {
      fieldId = field.documentId;
      console.log('✅ Using field.documentId:', fieldId);
    } else if (field.id) {
      fieldId = field.id;
      console.log('✅ Using field.id:', fieldId);
    } else if (field.attributes?.documentId) {
      fieldId = field.attributes.documentId;
      console.log('✅ Using field.attributes.documentId:', fieldId);
    } else if (field.attributes?.id) {
      fieldId = field.attributes.id;
      console.log('✅ Using field.attributes.id:', fieldId);
    }

    if (!fieldId) {
      console.error('❌ No valid ID found in field object:', field);
      setNotification({
        open: true,
        message: 'Ошибка: ID поля не найден',
        severity: 'error'
      });
      return;
    }

    if (window.confirm(`Вы уверены, что хотите удалить поле "${fieldData.name}"?`)) {
      console.log('🗑️ User confirmed deletion, proceeding with ID:', fieldId);
      deleteMutation.mutate(fieldId);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
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
                
                // Определяем правильный ID
                let fieldId = null;
                if (field.documentId) {
                  fieldId = field.documentId;
                } else if (field.id) {
                  fieldId = field.id;
                } else if (field.attributes?.documentId) {
                  fieldId = field.attributes.documentId;
                } else if (field.attributes?.id) {
                  fieldId = field.attributes.id;
                }
                
                if (!fieldData || !fieldId) {
                  console.warn('Invalid field data:', field);
                  return null;
                }

                return (
                  <TableRow key={fieldId}>
                    <TableCell>
                      <DragIcon color="disabled" />
                    </TableCell>
                    <TableCell>
                      {fieldData.name || 'Без названия'}
                      <br />
                      <small style={{ color: '#666' }}>ID: {fieldId}</small>
                    </TableCell>
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
                      <IconButton 
                        onClick={() => handleOpenDialog(field)}
                        disabled={saveMutation.isPending}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(field)}
                        color="error"
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? <CircularProgress size={20} /> : <DeleteIcon />}
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
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as any })}
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
                    fullWidth
                    label="Добавить опцию"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
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
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saveMutation.isPending || !formData.name}
          >
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FieldManagement;