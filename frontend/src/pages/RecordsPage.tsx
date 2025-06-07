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

  // Состояния - администратор по умолчанию видит все записи, обычный пользователь - только свои
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [showAllRecords, setShowAllRecords] = useState(isAdmin);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Загрузка данных - добавляем refetchOnWindowFocus и правильный ключ кеша
  const { data: recordsData = { data: [] }, isLoading: recordsLoading, error: recordsError } = useQuery({
    queryKey: ['records', showAllRecords], // Упрощаем ключ кеша
    queryFn: () => {
      console.log('Загружаем записи с showAll:', showAllRecords);
      return recordsApi.getAll({ showAll: showAllRecords });
    },
    staleTime: 0, // Не кешируем данные
    refetchOnWindowFocus: false,
  });

  const { data: fieldsData = { data: [] } } = useQuery({
    queryKey: ['fields'],
    queryFn: () => fieldsApi.getAll(),
    staleTime: 5 * 60 * 1000,
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

  // Обработка фильтрации и сортировки (применяем только поиск и дополнительные фильтры)
  // Фильтрация по владельцу происходит на бэкенде через параметр showAll
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

    // Применяем дополнительные фильтры
    if (activeFilters.length > 0) {
      filtered = applyFiltersToData(filtered, activeFilters);
    }

    // Применяем сортировку
    filtered.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
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
  const handleClearSearch = () => {
    setSearchQuery('');
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

  // Обработчик переключения showAllRecords
  const handleShowAllToggle = (checked: boolean) => {
    console.log('Переключение showAll на:', checked);
    setShowAllRecords(checked);
    setPage(0); // Сбрасываем на первую страницу
    
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
          >
            Экспорт
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/records/create')}
          >
            Добавить
          </Button>
        </Box>
      </Box>

      {/* Поиск и фильтры */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Поиск */}
            <TextField
              placeholder="Поиск записей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 250, flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Переключатель для фильтрации записей */}
            <FormControlLabel
              control={
                <Switch
                  checked={showAllRecords}
                  onChange={(e) => handleShowAllToggle(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" />
                  <Typography variant="body2">
                    {showAllRecords ? 'Показывать все записи' : 'Показывать только мои записи'}
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Активные фильтры */}
          {activeFilters.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Активные фильтры:
              </Typography>
              {activeFilters.map((filter, index) => (
                <Chip
                  key={index}
                  label={`${filter.field}: ${filter.operator} ${filter.value}`}
                  onDelete={() => {
                    const newFilters = activeFilters.filter((_, i) => i !== index);
                    setActiveFilters(newFilters);
                  }}
                  size="small"
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Таблица записей */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'inventoryNumber'}
                      direction={orderBy === 'inventoryNumber' ? order : 'asc'}
                      onClick={() => handleSort('inventoryNumber')}
                    >
                      Инвентарный номер
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
                  {fieldsData?.data?.slice(0, 3).map((field: any) => (
                    <TableCell key={field.id}>
                      <TableSortLabel
                        active={orderBy === field.name}
                        direction={orderBy === field.name ? order : 'asc'}
                        onClick={() => handleSort(field.name)}
                      >
                        {field.name}
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

                  {/* Столбец "Владелец" всегда виден */}
                  <TableCell>Владелец</TableCell>

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
                    const canEdit = record.canEdit || record.isOwner || isAdmin;
                    const ownerData = record.owner;
                    
                    return (
                      <TableRow
                        key={record.id}
                        hover
                        onClick={() => navigate(`/records/${record.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {record.inventoryNumber}
                        </TableCell>
                        
                        <TableCell>
                          {record.barcode}
                        </TableCell>

                        {/* Динамические поля */}
                        {fieldsData?.data?.slice(0, 3).map((field: any) => {
                          const value = record.dynamicData?.[field.id];
                          
                          return (
                            <TableCell key={field.id}>
                              {formatFieldValue(value, field.fieldType)}
                            </TableCell>
                          );
                        })}

                        <TableCell>
                          {format(
                            new Date(record.createdAt),
                            'dd.MM.yyyy HH:mm',
                            { locale: ru }
                          )}
                        </TableCell>

                        {/* Столбец "Владелец" всегда виден */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {ownerData?.fullName || ownerData?.username || 'Неизвестно'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={canEdit ? 'Доступны действия' : 'Недостаточно прав'}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuClick(e, record)}
                                disabled={!canEdit}
                              >
                                {canEdit ? <MoreVertIcon /> : <LockIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
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
        <MenuItem onClick={handleEdit} disabled={!selectedRecord?.canEdit && !isAdmin}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={!selectedRecord?.canEdit && !isAdmin}>
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