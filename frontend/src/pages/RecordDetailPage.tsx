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

  // Функция поделиться изображением штрихкода
const handleShare = async () => {
  if (!record?.barcode) {
    alert('Штрихкод не найден');
    return;
  }

  try {
    // Создаем временный canvas для генерации штрихкода
    const tempCanvas = document.createElement('canvas');
    
    // Сначала генерируем штрихкод на временном canvas
    JsBarcode(tempCanvas, record.barcode, {
      format: "EAN13",
      width: 1,              // Минимальная ширина линий
      height: 20,            // Высота штрихкода
      displayValue: false,   // Отключаем отображение текста
      margin: 0,             // Убираем отступы
      background: '#ffffff',
      lineColor: '#000000'
    });

    // Создаем финальный canvas с точными размерами 50x25 пикселей
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 50;  // 50 пикселей ширина
    finalCanvas.height = 25; // 25 пикселей высота

    const ctx = finalCanvas.getContext('2d');
    if (ctx) {
      // Заливаем белым фоном
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 50, 25);
      
      // Масштабируем и вписываем штрихкод в финальный canvas
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 
                    2, 2, 46, 21); // Оставляем небольшие отступы
    }

    const canvas = finalCanvas; // Используем финальный canvas для дальнейшей обработки

    // Конвертируем canvas в blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/png', 1.0);
    });

    // Создаем файл для отправки
    const file = new File([blob], `barcode-${record.barcode}-25x50.png`, {
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
          alert('Изображение штрихкода 25x50 пикселей скопировано в буфер обмена');
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