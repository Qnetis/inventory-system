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
  Share as ShareIcon,
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
    enabled: !!id && id !== 'create' && id !== 'new'
  });

  // Загрузка кастомных полей
  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['fields'],
    queryFn: fieldsApi.getAll,
  });

  const record = recordData?.data;
  console.log('📋 Данные записи:', record);

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

  const fields = fieldsData?.data || [];
  const isOwner = record?.owner?.id === user?.id;
  const isAdmin = user?.role?.type === 'admin';
  const canEdit = isOwner || isAdmin;

  // Генерация штрихкода
  useEffect(() => {
    if (record?.barcode) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, record.barcode, {
          format: "EAN13",
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        });
        setBarcodeDataUrl(canvas.toDataURL('image/png'));
      } catch (error) {
        console.error('Ошибка генерации штрихкода:', error);
      }
    }
  }, [record?.barcode]);

  // Заполнение формы при загрузке записи
  useEffect(() => {
    if (record) {
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
  }, [record, reset]);

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

  // Функция поделиться изображением штрихкода
  const handleShare = async () => {
    if (!record?.barcode) {
      alert('Штрихкод не найден');
      return;
    }

    try {
      // Создаем canvas для штрихкода 25x50 мм (для качества используем 300 DPI)
      const mmToPx = (mm: number) => (mm * 300) / 25.4; // 300 DPI для качественного изображения
      const width = mmToPx(50); // 50 мм ширина
      const height = mmToPx(25); // 25 мм высота

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Генерируем штрихкод с нужными параметрами
      JsBarcode(canvas, record.barcode, {
        format: "EAN13",
        width: 3,
        height: height * 0.7, // 70% высоты под сам штрихкод
        displayValue: true,
        fontSize: Math.min(width / 15, 24), // Адаптивный размер шрифта
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000'
      });

      // Конвертируем canvas в blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          }
        }, 'image/png', 1.0);
      });

      // Создаем файл для отправки
      const file = new File([blob], `barcode-${record.barcode}.png`, {
        type: 'image/png',
      });

      const shareData: any = {
        title: `Штрихкод ${record.barcode}`,
        text: `Штрихкод: ${record.barcode}`,
        files: [file]
      };

      // Проверяем поддержку Web Share API с файлами
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('Успешно поделились штрихкодом');
      } else {
        // Fallback: скачиваем изображение или копируем в буфер обмена
        if (navigator.clipboard && 'write' in navigator.clipboard) {
          // Пытаемся скопировать изображение в буфер обмена
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            alert('Изображение штрихкода скопировано в буфер обмена');
          } catch (clipboardError) {
            console.error('Ошибка копирования в буфер обмена:', clipboardError);
            // Fallback: скачиваем файл
            downloadBarcodeImage(canvas, record.barcode);
          }
        } else {
          // Последний fallback: скачиваем файл
          downloadBarcodeImage(canvas, record.barcode);
        }
      }
    } catch (error) {
      console.error('Ошибка при создании штрихкода:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        // Пользователь отменил действие - не показываем ошибку
        return;
      }
      
      alert('Не удалось поделиться штрихкодом');
    }
  };

  // Вспомогательная функция для скачивания изображения
  const downloadBarcodeImage = (canvas: HTMLCanvasElement, barcode: string) => {
    const link = document.createElement('a');
    link.download = `barcode-${barcode}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Изображение штрихкода загружено в папку загрузок');
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
                      value={record?.barcode || ''}
                      fullWidth
                      disabled
                      variant="outlined"
                      helperText="Штрихкод генерируется автоматически и служит уникальным идентификатором записи"
                    />
                  </Grid>
                </Grid>

                {/* Пользовательские поля */}
                {fields && fields.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Данные записи
                    </Typography>
                    <Grid container spacing={2}>
                      {fields.map((field: any) => {
                        const fieldData = field.attributes || field;
                        const value = record?.dynamicData?.[field.id];

                        return (
                          <Grid size={{ xs: 12, sm: 6 }} key={field.id}>
                            {isEditing ? (
                              <>
                                {fieldData.fieldType === 'STRING' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.required ? 'Это поле обязательно' : false }}
                                    render={({ field: controllerField }) => (
                                      <TextField
                                        {...controllerField}
                                        label={fieldData.name}
                                        fullWidth
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string}
                                        required={fieldData.required}
                                      />
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'NUMBER' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.required ? 'Это поле обязательно' : false }}
                                    render={({ field: controllerField }) => (
                                      <TextField
                                        {...controllerField}
                                        label={fieldData.name}
                                        type="number"
                                        fullWidth
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string}
                                        required={fieldData.required}
                                      />
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'MONEY' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.required ? 'Это поле обязательно' : false }}
                                    render={({ field: controllerField }) => (
                                      <TextField
                                        {...controllerField}
                                        label={fieldData.name}
                                        type="number"
                                        fullWidth
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string}
                                        required={fieldData.required}
                                        InputProps={{
                                          endAdornment: '₽'
                                        }}
                                      />
                                    )}
                                  />
                                )}

                                {fieldData.fieldType === 'SELECT' && (
                                  <Controller
                                    name={`dynamicData.${field.id}`}
                                    control={control}
                                    rules={{ required: fieldData.required ? 'Это поле обязательно' : false }}
                                    render={({ field: controllerField }) => (
                                      <FormControl
                                        fullWidth
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        required={fieldData.required}
                                      >
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
                    {record?.owner?.username || record?.owner?.email || 'Неизвестно'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Дата создания
                  </Typography>
                  <Typography variant="body1">
                    {record?.createdAt ? format(new Date(record.createdAt), 'dd.MM.yyyy в HH:mm', { locale: ru }) : 'Неизвестно'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Последнее изменение
                  </Typography>
                  <Typography variant="body1">
                    {record?.updatedAt ? format(new Date(record.updatedAt), 'dd.MM.yyyy в HH:mm', { locale: ru }) : 'Неизвестно'}
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
                  {record?.barcode}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                    size="small"
                  >
                    Поделиться
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