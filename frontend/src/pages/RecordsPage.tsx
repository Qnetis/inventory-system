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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AdvancedFilters, applyFiltersToData } from '../components/Records/AdvancedFilters';
import { recordsApi, fieldsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ExportDialog } from '../components/Records/ExportDialog';
import { ConfirmDialog } from '../components/Common/ConfirmDialog';

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

  // Загрузка данных с обновленным синтаксисом для React Query v5
  const { data: recordsData = { data: [] }, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ['records', { showAll: showAllRecords }],
    queryFn: () => recordsApi.getAll({ showAll: showAllRecords }),
    placeholderData: (previousData) => previousData, // Заменяет keepPreviousData
  });

  const { data: fieldsData = { data: [] } } = useQuery({
    queryKey: ['fields'],
    queryFn: () => fieldsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  // Мутация для удаления записи
  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
    },
  });

  // Обработка фильтрации и сортировки
  const filteredRecords = useMemo(() => {
    if (!recordsData?.data) return [];
    
    let filtered = [...recordsData.data];

    // Применяем поиск
    if (searchQuery) {
      filtered = filtered.filter(record => {
        const searchableText = JSON.stringify(record).toLowerCase();
        return searchableText.includes(searchQuery.toLowerCase());
      });
    }

    // Применяем фильтры
    if (activeFilters.length > 0) {
            filtered = applyFiltersToData(filtered, activeFilters, fieldsData.data);

    }

    // Применяем сортировку
    filtered.sort((a, b) => {
      const aValue = a.attributes?.[orderBy] || a[orderBy];
      const bValue = b.attributes?.[orderBy] || b[orderBy];
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [recordsData?.data, searchQuery, activeFilters, orderBy, order]);

  // Пагинация
  const paginatedRecords = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  // Обработчики событий
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(0);
  };

  const formatFieldValue = (value: any, fieldType: string) => {
    if (!value) return '';
    
    switch (fieldType) {
      case 'money':
        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB'
        }).format(parseFloat(value));
      case 'number':
        return new Intl.NumberFormat('ru-RU').format(parseFloat(value));
      case 'checkbox':
        return value ? 'Да' : 'Нет';
      case 'date':
        return format(new Date(value), 'dd.MM.yyyy', { locale: ru });
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
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
            disabled={filteredRecords.length === 0}
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

      {/* Панель управления */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Поиск */}
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
                    <IconButton onClick={handleClearSearch} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300, flex: 1 }}
            />

            {/* Переключатель показа всех записей для админа */}
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

            {/* Активные фильтры */}
            {activeFilters.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {activeFilters.map((filter, index) => (
                  <Chip
                    key={index}
                    label={`${filter.field}: ${filter.value}`}
                    size="small"
                    onDelete={() => {
                      const newFilters = activeFilters.filter((_, i) => i !== index);
                      handleApplyFilters(newFilters);
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Таблица записей */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'inventory_number'}
                      direction={orderBy === 'inventory_number' ? order : 'asc'}
                      onClick={() => handleSort('inventory_number')}
                    >
                      Инв. номер
                    </TableSortLabel>
                  </TableCell>
                  
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'barcode'}
                      direction={orderBy === 'barcode' ? order : 'asc'}
                      onClick={() => handleSort('barcode')}
                    >
                      Штрихкод
                    </TableSortLabel>
                  </TableCell>

                  {/* Динамические поля */}
                  {fieldsData?.data?.map((field: any) => (
                    <TableCell key={field.id}>
                      <TableSortLabel
                        active={orderBy === field.name}
                        direction={orderBy === field.name ? order : 'asc'}
                        onClick={() => handleSort(field.name)}
                      >
                        {field.display_name || field.name}
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

                  {isAdmin && (
                    <TableCell>Владелец</TableCell>
                  )}

                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={fieldsData?.data?.length + 5} align="center">
                      <Typography color="text.secondary">
                        Записи не найдены
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => {
                    const canEdit = record.attributes?.canEdit || isAdmin;
                    
                    return (
                      <TableRow
                        key={record.id}
                        hover
                        onClick={() => navigate(`/records/${record.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {record.attributes?.inventory_number || record.inventory_number}
                        </TableCell>
                        
                        <TableCell>
                          {record.attributes?.barcode || record.barcode}
                        </TableCell>

                        {/* Динамические поля */}
                        {fieldsData?.data?.map((field: any) => {
                          const recordField = record.attributes?.fields?.find(
                            (f: any) => f.field_name === field.name
                          ) || record.fields?.find(
                            (f: any) => f.field_name === field.name
                          );
                          
                          const value = recordField?.value;
                          
                          return (
                            <TableCell key={field.id}>
                              {formatFieldValue(value, field.field_type)}
                            </TableCell>
                          );
                        })}

                        <TableCell>
                          {format(
                            new Date(record.attributes?.createdAt || record.createdAt),
                            'dd.MM.yyyy HH:mm',
                            { locale: ru }
                          )}
                        </TableCell>

                        {isAdmin && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {record.attributes?.created_by?.full_name || 
                                 record.attributes?.created_by?.username ||
                                 record.created_by?.full_name ||
                                 record.created_by?.username ||
                                 'Неизвестно'}
                              </Typography>
                              {!canEdit && (
                                <Tooltip title="Только для чтения">
                                  <LockIcon fontSize="small" color="disabled" />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        )}

                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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
            count={filteredRecords.length}
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
        records={filteredRecords}
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