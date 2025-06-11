/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RecordsTableProps {
  records: any[];
  customFields: any[];
  visibleColumns?: string[]; // НОВОЕ: пропс для видимых столбцов
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (record: any) => void;
  onColumnSettingsClick?: () => void; // НОВОЕ: обработчик для настройки столбцов
}

const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  customFields,
  visibleColumns = [],
  isLoading,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onColumnSettingsClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Фильтруем поля по видимости
  const visibleFields = customFields.filter(field => 
    visibleColumns.includes(field.id)
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Мобильная версия - карточки (показываем первые 2 видимых поля)
  if (isMobile) {
    return (
      <Box>
        <Stack spacing={2}>
          {/* Кнопка настройки столбцов на мобильном */}
          {onColumnSettingsClick && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Tooltip title="Настроить видимые поля">
                <IconButton 
                  onClick={onColumnSettingsClick}
                  size="small"
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                >
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {records.map((record) => {
            const recordData = record.attributes || record;
            const ownerData = recordData.owner?.data?.attributes || recordData.owner;
            
            return (
              <Card 
                key={record.id}
                onClick={() => onRowClick(record)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3,
                  }
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Chip 
                        label={format(new Date(recordData.createdAt), 'dd.MM.yy', { locale: ru })}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Штрихкод
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {recordData.barcode}
                      </Typography>
                    </Box>



                    {/* ОБНОВЛЕНО: Показываем первые 2 видимых поля */}
                    {visibleFields.slice(0, 2).map((field) => {
                      const fieldData = field.attributes || field;
                      const value = recordData.dynamicData?.[field.id];
                      if (!value) return null;
                      
                      return (
                        <Box key={field.id}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {fieldData.name}
                          </Typography>
                          <Typography variant="body2">
                            {formatFieldValue(value, fieldData.fieldType)}
                          </Typography>
                        </Box>
                      );
                    })}

                    {/* Показываем количество скрытых полей */}
                    {visibleFields.length > 2 && (
                      <Box>
                        <Chip 
                          size="small" 
                          label={`+${visibleFields.length - 2} полей`} 
                          variant="outlined"
                          color="primary"
                        />
                      </Box>
                    )}

                    <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">
                        Владелец: {ownerData?.fullName || ownerData?.username || '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          
          {records.length === 0 && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Записи не найдены
              </Typography>
            </Paper>
          )}
        </Stack>
        
        <TablePagination
          component="div"
          count={totalPages * pageSize}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
          labelRowsPerPage="На странице:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Box>
    );
  }

  // Десктопная версия - таблица
  return (
    <Paper>
      {/* НОВОЕ: Заголовок с кнопкой настройки столбцов */}
      {onColumnSettingsClick && (
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">
            Записи ({records.length})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Показано столбцов: {visibleFields.length + 3} / {customFields.length + 3}
            </Typography>
            <Tooltip title="Настроить видимые столбцы">
              <IconButton onClick={onColumnSettingsClick} size="small">
                <ViewColumnIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Штрихкод</TableCell>
              
              {/* ОБНОВЛЕНО: Показываем только видимые поля */}
              {visibleFields.map((field) => (
                <TableCell key={field.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {field.attributes?.name || field.name}
                    {field.attributes?.isRequired && (
                      <Chip 
                        size="small" 
                        label="*" 
                        color="error" 
                        variant="outlined"
                        sx={{ minWidth: 'auto', width: 20, height: 20 }}
                      />
                    )}
                  </Box>
                </TableCell>
              ))}
              
              <TableCell>Владелец</TableCell>
              <TableCell>Дата создания</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => {
              const recordData = record.attributes || record;
              const ownerData = recordData.owner?.data?.attributes || recordData.owner;
              
              return (
                <TableRow
                  key={record.id}
                  hover
                  onClick={() => onRowClick(record)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {recordData.barcode}
                    </Typography>
                  </TableCell>
                  
                  {/* ОБНОВЛЕНО: Показываем данные только для видимых полей */}
                  {visibleFields.map((field) => {
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
                      {format(new Date(recordData.createdAt), 'dd.MM.yyyy', {
                        locale: ru,
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {records.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={3 + visibleFields.length} 
                  align="center"
                  sx={{ py: 6 }}
                >
                  <Box>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Записи не найдены
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Попробуйте изменить критерии поиска или фильтры
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalPages * pageSize}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
        labelRowsPerPage="Записей на странице:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Paper>
  );
};

function formatFieldValue(value: any, fieldType: string): string {
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
}

export default RecordsTable;