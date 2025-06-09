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
} from '@mui/material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RecordsTableProps {
  records: any[];
  customFields: any[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (record: any) => void;
}

const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  customFields,
  isLoading,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Мобильная версия - карточки
  if (isMobile) {
    return (
      <Box>
        <Stack spacing={2}>
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
                      <Typography variant="body2">
                        {recordData.barcode}
                      </Typography>
                    </Box>

                    {recordData.name && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Название
                        </Typography>
                        <Typography variant="body2">
                          {recordData.name}
                        </Typography>
                      </Box>
                    )}

                    {/* Показываем первые 2 кастомных поля */}
                    {customFields.slice(0, 2).map((field) => {
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
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Инв. номер</TableCell>
              <TableCell>Штрихкод</TableCell>
              {customFields.slice(0, 3).map((field) => (
                <TableCell key={field.id}>
                  {field.attributes?.name || field.name}
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
                  <TableCell>{recordData.barcode}</TableCell>
                  {customFields.slice(0, 3).map((field) => {
                    const fieldData = field.attributes || field;
                    return (
                      <TableCell key={field.id}>
                        {formatFieldValue(
                          recordData.dynamicData?.[field.id],
                          fieldData.fieldType
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    {ownerData?.fullName || ownerData?.username || '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(recordData.createdAt), 'dd.MM.yyyy', {
                      locale: ru,
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={4 + customFields.slice(0, 3).length} align="center">
                  Записи не найдены
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
    case 'CHECKBOX':
      return value ? 'Да' : 'Нет';
    default:
      return String(value);
  }
}

export default RecordsTable;