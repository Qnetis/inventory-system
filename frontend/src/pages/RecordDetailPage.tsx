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
  IconButton,
  useTheme,
  useMediaQuery,
  Menu,
  Stack,
  Divider
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Bluetooth as BluetoothIcon
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isEditing, setIsEditing] = useState(false);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<any>();

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

  // Проверка прав
  const isOwner = record?.owner?.id === user?.id || record?.owner === user?.id;
  const isAdmin = user?.role?.type === 'admin';
  const canEdit = isOwner || isAdmin;

  // Безопасное извлечение полей
  const fields = React.useMemo(() => {
    if (!fieldsData) return [];
    
    if (fieldsData.data) {
      return Array.isArray(fieldsData.data) ? fieldsData.data : [];
    }
    
    if (Array.isArray(fieldsData)) {
      return fieldsData;
    }
    
    return [];
  }, [fieldsData]);

  // Генерация штрихкода
  useEffect(() => {
    if (record?.barcode) {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, record.barcode, {
        format: "EAN13",
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
        margin: 10
      });
      setBarcodeDataUrl(canvas.toDataURL('image/png'));
    }
  }, [record?.barcode]);

  // Инициализация формы
  useEffect(() => {
    if (record) {
      const formData: any = {};
      
      fields.forEach((field: any) => {
        const value = record.dynamicData?.[field.id];
        formData[`dynamicData.${field.id}`] = value || '';
      });

      reset(formData);
    }
  }, [record, fields, reset]);

  // Обработчики
  const handleEdit = () => {
    setIsEditing(true);
    handleMobileMenuClose();
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (record) {
      const formData: any = {};
      
      fields.forEach((field: any) => {
        const value = record.dynamicData?.[field.id];
        formData[`dynamicData.${field.id}`] = value || '';
      });

      reset(formData);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Вы уверены, что хотите удалить запись ${record?.barcode}?`)) {
      deleteMutation.mutate();
    }
    handleMobileMenuClose();
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

const handleShare = async () => {
  if (!record?.barcode) {
    alert('Штрихкод не найден');
    return;
  }

  try {
    // Создаем canvas для штрихкода
    const canvas = document.createElement('canvas');
    
    // Генерируем штрихкод оптимального размера
    JsBarcode(canvas, record.barcode, {
      format: "EAN13",
      width: 2,              // Ширина линии (2px для хорошей читаемости)
      height: 80,            // Высота штрихкода (80px стандарт)
      displayValue: true,    // Показываем числа под штрихкодом
      fontSize: 16,          // Размер шрифта для чисел
      margin: 10,            // Отступы вокруг штрихкода
      background: '#ffffff',
      lineColor: '#000000',
      textMargin: 2,         // Отступ текста от штрихкода
      fontOptions: "",       // Обычный шрифт
      textAlign: "center"    // Выравнивание текста по центру
    });

    console.log('Размер сгенерированного штрихкода:', canvas.width + 'x' + canvas.height);

    // Конвертируем в blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Не удалось создать изображение'));
        }
      }, 'image/png', 1.0);
    });

    // Создаем файл
    const file = new File([blob], `barcode-${record.barcode}.png`, {
      type: 'image/png',
    });

    // Определяем тип устройства
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    // Пробуем использовать Web Share API
    if (navigator.share) {
      try {
        // Сначала пробуем с файлом
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Штрихкод',
            text: record.barcode
          });
          console.log('Поделились через Web Share API с файлом');
          return;
        }

        // Если не поддерживаются файлы, создаем blob URL
        const blobUrl = URL.createObjectURL(blob);
        
        // Пробуем поделиться URL
        await navigator.share({
          title: `Штрихкод ${record.barcode}`,
          text: `Штрихкод: ${record.barcode}`,
          url: blobUrl
        });
        
        // Очищаем URL после небольшой задержки
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        console.log('Поделились через Web Share API с URL');
        return;
        
      } catch (error) {
        console.log('Web Share API не сработал:', error);
        // Продолжаем с альтернативными методами
      }
    }

    // Альтернативные методы для разных платформ
    if (isIOS) {
      // Для iOS создаем страницу с изображением
      const dataUrl = canvas.toDataURL('image/png');
      const newTab = window.open('', '_blank');
      
      if (newTab) {
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Штрихкод ${record.barcode}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">
            <style>
              body {
                margin: 0;
                padding: 20px;
                background: #f0f0f0;
                font-family: -apple-system, system-ui, sans-serif;
                text-align: center;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: inline-block;
                max-width: 90%;
              }
              .barcode-img {
                display: block;
                margin: 20px auto;
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
              }
              .barcode-number {
                font-family: 'SF Mono', Monaco, monospace;
                font-size: 18px;
                color: #333;
                margin: 10px 0;
                word-break: break-all;
              }
              .hint {
                color: #666;
                font-size: 14px;
                margin-top: 20px;
                line-height: 1.5;
              }
              .actions {
                margin-top: 20px;
              }
              .btn {
                display: inline-block;
                padding: 12px 24px;
                background: #007AFF;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 500;
                margin: 5px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Штрихкод</h2>
              <div class="barcode-number">${record.barcode}</div>
              <img src="${dataUrl}" alt="Barcode" class="barcode-img">
              <div class="hint">
                Нажмите и удерживайте изображение,<br>
                затем выберите «Сохранить изображение»<br>
                или используйте кнопку «Поделиться» в Safari
              </div>
            </div>
          </body>
          </html>
        `);
        newTab.document.close();
      }
      
    } else if (isAndroid || isMobile) {
      // Для Android используем прямое скачивание
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `barcode-${record.barcode}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }, 100);
      
      // Показываем уведомление
      setTimeout(() => {
        if (confirm('Штрихкод сохранен в загрузки. Открыть папку с загрузками?')) {
          // Пытаемся открыть загрузки (работает не на всех устройствах)
          window.open('content://downloads/', '_blank');
        }
      }, 1000);
      
    } else {
      // Для десктопа - копируем в буфер обмена или скачиваем
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Изображение штрихкода скопировано в буфер обмена');
        } catch (e) {
          console.error('Ошибка при копировании в буфер:', e);
          // Fallback на скачивание
          downloadBarcodeImage(canvas, record.barcode);
        }
      } else {
        downloadBarcodeImage(canvas, record.barcode);
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Не удалось создать штрихкод');
  }
};

  // Функция отправки по Bluetooth (заглушка)
  const handleBluetoothSend = () => {
    alert('Функция отправки по Bluetooth будет реализована в будущих версиях');
  };

  // Функция печати штрихкода
  const handlePrint = () => {
    if (!barcodeDataUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Печать штрихкода ${record?.barcode}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <img src="${barcodeDataUrl}" alt="Штрихкод ${record?.barcode}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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

  // Мобильное меню
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
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
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Хедер */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/records')} sx={{ mr: 1 }}>
          <BackIcon />
        </IconButton>
        <Typography 
          variant={isMobile ? "h6" : "h4"} 
          component="h1" 
          sx={{ flexGrow: 1, fontSize: isMobile ? '1.1rem' : undefined }}
        >
          {isEditing ? 'Редактирование' : 'Просмотр записи'}
        </Typography>
        
        {/* Десктопные кнопки */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
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
        )}
        
        {/* Мобильное меню */}
        {isMobile && canEdit && !isEditing && (
          <>
            <IconButton onClick={handleMobileMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={handleMobileMenuClose}
            >
              <MenuItem onClick={handleEdit}>
                <EditIcon sx={{ mr: 1 }} fontSize="small" />
                Редактировать
              </MenuItem>
              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                Удалить
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Основная информация */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
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
                      helperText="Штрихкод генерируется автоматически"
                      size={isMobile ? "small" : "medium"}
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
                          <Grid size={{ xs: 12, sm: isTablet ? 12 : 6 }} key={field.id}>
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
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string || ''}
                                        required={fieldData.required}
                                        size={isMobile ? "small" : "medium"}
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
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string || ''}
                                        required={fieldData.required}
                                        size={isMobile ? "small" : "medium"}
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
                                        label={`${fieldData.name} (₽)`}
                                        type="number"
                                        fullWidth
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string || ''}
                                        required={fieldData.required}
                                        size={isMobile ? "small" : "medium"}
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
                                        size={isMobile ? "small" : "medium"}
                                      >
                                        <InputLabel required={fieldData.required}>
                                          {fieldData.name}
                                        </InputLabel>
                                        <Select
                                          {...controllerField}
                                          label={fieldData.name}
                                        >
                                          <MenuItem value="">
                                            <em>Не выбрано</em>
                                          </MenuItem>
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
                              <TextField
                                label={fieldData.name}
                                value={formatFieldValue(value, fieldData.fieldType) || '-'}
                                fullWidth
                                disabled
                                variant="outlined"
                                size={isMobile ? "small" : "medium"}
                              />
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}

                {/* Кнопки сохранения/отмены для режима редактирования */}
                {isEditing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={updateMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={updateMutation.isPending}
                      fullWidth={isMobile}
                    >
                      Сохранить
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                      fullWidth={isMobile}
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
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="h6" gutterBottom>
                  Информация о записи
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Создатель
                    </Typography>
                    <Typography variant="body1">
                      {record?.owner?.username || record?.owner?.email || 'Неизвестно'}
                    </Typography>
                  </Box>

                  <Box>
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
                </Stack>
              </CardContent>
            </Card>

            {/* Штрихкод */}
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="h6" gutterBottom>
                  Штрихкод
                </Typography>
                
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  {barcodeDataUrl && (
                    <img 
                      src={barcodeDataUrl} 
                      alt="Штрихкод" 
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto',
                        maxHeight: isMobile ? '80px' : '100px'
                      }} 
                    />
                  )}
                </Box>

                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ textAlign: 'center', mb: 2, fontFamily: 'monospace' }}
                >
                  {record?.barcode}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Кнопки действий со штрихкодом */}
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                    size={isMobile ? "small" : "medium"}
                    fullWidth
                  >
                    Поделиться
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    size={isMobile ? "small" : "medium"}
                    fullWidth
                  >
                    Печать
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<BluetoothIcon />}
                    onClick={handleBluetoothSend}
                    size={isMobile ? "small" : "medium"}
                    fullWidth
                    sx={{ 
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'primary.main',
                        color: 'white'
                      }
                    }}
                  >
                    Отправить по Bluetooth
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default RecordDetailPage;