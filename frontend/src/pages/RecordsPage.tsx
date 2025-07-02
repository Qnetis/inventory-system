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
  Stack,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  useTheme,
  useMediaQuery,
  ListItemIcon,
  ListItemText,

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  // Загрузка данных
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

  // Загрузка кастомных полей
  const { data: fieldsResponse, isLoading: fieldsLoading, error: fieldsError } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      try {
        const response = await fieldsApi.getAll();
        console.log('Fields API response:', response);
        return response;
      } catch (error) {
        console.error('Fields API error:', error);
        throw error;
      }
    },
  });

  // Безопасное извлечение данных
  const records = useMemo(() => {
    if (!recordsResponse) return [];
    
    if (recordsResponse.data) {
      return Array.isArray(recordsResponse.data) ? recordsResponse.data : [];
    }
    
    if (Array.isArray(recordsResponse)) {
      return recordsResponse;
    }
    
    console.warn('Unexpected records response format:', recordsResponse);
    return [];
  }, [recordsResponse]);

  const fields = useMemo(() => {
    if (!fieldsResponse) return [];
    
    if (fieldsResponse.data) {
      return Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [];
    }
    
    if (Array.isArray(fieldsResponse)) {
      return fieldsResponse;
    }
    
    console.warn('Unexpected fields response format:', fieldsResponse);
    return [];
  }, [fieldsResponse]);

  // Инициализация видимых столбцов
  React.useEffect(() => {
    const savedColumns = localStorage.getItem('recordsVisibleColumns');
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    } else if (fields.length > 0) {
      // По умолчанию показываем первые 3 поля
      setVisibleColumns(fields.slice(0, 3).map((f: any) => f.id));
    }
  }, [fields]);

  // Мутации
  const createMutation = useMutation({
    mutationFn: (data: any) => recordsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      console.error('Create error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
    },
  });

  // Фильтрация и сортировка
  const searchFilteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    
    const lowerQuery = searchQuery.toLowerCase();
    return records.filter((record: any) => {
      const recordData = record.attributes || record;
      
      // Поиск по штрихкоду
      if (recordData.barcode?.toLowerCase().includes(lowerQuery)) return true;
      
      // Поиск по динамическим полям
      if (recordData.dynamicData) {
        return Object.values(recordData.dynamicData).some((value: any) => 
          String(value).toLowerCase().includes(lowerQuery)
        );
      }
      
      return false;
    });
  }, [records, searchQuery]);

  const filteredRecords = useMemo(() => {
    if (!activeFilters.length) return searchFilteredRecords;
    return applyFiltersToData(searchFilteredRecords, activeFilters);
  }, [searchFilteredRecords, activeFilters]);

  const sortedRecords = useMemo(() => {
    if (!orderBy) return filteredRecords;
    
    return [...filteredRecords].sort((a, b) => {
      const aData = a.attributes || a;
      const bData = b.attributes || b;
      
      let aValue = aData[orderBy];
      let bValue = bData[orderBy];
      
      if (orderBy === 'owner') {
        aValue = aData.owner?.data?.attributes?.fullName || aData.owner?.data?.attributes?.username || '';
        bValue = bData.owner?.data?.attributes?.fullName || bData.owner?.data?.attributes?.username || '';
      } else if (fields.some((f: any) => f.id === orderBy)) {
        aValue = aData.dynamicData?.[orderBy] || '';
        bValue = bData.dynamicData?.[orderBy] || '';
      }
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredRecords, orderBy, order, fields]);

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
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedRecord) {
      const recordId = selectedRecord.documentId || selectedRecord.id;
      navigate(`/records/${recordId}`);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
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
    console.log('🖱️ Клик по строке записи:', record);
    const recordId = record.documentId || record.id;
    
    if (recordId) {
      console.log('✅ Переход к записи:', `/records/${recordId}`);
      navigate(`/records/${recordId}`);
    } else {
      console.error('❌ ID записи не найден:', record);
      alert('Ошибка: не удалось определить ID записи');
    }
  };

  const handleColumnsChange = (columns: string[]) => {
    setVisibleColumns(columns);
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

  // Обработчики мобильного меню
  const handleActionMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  // Состояния загрузки
  if (recordsLoading || fieldsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка данных...</Typography>
      </Box>
    );
  }

  // Обработка ошибок
  if (recordsError || fieldsError) {
    return (
      <Box p={2}>
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
    <Box sx={{ pb: isMobile ? 8 : 2 }}>
      {/* Заголовок и кнопки - адаптивная версия */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 3,
        gap: isMobile ? 2 : 0,
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          Записи
        </Typography>
        
        {/* Кнопки для десктопа */}
        {!isMobile && (
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
        )}

        {/* Кнопки для мобильных - компактное меню */}
        {isMobile && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              size="small"
              fullWidth
            >
              Добавить
            </Button>
            <IconButton
              onClick={handleActionMenuClick}
              sx={{ 
                border: 1, 
                borderColor: 'divider',
                borderRadius: 1 
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Меню действий для мобильных */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => {
          handleActionMenuClose();
          setColumnVisibilityOpen(true);
        }}>
          <ListItemIcon>
            <ViewColumnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Настроить столбцы</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleActionMenuClose();
          setExportDialogOpen(true);
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Экспорт данных</ListItemText>
        </MenuItem>
      </Menu>

      {/* Панель управления - адаптивная */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: isMobile ? 2 : 3 }}>
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2}
            alignItems={isMobile ? "stretch" : "center"}
          >
            {/* Поиск */}
            <TextField
              placeholder="Поиск по штрихкоду или содержимому..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
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
              sx={{ 
                minWidth: isMobile ? 'auto' : 300, 
                flexGrow: isMobile ? 0 : 1 
              }}
            />

            {/* Фильтры и переключатель - в одну строку на мобильных */}
            <Box sx={{ 
              display: 'flex', 
              gap: isMobile ? 1 : 2, 
              alignItems: 'center',
              justifyContent: isMobile ? 'space-between' : 'flex-start',
              width: isMobile ? '100%' : 'auto',
            }}>
              {/* Кнопка фильтров */}
              <Badge badgeContent={activeFilters.length} color="primary">
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFiltersOpen(true)}
                  size={isMobile ? "small" : "medium"}
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
                      size={isMobile ? "small" : "medium"}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon fontSize="small" />
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        {isMobile ? "Все" : "Показать все"}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              )}
            </Box>
          </Stack>

          {/* Информация о фильтрах - компактная для мобильных */}
          {activeFilters.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary" sx={{ mr: 1 }}>
                Активные фильтры:
              </Typography>
              {activeFilters.map((filter: any) => (
                <Chip
                  key={filter.id}
                  label={`${fields.find((f: any) => f.id === filter.field)?.attributes?.name || filter.field}`}
                  size="small"
                  onDelete={() => {
                    setActiveFilters(activeFilters.filter(f => f.id !== filter.id));
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Таблица - адаптивная версия */}
      <Card>
        <CardContent sx={{ p: isMobile ? 1 : 2 }}>
          {/* Мобильная версия - карточки */}
          {isMobile ? (
            <Stack spacing={1}>
              {paginatedRecords.map((record: any) => {
                if (!record || !record.id) return null;

                const recordData = record.attributes || record;
                const ownerData = recordData.owner?.data?.attributes || recordData.owner;
                
                // Показываем только первые 2 видимых поля на мобильных
                const mobileVisibleFields = fields.filter((f: any) => 
                  visibleColumns.includes(f.id)
                ).slice(0, 2);

                return (
                  <Card 
                    key={record.id}
                    variant="outlined"
                    onClick={() => handleRowClick(record)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {recordData.barcode}
                          </Typography>
                          
                          {mobileVisibleFields.map((field: any) => {
                            const fieldData = field.attributes || field;
                            const value = recordData.dynamicData?.[field.id];
                            
                            if (!value) return null;
                            
                            return (
                              <Typography key={field.id} variant="caption" display="block" color="text.secondary">
                                {fieldData.name}: {formatFieldValue(value, fieldData.fieldType)}
                              </Typography>
                            );
                          })}
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {ownerData?.fullName || ownerData?.username} • {format(new Date(recordData.createdAt), 'dd.MM.yyyy', { locale: ru })}
                          </Typography>
                        </Box>
                        
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuClick(e, record);
                          }}
                          size="small"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                );
              }).filter(Boolean)}
              
              {paginatedRecords.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Записи не найдены
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Попробуйте изменить критерии поиска или фильтры
                  </Typography>
                </Box>
              )}
            </Stack>
          ) : (
            // Десктопная версия - таблица
            <>
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
                      
                      {fields
                        .filter((field: any) => visibleColumns.includes(field.id))
                        .map((field: any) => {
                          const fieldData = field.attributes || field;
                          return (
                            <TableCell key={field.id}>
                              <TableSortLabel
  active={orderBy === field.id}
  direction={orderBy === field.id ? order : 'asc'}
  onClick={() => handleSort(field.id)}
>
  {fieldData.name}
  {fieldData.isRequired && (
    <Typography 
      component="span" 
      color="error" 
      sx={{ ml: 0.5, fontSize: 'inherit' }}
    >
      *
    </Typography>
  )}
</TableSortLabel>
                            </TableCell>
                          );
                        })}
                      
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'owner'}
                          direction={orderBy === 'owner' ? order : 'asc'}
                          onClick={() => handleSort('owner')}
                        >
                          Владелец
                        </TableSortLabel>
                      </TableCell>
                      
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
                    {paginatedRecords.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={4 + fields.filter((f: any) => visibleColumns.includes(f.id)).length} 
                          align="center"
                          sx={{ py: 6 }}
                        >
                          <Box>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                              {!Array.isArray(records) 
                                ? 'Ошибка формата данных' 
                                : 'Записи не найдены'}
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
                                {recordData.createdAt ?
                                  format(new Date(recordData.createdAt), 'dd.MM.yyyy', {
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
                      }).filter(Boolean)
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          
          {/* Пагинация - адаптивная */}
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
            labelRowsPerPage={isMobile ? "На стр.:" : "Записей на странице:"}
            labelDisplayedRows={({ from, to, count }) => 
              isMobile ? `${from}-${to} / ${count}` : `${from}-${to} из ${count}`
            }
            rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
            sx={{
              '.MuiTablePagination-toolbar': {
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                justifyContent: isMobile ? 'center' : 'flex-end',
              },
              '.MuiTablePagination-selectLabel': {
                m: isMobile ? 0 : 1,
              },
              '.MuiTablePagination-displayedRows': {
                m: isMobile ? 0 : 1,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
              },
            }}
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
        message={`Вы уверены, что хотите удалить запись ${selectedRecord?.barcode ? `со штрихкодом "${selectedRecord.barcode}"` : `с ID "${selectedRecord?.id}"`}? Это действие нельзя отменить.`}
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

      {/* Floating Action Button для мобильных */}
      {isMobile && (
        <SpeedDial
          ariaLabel="Быстрые действия"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<AddIcon />}
            tooltipTitle="Добавить запись"
            onClick={() => setCreateDialogOpen(true)}
          />
          <SpeedDialAction
            icon={<FilterIcon />}
            tooltipTitle="Фильтры"
            onClick={() => setFiltersOpen(true)}
          />
          <SpeedDialAction
            icon={<ViewColumnIcon />}
            tooltipTitle="Столбцы"
            onClick={() => setColumnVisibilityOpen(true)}
          />
        </SpeedDial>
      )}
    </Box>
  );
};

export default RecordsPage;