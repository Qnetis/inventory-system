// frontend/src/pages/Records/RecordsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Paper,
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
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AdvancedFilters, applyFiltersToData } from '../../components/Records/AdvancedFilters';
import { recordsApi, fieldsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { ExportDialog } from '../../components/Records/ExportDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface RecordsPageProps {}

export const RecordsPage: React.FC<RecordsPageProps> = () => {
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

  // Загрузка данных
  const { data: recordsData, isLoading: recordsLoading, error: recordsError } = useQuery(
    ['records', { showAll: showAllRecords }],
    () => recordsApi.getAll({ showAll: showAllRecords }),
    {
      keepPreviousData: true,
    }
  );

  const { data: fieldsData } = useQuery(
    'fields',
    () => fieldsApi.getAll(),
    {
      staleTime: 5 * 60 * 1000, // 5 минут
    }
  );

  // Мутация для удаления записи
  const deleteMutation = useMutation(
    (id: string) => recordsApi.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('records');
        setDeleteDialogOpen(false);
        setSelectedRecord(null);
      },
    }
  );

  // Обработка данных
  const records = useMemo(() => {
    if (!recordsData?.data) return [];
    
    let filtered = recordsData.data;

    // Применяем поиск
    if (searchQuery) {
      filtered = filtered.filter((record: any) => {
        const searchLower = searchQuery.toLowerCase();
        
        // Поиск по инвентарному номеру
        if (record.attributes.inventory_number?.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Поиск по полям
        const fields = record.attributes.fields || [];
        return fields.some((field: any) => 
          field.value?.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Применяем расширенные фильтры
    if (activeFilters.length > 0 && fieldsData?.data) {
      filtered = applyFiltersToData(filtered, activeFilters, fieldsData.data);
    }

    // Сортировка
    filtered.sort((a: any, b: any) => {
      let aValue = a.attributes[orderBy];
      let bValue = b.attributes[orderBy];

      // Для полей используем первое значение
      if (orderBy.startsWith('field_')) {
        const fieldName = orderBy.replace('field_', '');
        aValue = a.attributes.fields?.find((f: any) => f.field_name === fieldName)?.value || '';
        bValue = b.attributes.fields?.find((f: any) => f.field_name === fieldName)?.value || '';
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [recordsData, searchQuery, activeFilters, fieldsData, orderBy, order]);

  // Пагинация
  const paginatedRecords = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return records.slice(start, end);
  }, [records, page, rowsPerPage]);

  // Обработчики
  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (record: any) => {
    if (record.attributes.canEdit || isAdmin) {
      navigate(`/records/${record.id}`);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, record: any) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedRecord) {
      navigate(`/records/${selectedRecord.id}/edit`);
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
    setActiveFilters(filters);
    setPage(0);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveFilters([]);
    setPage(0);
  };

  // Колонки таблицы
  const columns = useMemo(() => {
    const baseColumns = [
      { id: 'inventory_number', label: 'Инв. номер', sortable: true },
      { id: 'createdAt', label: 'Дата создания', sortable: true },
    ];

    // Добавляем динамические колонки из полей
    if (fieldsData?.data) {
      fieldsData.data.forEach((field: any) => {
        baseColumns.push({
          id: `field_${field.name}`,
          label: field.display_name || field.name,
          sortable: true,
        });
      });
    }

    if (showAllRecords || isAdmin) {
      baseColumns.push({
        id: 'created_by',
        label: 'Создатель',
        sortable: true,
      });
    }

    baseColumns.push({
      id: 'actions',
      label: 'Действия',
      sortable: false,
    });

    return baseColumns;
  }, [fieldsData, showAllRecords, isAdmin]);

  // Форматирование значения поля
  const formatFieldValue = (field: any) => {
    if (!field || field.value === null || field.value === undefined) return '—';

    switch (field.field_type) {
      case 'money':
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
        }).format(parseFloat(field.value) || 0);
      case 'checkbox':
        return field.value ? '✓' : '✗';
      case 'date':
        return format(new Date(field.value), 'dd.MM.yyyy', { locale: ru });
      default:
        return field.value.toString();
    }
  };

  if (recordsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Ошибка загрузки записей. Попробуйте обновить страницу.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          {/* Заголовок и действия */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1">
              Записи
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
                onClick={() => navigate('/records/new')}
              >
                Добавить запись
              </Button>
            </Box>
          </Box>

          {/* Фильтры и поиск */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                placeholder="Поиск по инвентарному номеру или полям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ flex: 1, maxWidth: 400 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Badge badgeContent={activeFilters.length} color="primary">
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFiltersOpen(true)}
                >
                  Фильтры
                </Button>
              </Badge>

              {(searchQuery || activeFilters.length > 0) && (
                <Button
                  size="small"
                  onClick={clearAllFilters}
                  startIcon={<ClearIcon />}
                >
                  Очистить все
                </Button>
              )}

              {isAdmin && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAllRecords}
                      onChange={(e) => setShowAllRecords(e.target.checked)}
                    />
                  }
                  label="Показать все записи"
                />
              )}
            </Box>

            {/* Активные фильтры */}
            {activeFilters.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {activeFilters.map((filter, index) => {
                  const field = fieldsData?.data.find((f: any) => f.id === filter.fieldId);
                  return (
                    <Chip
                      key={index}
                      label={`${field?.display_name || field?.name}: ${filter.operator}`}
                      onDelete={() => {
                        const newFilters = activeFilters.filter((_, i) => i !== index);
                        setActiveFilters(newFilters);
                      }}
                      size="small"
                    />
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Таблица */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      {column.sortable ? (
                        <TableSortLabel
                          active={orderBy === column.id}
                          direction={orderBy === column.id ? order : 'asc'}
                          onClick={() => handleSort(column.id)}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        column.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recordsLoading ? (
                  // Скелетон загрузки
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => (
                        <TableCell key={column.id}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        {searchQuery || activeFilters.length > 0
                          ? 'Записи не найдены. Попробуйте изменить параметры поиска.'
                          : 'Записей пока нет. Нажмите "Добавить запись" для создания первой.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record: any) => {
                    const canEdit = record.attributes.canEdit || isAdmin;
                    const isOwner = record.attributes.isOwner;
                    
                    return (
                      <TableRow
                        key={record.id}
                        hover
                        onClick={() => handleRowClick(record)}
                        sx={{
                          cursor: canEdit ? 'pointer' : 'default',
                          opacity: canEdit ? 1 : 0.7,
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {record.attributes.inventory_number}
                            {!canEdit && (
                              <Tooltip title="Только просмотр">
                                <LockIcon fontSize="small" color="action" />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.attributes.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </TableCell>
                        
                        {/* Динамические поля */}
                        {fieldsData?.data.map((fieldDef: any) => {
                          const field = record.attributes.fields?.find(
                            (f: any) => f.field_name === fieldDef.name
                          );
                          return (
                            <TableCell key={fieldDef.id}>
                              {field ? formatFieldValue(field) : '—'}
                            </TableCell>
                          );
                        })}
                        
                        {/* Создатель */}
                        {(showAllRecords || isAdmin) && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {record.attributes.created_by?.data?.attributes?.username || '—'}
                              </Typography>
                            </Box>
                          </TableCell>
                        )}
                        
                        {/* Действия */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, record)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Пагинация */}
          <TablePagination
            component="div"
            count={records.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Записей на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
          />
        </CardContent>
      </Card>

      {/* Меню действий */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit} disabled={!selectedRecord?.attributes?.canEdit && !isAdmin}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={!selectedRecord?.attributes?.canEdit && !isAdmin}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Диалог фильтров */}
      <AdvancedFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        fields={fieldsData?.data || []}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
      />

      {/* Диалог экспорта */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        records={records}
        fields={fieldsData?.data || []}
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Удалить запись?"
        message="Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="Удалить"
        cancelText="Отмена"
        confirmColor="error"
      />
    </Box>
  );
};

export default RecordsPage;