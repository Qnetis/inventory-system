/* eslint-disable @typescript-eslint/no-explicit-any */

// frontend/src/pages/RecordsPage.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Alert,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// ИСПРАВЛЕННЫЕ импорты
import AdvancedFilters, { applyFiltersToData } from '../components/Records/AdvancedFilters';
import { recordsApi, fieldsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ExportDialog } from '../components/Records/ExportDialog';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';
import CreateRecordDialog from '../components/Records/CreateRecordDialog';
import ColumnVisibilityDialog from '../components/Records/ColumnVisibilityDialog';

export const RecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role?.type === 'admin';

  // Состояния
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // НОВОЕ: Состояние для видимости столбцов
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);

  // Загрузка данных с улучшенной обработкой
  const { data: recordsResponse, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ['records', showAllRecords],
    queryFn: async () => {
      try {
        console.log('📡 Загружаем записи с showAll:', showAllRecords);
        const response = await recordsApi.getAll({ showAll: showAllRecords });
        console.log('Records API response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching records:', error);
        throw error;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Загрузка кастомных полей с улучшенной обработкой
  const { data: fieldsResponse, isLoading: fieldsLoading, error: fieldsError } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      try {
        const response = await fieldsApi.getAll();
        console.log('Fields API response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching fields:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Безопасное извлечение записей
  const extractRecords = (response: any) => {
    console.log('Extracting records from:', response);
    
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    if (Array.isArray(response)) {
      return response;
    }
    
    console.warn('Could not extract records array from response:', response);
    return [];
  };

  // Безопасное извлечение полей
  const extractFields = (response: any) => {
    console.log('Extracting fields from:', response);
    
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    if (Array.isArray(response)) {
      return response;
    }
    
    console.warn('Could not extract fields array from response:', response);
    return [];
  };

  const records = extractRecords(recordsResponse);
  const fields = extractFields(fieldsResponse);

  console.log('Safe records:', records);
  console.log('Safe fields:', fields);

  // Инициализация видимых столбцов при загрузке полей
  React.useEffect(() => {
    if (Array.isArray(fields) && fields.length > 0 && visibleColumns.length === 0) {
      const defaultVisible = fields.slice(0, 3).map((field: any) => field.id);
      setVisibleColumns(defaultVisible);
    }
  }, [fields, visibleColumns.length]);

  // Загрузка сохраненных предпочтений столбцов при запуске
  React.useEffect(() => {
    const savedColumns = localStorage.getItem('recordsVisibleColumns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        if (Array.isArray(parsed)) {
          setVisibleColumns(parsed);
        }
      } catch (error) {
        console.error('Ошибка загрузки сохраненных столбцов:', error);
      }
    }
  }, []);

  // Мутации
  const createMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setCreateDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
    },
  });

  // Фильтрация записей
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(records)) return [];
    
    let filtered = records;

    // Поиск по тексту
    if (searchQuery) {
      filtered = filtered.filter((record: any) => {
        const recordData = record.attributes || record;
        const searchLower = searchQuery.toLowerCase();
        
        // Поиск по штрихкоду
        if (recordData.barcode && recordData.barcode.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Поиск по динамическим полям
        if (recordData.dynamicData) {
          return Object.values(recordData.dynamicData).some((value: any) =>
            value && String(value).toLowerCase().includes(searchLower)
          );
        }
        
        return false;
      });
    }

    // Применяем фильтры
    if (activeFilters.length > 0) {
      filtered = applyFiltersToData(filtered, activeFilters);
    }

    return filtered;
  }, [records, searchQuery, activeFilters]);

  // Сортировка
  const sortedRecords = useMemo(() => {
    if (!Array.isArray(filteredRecords)) return [];
    
    return [...filteredRecords].sort((a, b) => {
      const aData = a.attributes || a;
      const bData = b.attributes || b;
      
      let aVal = aData[orderBy];
      let bVal = bData[orderBy];

      // Для динамических полей
      if (orderBy.startsWith('dynamicData.')) {
        const fieldId = orderBy.replace('dynamicData.', '');
        aVal = aData.dynamicData?.[fieldId];
        bVal = bData.dynamicData?.[fieldId];
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return order === 'asc' ? -1 : 1;
      if (bVal == null) return order === 'asc' ? 1 : -1;

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, orderBy, order]);

  // Пагинация
  const paginatedRecords = useMemo(() => {
    if (!Array.isArray(sortedRecords)) return [];
    
    const start = page * rowsPerPage;
    return sortedRecords.slice(start, start + rowsPerPage);
  }, [sortedRecords, page, rowsPerPage]);

  // Обработчики
  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

const handleMenuClick = (event: React.MouseEvent<HTMLElement>, record: any) => {
  console.log('🖱️ Menu click - record:', record);
  console.log('📦 Menu click - barcode:', (record?.attributes || record)?.barcode);
  setAnchorEl(event.currentTarget);
  setSelectedRecord(record);
};

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRecord(null);
  };

const handleEdit = () => {
  if (selectedRecord) {
    // ИСПРАВЛЕНИЕ: правильно получаем ID с учетом структуры данных
    const recordId = selectedRecord.documentId || selectedRecord.id;
    console.log('🔧 Edit - selectedRecord:', selectedRecord);
    console.log('🆔 Edit - используем ID:', recordId);
    navigate(`/records/${recordId}`);
  }
  handleMenuClose();
};

const handleDelete = () => {
  // ИСПРАВЛЕНИЕ: добавляем отладочную информацию
  console.log('🗑️ Delete - selectedRecord:', selectedRecord);
  const recordData = selectedRecord?.attributes || selectedRecord;
  console.log('📦 Delete - barcode:', recordData?.barcode);
  setDeleteDialogOpen(true);
  handleMenuClose();
};

const confirmDelete = () => {
  if (selectedRecord) {
    // ИСПРАВЛЕНИЕ: правильно получаем ID для удаления
    const recordId = selectedRecord.documentId || selectedRecord.id;
    console.log('✅ Confirm delete - ID:', recordId);
    deleteMutation.mutate(recordId);
  }
};

  const handleApplyFilters = (filters: any[]) => {
    console.log('🔍 RecordsPage - Применяем фильтры:', filters);
    setActiveFilters(filters);
    setPage(0);
  };

  const handleShowAllToggle = (checked: boolean) => {
    console.log('Переключение showAll на:', checked);
    setShowAllRecords(checked);
    setPage(0);
  };

  const handleCreateRecord = (data: any) => {
    console.log('Создание записи с данными:', data);
    createMutation.mutate(data);
  };

  const handleRowClick = (record: any) => {
    console.log('🖱️ Клик по строке записи:');
    console.log('📋 Полные данные записи:', record);
    console.log('🆔 record.id:', record.id);
    console.log('📄 record.documentId:', record.documentId);
    console.log('📦 record.barcode:', record.barcode);
    
    const recordId = record.documentId || record.id;
    console.log('🎯 Используемый ID для навигации:', recordId);
    
    if (recordId) {
      console.log('✅ Переход к записи:', `/records/${recordId}`);
      navigate(`/records/${recordId}`);
    } else {
      console.error('❌ ID записи не найден:', record);
      alert('Ошибка: не удалось определить ID записи');
    }
  };

  // Обработчик изменения видимых столбцов
  const handleColumnsChange = (columns: string[]) => {
    setVisibleColumns(columns);
    // Сохраняем в localStorage для запоминания предпочтений пользователя
    localStorage.setItem('recordsVisibleColumns', JSON.stringify(columns));
  };

  const formatFieldValue = (value: any, fieldType: string): string => {
    if (value === null || value === undefined) return '-';
    
    switch (fieldType) {
      case 'MONEY':
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
      case 'NUMBER':
        return Number(value).toLocaleString('ru-RU');
      case 'CHECKBOX':
        return value ? 'Да' : 'Нет';
      case 'SELECT':
        return String(value);
      case 'TEXT':
      default:
        return String(value);
    }
  };

  // Состояния загрузки
  if (recordsLoading || fieldsLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка данных...</Typography>
      </Box>
    );
  }

  // Обработка ошибок
  if (recordsError || fieldsError) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Ошибка загрузки данных. Попробуйте обновить страницу.
          <br />
          <small>
            {recordsError?.message || fieldsError?.message || 'Неизвестная ошибка'}
          </small>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Заголовок и кнопки */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Записи
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Настроить столбцы">
            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={() => setColumnVisibilityOpen(true)}
            >
              Столбцы
            </Button>
          </Tooltip>
          <Tooltip title="Экспорт данных">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => setExportDialogOpen(true)}
            >
              Экспорт
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Добавить запись
          </Button>
        </Box>
      </Box>

      {/* Панель управления */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Поиск */}
            <TextField
              placeholder="Поиск по штрихкоду или содержимому..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchQuery('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300, flexGrow: 1 }}
            />

            {/* Кнопка фильтров */}
            <Badge badgeContent={activeFilters.length} color="primary">
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setFiltersOpen(true)}
              >
                Фильтры
              </Button>
            </Badge>

            {/* Переключатель показа всех записей для админа */}
            {isAdmin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showAllRecords}
                    onChange={(e) => handleShowAllToggle(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon fontSize="small" />
                    <Typography variant="body2">
                      Все записи
                    </Typography>
                  </Box>
                }
              />
            )}
          </Box>

          {/* Активные фильтры */}
          {activeFilters.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ mr: 1, alignSelf: 'center' }}>
                Активные фильтры:
              </Typography>
              {activeFilters.map((filter, index) => (
                <Chip
                  key={index}
                  label={`${filter.fieldName}: ${filter.operator} ${filter.value}`}
                  size="small"
                  onDelete={() => {
                    const newFilters = activeFilters.filter((_, i) => i !== index);
                    setActiveFilters(newFilters);
                  }}
                />
              ))}
              <Button
                size="small"
                variant="text"
                onClick={() => setActiveFilters([])}
              >
                Очистить все
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Таблица записей */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'barcode'}
                      direction={orderBy === 'barcode' ? order : 'asc'}
                      onClick={() => handleSort('barcode')}
                    >
                      Штрихкод
                    </TableSortLabel>
                  </TableCell>

                  {/* Видимые кастомные поля */}
                  {Array.isArray(fields) && fields
                    .filter((field: any) => visibleColumns.includes(field.id))
                    .map((field: any) => {
                      const fieldData = field.attributes || field;
                      return (
                        <TableCell key={field.id}>
                          <TableSortLabel
                            active={orderBy === `dynamicData.${field.id}`}
                            direction={orderBy === `dynamicData.${field.id}` ? order : 'asc'}
                            onClick={() => handleSort(`dynamicData.${field.id}`)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {fieldData.name}
                              {fieldData.isRequired && (
                                <Chip 
                                  size="small" 
                                  label="*" 
                                  color="error" 
                                  variant="outlined"
                                  sx={{ minWidth: 'auto', width: 20, height: 20 }}
                                />
                              )}
                            </Box>
                          </TableSortLabel>
                        </TableCell>
                      );
                    })}

                  <TableCell>Владелец</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'createdAt'}
                      direction={orderBy === 'createdAt' ? order : 'asc'}
                      onClick={() => handleSort('createdAt')}
                    >
                      Дата создания
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(paginatedRecords) || paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={4 + (visibleColumns.length || 0)} 
                      align="center"
                      sx={{ py: 6 }}
                    >
                      <Box>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          {!Array.isArray(records) ? 'Ошибка формата данных' : 'Записи не найдены'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {!Array.isArray(records) 
                            ? 'Обратитесь к администратору'
                            : 'Попробуйте изменить критерии поиска или фильтры'
                          }
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record: any) => {
                    if (!record || !record.id) {
                      console.warn('Invalid record:', record);
                      return null;
                    }

                    const recordData = record.attributes || record;
                    const ownerData = recordData.owner?.data?.attributes || recordData.owner;

                    return (
                      <TableRow
                        key={record.id}
                        hover
                        onClick={() => handleRowClick(record)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {recordData.barcode || 'Без штрихкода'}
                          </Typography>
                        </TableCell>
                        
                        {/* Показываем данные только для видимых полей */}
                        {Array.isArray(fields) && fields
                          .filter((field: any) => visibleColumns.includes(field.id))
                          .map((field: any) => {
                            const fieldData = field.attributes || field;
                            const value = recordData.dynamicData?.[field.id];
                            
                            return (
                              <TableCell key={field.id}>
                                <Typography 
                                  variant="body2"
                                  color={value ? 'text.primary' : 'text.secondary'}
                                >
                                  {formatFieldValue(value, fieldData.fieldType)}
                                </Typography>
                              </TableCell>
                            );
                          })}
                        
                        <TableCell>
                          <Typography variant="body2">
                            {ownerData?.fullName || ownerData?.username || '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {recordData.createdAt ? format(new Date(recordData.createdAt), 'dd.MM.yyyy', {
                              locale: ru,
                            }) : '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuClick(e, record);
                            }}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  }).filter(Boolean) // Убираем null элементы
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={Array.isArray(sortedRecords) ? sortedRecords.length : 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            labelRowsPerPage="Записей на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </CardContent>
      </Card>

      {/* Диалоги */}
      <AdvancedFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        fields={fields}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
      />

      {/* Диалог настройки столбцов */}
      <ColumnVisibilityDialog
        open={columnVisibilityOpen}
        onClose={() => setColumnVisibilityOpen(false)}
        customFields={fields}
        visibleColumns={visibleColumns}
        onColumnsChange={handleColumnsChange}
      />

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        records={filteredRecords}
        fields={fields}
      />

      <CreateRecordDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fields={fields}
        onSubmit={handleCreateRecord}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Удалить запись?"
        message={`Вы уверены, что хотите удалить запись со штрихкодом "${(selectedRecord?.attributes || selectedRecord)?.barcode}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        confirmColor="error"
      />

      {/* Контекстное меню */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        {(isAdmin || selectedRecord?.owner?.id === user?.id) && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Удалить
          </MenuItem>
        )}
      </Menu>

      {/* Отладочная информация в режиме разработки */}
      {import.meta.env.DEV && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Debug: Records type: {typeof records}, Array check: {Array.isArray(records) ? 'true' : 'false'}
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            Records length: {Array.isArray(records) ? records.length : 'N/A'}, Fields length: {Array.isArray(fields) ? fields.length : 'N/A'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RecordsPage;