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

  console.log('🔍 RecordDetailPage - ID из URL:', id);

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
  });

  // Загрузка кастомных полей
  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['fields'],
    queryFn: fieldsApi.getAll,
  });

  const record = recordData?.data;
  console.log('📋 Данные записи:', record);

  // Генерация штрихкода
  useEffect(() => {
    if (record?.barcode) {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, record.barcode, {
          format: 'EAN13',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 12,
          margin: 10,
        });
        setBarcodeDataUrl(canvas.toDataURL());
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [record?.barcode]);

  // Заполнение формы при загрузке
  useEffect(() => {
    if (record) {
      const formData: any = {
        name: record.name || '',
      };

      // Добавляем динамические поля
      if (record.dynamicData) {
        Object.keys(record.dynamicData).forEach(fieldId => {
          formData[`dynamicData.${fieldId}`] = record.dynamicData[fieldId];
        });
      }

      reset(formData);
    }
  }, [record, reset]);

  // Мутации
  const updateMutation = useMutation({
    mutationFn: (updateData: any) => recordsApi.update(id!, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['record', id] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Update error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => recordsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      navigate('/records');
    },
    onError: (error) => {
      console.error('Delete error:', error);
    },
  });

  if (recordLoading || fieldsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (recordError || !record) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {recordError?.message || 'Запись не найдена'}
        </Alert>
        <Button 
          startIcon={<BackIcon />} 
          onClick={() => navigate('/records')}
          sx={{ mt: 2 }}
        >
          Вернуться к списку
        </Button>
      </Box>
    );
  }

  const fields = fieldsData?.data || [];
  const isOwner = record.owner?.id === user?.id;
  const isAdmin = user?.role?.type === 'admin';
  const canEdit = isOwner || isAdmin;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
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
        alert(`Подключение к устройству: ${device.name}\nШтрихкод: ${record?.barcode}`);
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
      default:
        return value;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Хедер */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/records')} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
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
                  {/* Штрихкод */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Штрихкод (уникальный идентификатор)"
                      value={record.barcode || ''}
                      fullWidth
                      disabled
                      variant="outlined"
                      helperText="Штрихкод генерируется автоматически и служит уникальным идентификатором записи"
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
                </Grid>

                {/* Пользовательские поля */}
                {fields.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Данные записи
                    </Typography>
                    <Grid container spacing={2}>
                      {fields.map((field: any) => {
                        const fieldData = field.attributes || field;
                        const value = record.dynamicData?.[field.id];

                        return (
                          <Grid size={{ xs: 12, sm: 6 }} key={field.id}>
                            {isEditing ? (
                              // Редактирование поля
                              <>
                                {fieldData.fieldType === 'TEXT' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.isRequired }}
                                    render={({ field: controllerField }) => (
                                      <TextField
                                        {...controllerField}
                                        label={fieldData.name}
                                        fullWidth
                                        variant="outlined"
                                        required={fieldData.isRequired}
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string}
                                      />
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'NUMBER' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.isRequired }}
                                    render={({ field: controllerField }) => (
                                      <TextField
                                        {...controllerField}
                                        label={fieldData.name}
                                        type="number"
                                        fullWidth
                                        variant="outlined"
                                        required={fieldData.isRequired}
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string}
                                      />
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'MONEY' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.isRequired }}
                                    render={({ field: controllerField }) => (
                                      <TextField
                                        {...controllerField}
                                        label={fieldData.name}
                                        type="number"
                                        fullWidth
                                        variant="outlined"
                                        required={fieldData.isRequired}
                                        InputProps={{
                                          endAdornment: <Typography>₽</Typography>
                                        }}
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string}
                                      />
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'SELECT' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.isRequired }}
                                    render={({ field: controllerField }) => (
                                      <FormControl fullWidth variant="outlined" required={fieldData.isRequired}>
                                        <InputLabel>{fieldData.name}</InputLabel>
                                        <Select
                                          {...controllerField}
                                          label={fieldData.name}
                                          error={!!errors[`dynamicData.${field.id}`]}
                                        >
                                          {fieldData.options?.map((option: string) => (
                                            <MenuItem key={option} value={option}>
                                              {option}
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'CHECKBOX' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    render={({ field: controllerField }) => (
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            {...controllerField}
                                            checked={controllerField.value || false}
                                          />
                                        }
                                        label={fieldData.name}
                                      />
                                    )}
                                  />
                                )}
                              </>
                            ) : (
                              // Просмотр поля
                              <TextField
                                label={fieldData.name}
                                value={formatFieldValue(value, fieldData.fieldType)}
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
                      startIcon={updateMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={updateMutation.isPending}
                    >
                      Сохранить
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
            {/* Информация о записи */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Информация о записи
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Создатель
                  </Typography>
                  <Typography variant="body1">
                    {record.owner?.username || record.owner?.email || 'Неизвестно'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Дата создания
                  </Typography>
                  <Typography variant="body1">
                    {record.createdAt ? format(new Date(record.createdAt), 'dd.MM.yyyy в HH:mm', { locale: ru }) : 'Неизвестно'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Последнее изменение
                  </Typography>
                  <Typography variant="body1">
                    {record.updatedAt ? format(new Date(record.updatedAt), 'dd.MM.yyyy в HH:mm', { locale: ru }) : 'Неизвестно'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Штрихкод */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Штрихкод
                </Typography>
                
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  {barcodeDataUrl && (
                    <img 
                      src={barcodeDataUrl} 
                      alt="Штрихкод" 
                      style={{ maxWidth: '100%', height: 'auto' }} 
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                  {record.barcode}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    size="small"
                  >
                    Печать
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<BluetoothIcon />}
                    onClick={handleBluetoothPrint}
                    size="small"
                  >
                    Bluetooth печать
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default RecordDetailPage;