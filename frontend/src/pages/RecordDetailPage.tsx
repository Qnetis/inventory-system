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
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  useTheme,
  useMediaQuery,
  Menu,
  Stack,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
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
        fontSize: 20,
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
        fontSize: 24,          // Размер шрифта для чисел
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

      // Скачиваем изображение
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
      alert('Изображение штрихкода сохранено в папку загрузок');
      
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось сохранить штрихкод');
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
        return String(value);
    }
  };

  // Мобильное меню
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  // Загрузка
  if (recordLoading || fieldsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Ошибка
  if (recordError) {
    console.error('Record error:', recordError);
    return (
      <Box p={isMobile ? 2 : 3}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={() => navigate('/records')}>
              К списку
            </Button>
          }
        >
          Запись не найдена или произошла ошибка при загрузке
        </Alert>
      </Box>
    );
  }

  if (!record) {
    return (
      <Box p={isMobile ? 2 : 3}>
        <Alert 
          severity="warning"
          action={
            <Button color="inherit" onClick={() => navigate('/records')}>
              К списку
            </Button>
          }
        >
          Запись не найдена
        </Alert>
      </Box>
    );
  }

  // Получаем информацию о владельце
  const ownerInfo = record.owner?.username || 'Неизвестно';

  return (
    <Box p={isMobile ? 2 : 3}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Заголовок */}
        <Box mb={isMobile ? 2 : 3} display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/records')} size={isMobile ? "small" : "medium"}>
              <BackIcon />
            </IconButton>
            <Typography variant={isMobile ? "h6" : "h5"}>
              {isEditing ? 'Редактирование записи' : 'Просмотр записи'}
            </Typography>
          </Box>

          {/* Десктопные кнопки */}
          {!isMobile && canEdit && (
            <Box display="flex" gap={1}>
              {isEditing ? (
                <>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
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
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                  >
                    Редактировать
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDelete}
                  >
                    Удалить
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Мобильное меню */}
          {isMobile && canEdit && (
            <>
              <IconButton onClick={handleMobileMenuOpen} size="small">
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleMobileMenuClose}
              >
                {isEditing ? (
                  [
                    <MenuItem key="save" onClick={handleSubmit(onSubmit)}>
                      <SaveIcon fontSize="small" sx={{ mr: 1 }} />
                      Сохранить
                    </MenuItem>,
                    <MenuItem key="cancel" onClick={handleCancel}>
                      <CancelIcon fontSize="small" sx={{ mr: 1 }} />
                      Отмена
                    </MenuItem>
                  ]
                ) : (
                  [
                    <MenuItem key="edit" onClick={handleEdit}>
                      <EditIcon fontSize="small" sx={{ mr: 1 }} />
                      Редактировать
                    </MenuItem>,
                    <Divider key="divider" />,
                    <MenuItem key="delete" onClick={handleDelete} sx={{ color: 'error.main' }}>
                      <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                      Удалить
                    </MenuItem>
                  ]
                )}
              </Menu>
            </>
          )}
        </Box>

        {/* Сообщения */}
        {updateMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Ошибка при обновлении записи
          </Alert>
        )}

        {updateMutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Запись успешно обновлена
          </Alert>
        )}

        {/* Контент */}
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
                                        label={fieldData.name}
                                        type="number"
                                        fullWidth
                                        error={!!errors[`dynamicData.${field.id}`]}
                                        helperText={errors[`dynamicData.${field.id}`]?.message as string || ''}
                                        required={fieldData.required}
                                        InputProps={{
                                          endAdornment: '₽'
                                        }}
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
                                    render={({ field: controllerField }) => {
                                      const options = fieldData.selectOptions || [];
                                      return (
                                        <Autocomplete
                                          {...controllerField}
                                          options={options}
                                          value={controllerField.value || ''}
                                          onChange={(_, newValue) => controllerField.onChange(newValue)}
                                          freeSolo
                                          renderInput={(params) => (
                                            <TextField
                                              {...params}
                                              label={fieldData.name}
                                              error={!!errors[`dynamicData.${field.id}`]}
                                              helperText={errors[`dynamicData.${field.id}`]?.message as string || ''}
                                              required={fieldData.required}
                                              size={isMobile ? "small" : "medium"}
                                            />
                                          )}
                                        />
                                      );
                                    }}
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
                                            checked={controllerField.value === true || controllerField.value === 'true'}
                                            onChange={(e) => controllerField.onChange(e.target.checked)}
                                            size={isMobile ? "small" : "medium"}
                                          />
                                        }
                                        label={fieldData.name}
                                      />
                                    )}
                                  />
                                )}
                              </>
                            ) : (
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {fieldData.name}
                                </Typography>
                                <Typography variant="body1">
                                  {value ? formatFieldValue(value, fieldData.fieldType) : '—'}
                                </Typography>
                              </Box>
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Боковая панель */}
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Информация о записи */}
            <Card sx={{ mb: isMobile ? 2 : 3 }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="h6" gutterBottom>
                  Информация о записи
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Владелец
                    </Typography>
                    <Typography variant="body1">
                      {ownerInfo}
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
                        width: '189px',  // 50мм
                        height: '95px',  // 25мм
                        maxWidth: '100%', // Адаптивность для маленьких экранов
                        objectFit: 'contain',
                        border: '1px solid #ddd',
                        padding: '5px',
                        backgroundColor: '#fff'
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

                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ textAlign: 'center', mb: 2, lineHeight: 1.5 }}
                >
                  Нажмите и удерживайте изображение, затем выберите "Поделиться" в контекстном меню браузера, или используйте кнопку ниже.
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Кнопка сохранения штрихкода */}
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleShare}
                  size={isMobile ? "small" : "medium"}
                  fullWidth
                >
                  Сохранить
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default RecordDetailPage;