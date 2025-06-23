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
  Skeleton,
  Alert,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
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

  // Загрузка данных
  const { data: recordsData = { data: [] }, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ['records', showAllRecords],
    queryFn: () => {
      console.log('📡 Загружаем записи с showAll:', showAllRecords);
      return recordsApi.getAll({ showAll: showAllRecords });
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Загрузка кастомных полей
  const { data: fieldsData } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => fieldsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Инициализация видимых столбцов при загрузке полей
  React.useEffect(() => {
    if (fieldsData?.data && visibleColumns.length === 0) {
      const defaultVisible = fieldsData.data.slice(0, 3).map((field: any) => field.id);
      setVisibleColumns(defaultVisible);
    }
  }, [fieldsData]);

  // Загрузка сохраненных предпочтений столбцов при запуске
  React.useEffect(() => {
    const savedColumns = localStorage.getItem('recordsVisibleColumns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        setVisibleColumns(parsed);
      } catch (error) {
        console.error('Ошибка загрузки сохраненных столбцов:', error);
      }
    }
  }, []);

  // Логирование данных записей
  React.useEffect(() => {
    if (recordsData?.data && !recordsLoading) {
      console.log('✅ Записи загружены успешно:');
      console.log('📊 Количество записей:', recordsData.data.length);
      if (recordsData.data.length > 0) {
        console.log('📝 Первая запись:', recordsData.data[0]);
        console.log('🆔 Поля ID первой записи:');
        console.log('   - id:', recordsData.data[0].id);
        console.log('   - documentId:', recordsData.data[0].documentId);
      }
    }
  }, [recordsData, recordsLoading]);

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

  // Фильтрация и поиск
  const filteredRecords = useMemo(() => {
    let filtered = recordsData?.data || [];

    // Применяем текстовый поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((record: any) => {
        const searchableText = [
          record.inventoryNumber,
          record.barcode,
          record.name,
          record.owner?.fullName || record.owner?.username,
          ...Object.values(record.dynamicData || {}),
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }

    // Применяем расширенные фильтры
    if (activeFilters.length > 0) {
      filtered = applyFiltersToData(filtered, activeFilters);
    }

    return filtered;
  }, [recordsData, searchQuery, activeFilters]);

  // Сортировка
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let aVal, bVal;

      if (orderBy.includes('.')) {
        const keys = orderBy.split('.');
        aVal = keys.reduce((obj, key) => obj?.[key], a);
        bVal = keys.reduce((obj, key) => obj?.[key], b);
      } else {
        aVal = a[orderBy];
        bVal = b[orderBy];
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
    setAnchorEl(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRecord(null);
  };

  const handleEdit = () => {
    if (selectedRecord) {
      navigate(`/records/${selectedRecord.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      deleteMutation.mutate(selectedRecord.id);
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

  const formatFieldValue = (value: any, fieldType: string, fieldName?: string) => {
    if (fieldName) {
      console.log('🔍 formatFieldValue:', fieldName, '=', value, 'type:', fieldType);
    }
    
    if (value === null || value === undefined) return '-';
    
    switch (fieldType) {
      case 'MONEY':
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
      case 'CHECKBOX':
        return value ? 'Да' : 'Нет';
      case 'NUMBER':
        return Number(value).toLocaleString('ru-RU');
      default:
        return String(value);
    }
  };

  if (recordsLoading) {
    return (
      <Box>
        {Array.from(new Array(5)).map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  if (recordsError) {
    return (
      <Alert severity="error">
        Ошибка загрузки данных. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Заголовок и действия */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Записи
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFiltersOpen(true)}
            color={activeFilters.length > 0 ? 'primary' : 'inherit'}
          >
            <Badge badgeContent={activeFilters.length} color="primary">
              Фильтры
            </Badge>
          </Button>
          
          {/* Кнопка настройки столбцов */}
          <Tooltip title="Настроить видимые столбцы">
            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={() => setColumnVisibilityOpen(true)}
            >
              Столбцы
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            Экспорт
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Добавить
          </Button>
        </Box>
      </Box>

      {/* Фильтры и поиск */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Поиск по всем полям..."
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
              sx={{ flex: 1 }}
            />

           <FormControlLabel
  control={
    <Switch
      checked={showAllRecords}
      onChange={(e) => handleShowAllToggle(e.target.checked)}
      // disabled убран - теперь доступно всем пользователям
    />
  }
  label={
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <PersonIcon sx={{ fontSize: 16 }} />
      <Typography variant="body2">
        {showAllRecords ? 'Все записи' : 'Только мои'}
      </Typography>
    </Box>
  }
/>
          </Box>

          {/* Активные фильтры */}
          {activeFilters.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {activeFilters.map((filter) => (
                <Chip
                  key={filter.id}
                  label={`${filter.field}: ${filter.value}`}
                  size="small"
                  onDelete={() => {
                    setActiveFilters(prev => prev.filter(f => f.id !== filter.id));
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Таблица записей */}
      <Card>
        <CardContent>
          <TableContainer>
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

                  {/* Показываем только выбранные пользователем поля */}
                  {fieldsData?.data
                    ?.filter((field: any) => visibleColumns.includes(field.id))
                    .map((field: any) => (
                      <TableCell key={field.id}>
                        <TableSortLabel
                          active={orderBy === field.name}
                          direction={orderBy === field.name ? order : 'asc'}
                          onClick={() => handleSort(field.name)}
                        >
                          {field.attributes?.name || field.name}
                        </TableSortLabel>
                      </TableCell>
                    ))}

                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'createdAt'}
                      direction={orderBy === 'createdAt' ? order : 'asc'}
                      onClick={() => handleSort('createdAt')}
                    >
                      Дата создания
                    </TableSortLabel>
                  </TableCell>

                  <TableCell>Владелец</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={4 + visibleColumns.length} 
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <Typography color="text.secondary">
                        {searchQuery || activeFilters.length > 0 
                          ? 'Записи не найдены по заданным критериям' 
                          : 'Записи отсутствуют'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record: any) => (
                    <TableRow
                      key={record.id}
                      hover
                      onClick={() => handleRowClick(record)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{record.barcode}</TableCell>
                      
                      {/* Показываем данные только для выбранных столбцов */}
                      {fieldsData?.data
                        ?.filter((field: any) => visibleColumns.includes(field.id))
                        .map((field: any) => {
                          const fieldData = field.attributes || field;
                          const value = record.dynamicData?.[field.id];
                          return (
                            <TableCell key={field.id}>
                              {formatFieldValue(value, fieldData.fieldType, fieldData.name)}
                            </TableCell>
                          );
                        })}
                      
                      <TableCell>
                        {format(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', {
                          locale: ru,
                        })}
                      </TableCell>
                      
                      <TableCell>
                        {record.owner?.fullName || record.owner?.username || '-'}
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={sortedRecords.length}
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
        fields={fieldsData?.data || []}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
      />

      {/* Диалог настройки столбцов */}
      <ColumnVisibilityDialog
        open={columnVisibilityOpen}
        onClose={() => setColumnVisibilityOpen(false)}
        customFields={fieldsData?.data || []}
        visibleColumns={visibleColumns}
        onColumnsChange={handleColumnsChange}
      />

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        records={filteredRecords}
        fields={fieldsData?.data || []}
      />

      <CreateRecordDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fields={fieldsData?.data || []}
        onSubmit={handleCreateRecord}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Удалить запись?"
        message={`Вы уверены, что хотите удалить запись со штрихкодом "${selectedRecord?.barcode}"? Это действие нельзя отменить.`}
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
    </Box>
  );
};

export default RecordsPage;