/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Bluetooth as BluetoothIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import JsBarcode from 'jsbarcode';
import { recordsApi, fieldsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm();

  // ДОБАВЛЕНО: Детальное логирование для отладки
  console.log('🔍 RecordDetailPage - ID из URL:', id);

  // ДОБАВЛЕНО: Проверка на недопустимые ID
  React.useEffect(() => {
    if (id === 'create' || id === 'new' || !id) {
      console.log('❌ Недопустимый ID, перенаправление на список');
      navigate('/records', { replace: true });
      return;
    }
  }, [id, navigate]);

  // Загрузка записи
  const { data: recordData, isLoading: recordLoading, error: recordError } = useQuery({
    queryKey: ['record', id],
    queryFn: async () => {
      if (!id || id === 'create' || id === 'new') {
        throw new Error('Invalid record ID');
      }
      console.log('📡 Загружаем запись с ID:', id);
      return recordsApi.getById(id);
    },
    enabled: !!id && id !== 'create' && id !== 'new',
    retry: (failureCount, error: any) => {
      console.log('🔄 Попытка повтора загрузки:', failureCount, 'Ошибка:', error?.response?.status);
      // Не повторяем запрос для 404 ошибок
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // ДОБАВЛЕНО: Логирование состояния загрузки
  console.log('📦 Данные записи:', recordData);
  console.log('🎯 Record:', recordData?.data);
  console.log('❌ Ошибка загрузки:', recordError);

  // Загрузка полей
  const { data: fieldsData = { data: [] } } = useQuery({
    queryKey: ['fields'],
    queryFn: () => fieldsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Мутация для обновления записи
  const updateMutation = useMutation({
    mutationFn: (data: any) => recordsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['record', id] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setIsEditing(false);
    },
  });

  // Мутация для удаления записи
  const deleteMutation = useMutation({
    mutationFn: () => recordsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      navigate('/records');
    },
  });

  const record = recordData?.data;
  const fields = fieldsData?.data || [];

  // Определяем права доступа
  const canEdit = record?.canEdit || record?.isOwner || (user?.role?.type === 'admin');

  // Сброс формы при изменении данных записи
  useEffect(() => {
    if (record && !recordLoading) {
      const formData: any = {
        name: record.name || '',
      };

      // Заполняем динамические поля
      if (record.dynamicData) {
        Object.keys(record.dynamicData).forEach(fieldId => {
          formData[`dynamicData.${fieldId}`] = record.dynamicData[fieldId];
        });
      }

      reset(formData);
    }
  }, [record, recordLoading, reset]);

  // Генерация штрихкода
  useEffect(() => {
    if (record?.barcode && !recordLoading) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, record.barcode, {
          format: 'EAN13',
          width: 2,
          height: 100,
          displayValue: true,
        });
        setBarcodeDataUrl(canvas.toDataURL());
      } catch (error) {
        console.error('Ошибка генерации штрихкода:', error);
      }
    }
  }, [record?.barcode, recordLoading]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Сброс формы к исходным данным
    if (record) {
      const formData: any = {
        name: record.name || '',
      };
      
      if (record.dynamicData) {
        Object.keys(record.dynamicData).forEach(fieldId => {
          formData[`dynamicData.${fieldId}`] = record.dynamicData[fieldId];
        });
      }
      
      reset(formData);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      deleteMutation.mutate();
    }
  };

  const onSubmit = (data: any) => {
    console.log('Form data:', data);
    
    const updateData: any = {
      name: data.name || record?.name,
      dynamicData: {},
    };

    // Собираем данные динамических полей
    Object.keys(data).forEach(key => {
      if (key.startsWith('dynamicData.')) {
        const fieldId = key.replace('dynamicData.', '');
        updateData.dynamicData[fieldId] = data[key];
      }
    });

    console.log('Update data:', updateData);
    updateMutation.mutate(updateData);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Печать штрихкода</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .barcode { margin: 20px 0; }
              .info { margin: 10px 0; font-size: 14px; }
            </style>
          </head>
          <body>
            <h2>${record?.name || 'Запись'}</h2>
            <div class="info">Инвентарный номер: ${record?.inventoryNumber}</div>
            <div class="info">Штрихкод: ${record?.barcode}</div>
            <div class="barcode">
              <img src="${barcodeDataUrl}" alt="Штрихкод" />
            </div>
            <div class="info">Дата создания: ${record?.createdAt ? format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : ''}</div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
    }
  };

  const handleBluetoothPrint = async () => {
    try {
      if ('bluetooth' in navigator) {
        // Простая реализация для демонстрации
        // В реальном проекте здесь должна быть интеграция с конкретным принтером
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['battery_service'] }] // Замените на реальный сервис принтера
        });
        
        console.log('Bluetooth device:', device);
        alert(`Подключение к устройству: ${device.name}\nИнвентарный номер: ${record?.inventoryNumber}\nШтрихкод: ${record?.barcode}`);
      } else {
        alert('Bluetooth не поддерживается в этом браузере');
      }
    } catch (error) {
      console.error('Bluetooth error:', error);
      alert('Ошибка подключения к Bluetooth устройству');
    }
  };

  const formatFieldValue = (value: any, fieldType: string) => {
    if (!value) return '';
    
    switch (fieldType) {
      case 'MONEY':
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB'
        }).format(parseFloat(value));
      case 'NUMBER':
        return new Intl.NumberFormat('ru-RU').format(parseFloat(value));
      case 'CHECKBOX':
        return value ? 'Да' : 'Нет';
      case 'DATE':
        return format(new Date(value), 'dd.MM.yyyy', { locale: ru });
      default:
        return String(value);
    }
  };

  if (recordLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка записи...</Typography>
      </Box>
    );
  }

  if (recordError || !record) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ошибка загрузки записи. Возможно, запись не найдена или у вас нет прав доступа.
          {recordError && (
            <Box sx={{ mt: 1, fontSize: '0.875rem', opacity: 0.8 }}>
              Детали ошибки: {(recordError as any)?.message || 'Неизвестная ошибка'}
            </Box>
          )}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/records')}>
          Вернуться к списку
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/records')} sx={{ mr: 1 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? 'Редактирование записи' : 'Просмотр записи'}
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {!isEditing && canEdit && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Редактировать
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Удалить
            </Button>
          )}
        </Box>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Основная информация */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Основная информация
                </Typography>
                
                <Grid container spacing={2}>
                  {/* Инвентарный номер */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Инвентарный номер"
                      value={record.inventoryNumber || ''}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>

                  {/* Штрихкод */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Штрихкод"
                      value={record.barcode || ''}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>

                  {/* Название записи */}
                  <Grid size={12}>
                    {isEditing ? (
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Название записи"
                            fullWidth
                            variant="outlined"
                            error={!!errors.name}
                            helperText={errors.name?.message as string}
                          />
                        )}
                      />
                    ) : (
                      <TextField
                        label="Название записи"
                        value={record.name || ''}
                        fullWidth
                        disabled
                        variant="outlined"
                      />
                    )}
                  </Grid>

                  {/* Информация о создании */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Дата создания"
                      value={record.createdAt ? format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : ''}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Владелец"
                      value={record.owner?.username || record.owner?.fullName || 'Неизвестно'}
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                </Grid>

                {/* Динамические поля */}
                {fields.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      Дополнительные поля
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {fields.map((field: any) => {
                        const fieldValue = record.dynamicData?.[field.id];
                        
                        return (
                          <Grid size={{ xs: 12, sm: 6 }} key={field.id}>
                            {isEditing ? (
                              <Controller
                                name={`dynamicData.${field.id}`}
                                control={control}
                                rules={{ required: field.isRequired }}
                                render={({ field: formField }) => {
                                  switch (field.fieldType) {
                                    case 'SELECT':
                                      return (
                                        <FormControl fullWidth>
                                          <InputLabel>{field.name}</InputLabel>
                                          <Select
                                            {...formField}
                                            label={field.name}
                                            error={!!(errors as any).dynamicData?.[field.id]}
                                          >
                                            {field.options?.map((option: string) => (
                                              <MenuItem key={option} value={option}>
                                                {option}
                                              </MenuItem>
                                            ))}
                                          </Select>
                                        </FormControl>
                                      );
                                    case 'CHECKBOX':
                                      return (
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              {...formField}
                                              checked={formField.value || false}
                                            />
                                          }
                                          label={field.name}
                                        />
                                      );
                                    case 'NUMBER':
                                    case 'MONEY':
                                      return (
                                        <TextField
                                          {...formField}
                                          label={field.name}
                                          type="number"
                                          fullWidth
                                          variant="outlined"
                                          error={!!(errors as any).dynamicData?.[field.id]}
                                          helperText={(errors as any).dynamicData?.[field.id]?.message as string}
                                        />
                                      );
                                    default:
                                      return (
                                        <TextField
                                          {...formField}
                                          label={field.name}
                                          fullWidth
                                          variant="outlined"
                                          error={!!(errors as any).dynamicData?.[field.id]}
                                          helperText={(errors as any).dynamicData?.[field.id]?.message as string}
                                        />
                                      );
                                  }
                                }}
                              />
                            ) : (
                              <TextField
                                label={field.name}
                                value={formatFieldValue(fieldValue, field.fieldType)}
                                fullWidth
                                disabled
                                variant="outlined"
                              />
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}

                {/* Кнопки управления формой */}
                {isEditing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                    >
                      Отмена
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Боковая панель */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Штрихкод
                </Typography>
                
                {barcodeDataUrl && (
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <img 
                      src={barcodeDataUrl} 
                      alt="Штрихкод" 
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    fullWidth
                  >
                    Печать
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<BluetoothIcon />}
                    onClick={handleBluetoothPrint}
                    fullWidth
                  >
                    Bluetooth печать
                  </Button>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  <strong>Права доступа:</strong><br />
                  {canEdit ? (
                    <Chip label="Редактирование разрешено" color="success" size="small" />
                  ) : (
                    <Chip label="Только просмотр" color="default" size="small" />
                  )}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>

      {/* Уведомления об ошибках */}
      {updateMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Ошибка при сохранении записи. Попробуйте снова.
        </Alert>
      )}

      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Ошибка при удалении записи. Попробуйте снова.
        </Alert>
      )}
    </Box>
  );
};

export default RecordDetailPage;