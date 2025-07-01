/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  FormGroup,
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';

const ExportData: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // Получение кастомных полей с улучшенной обработкой
  const { data: customFieldsResponse, isLoading, error } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/custom-fields');
        console.log('Custom fields response for export:', response);
        return response.data;
      } catch (error) {
        console.error('Error fetching custom fields for export:', error);
        throw error;
      }
    },
  });

  // Безопасное извлечение полей
  const extractCustomFields = (response: any) => {
    console.log('Extracting custom fields from:', response);
    
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    if (Array.isArray(response)) {
      return response;
    }
    
    console.warn('Could not extract custom fields array from response:', response);
    return [];
  };

  const customFields = extractCustomFields(customFieldsResponse);
  console.log('Safe custom fields for export:', customFields);

  // Мутация для экспорта
 const exportMutation = useMutation({
    mutationFn: async () => {
      const selectedFieldsToSend = selectAll ? [] : selectedFields;
      const { data } = await api.post(
        '/api/records/export',
        { 
          format, 
          selectedFields: selectedFieldsToSend 
        },
        { 
          responseType: 'blob' 
        }
      );
      
      // Определяем тип файла
      const mimeType = format === 'csv' 
        ? 'text/csv;charset=utf-8' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      // Создаем blob с правильным типом
      const blob = new Blob([data], { type: mimeType });
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Export error:', error);
    },
  });

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllToggle = () => {
    setSelectAll((prev) => !prev);
    if (!selectAll) {
      setSelectedFields([]);
    }
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  // Состояние загрузки
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка полей...</Typography>
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
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Экспорт данных
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Формат экспорта</FormLabel>
            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'excel')}
              row
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="excel" control={<Radio />} label="Excel" />
            </RadioGroup>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Поля для экспорта</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAllToggle}
                  />
                }
                label="Экспортировать все поля"
              />

              {!selectAll && (
                <Box sx={{ ml: 3, mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Выберите поля для экспорта:
                  </Typography>
                  
                  {!Array.isArray(customFields) ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Ошибка формата данных полей. Обратитесь к администратору.
                      <br />
                      <small>Получен: {typeof customFields} вместо массива</small>
                    </Alert>
                  ) : customFields.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Нет доступных полей для экспорта
                    </Typography>
                  ) : (
                    customFields.map((field: any) => {
                      // Безопасное извлечение данных поля
                      const fieldData = field?.attributes || field;
                      const fieldId = field?.id?.toString() || '';
                      const fieldName = fieldData?.name || 'Без названия';
                      
                      if (!fieldId) {
                        console.warn('Invalid field for export:', field);
                        return null;
                      }
                      
                      return (
                        <FormControlLabel
                          key={fieldId}
                          control={
                            <Checkbox
                              checked={selectedFields.includes(fieldId)}
                              onChange={() => handleFieldToggle(fieldId)}
                            />
                          }
                          label={fieldName}
                        />
                      );
                    }).filter(Boolean) // Убираем null элементы
                  )}
                </Box>
              )}
            </FormGroup>
          </FormControl>
        </Box>

        {exportMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Произошла ошибка при экспорте данных
            <br />
            <small>{exportMutation.error?.message || 'Неизвестная ошибка'}</small>
          </Alert>
        )}

        {exportMutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Данные успешно экспортированы
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={
              exportMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={handleExport}
            disabled={
              exportMutation.isPending || 
              (!selectAll && selectedFields.length === 0) ||
              (!Array.isArray(customFields))
            }
          >
            {exportMutation.isPending ? 'Экспорт...' : 'Экспортировать'}
          </Button>
        </Box>

        {/* Отладочная информация в режиме разработки */}
        {import.meta.env.DEV && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Debug: Fields type: {typeof customFields}, Array check: {Array.isArray(customFields) ? 'true' : 'false'}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Fields length: {Array.isArray(customFields) ? customFields.length : 'N/A'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ExportData;