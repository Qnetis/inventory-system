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
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Инв. номер</TableCell>
              <TableCell>Штрихкод</TableCell>
              {customFields.slice(0, 3).map((field) => (
                <TableCell key={field.id}>{field.name}</TableCell>
              ))}
              <TableCell>Владелец</TableCell>
              <TableCell>Дата создания</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={record.id}
                hover
                onClick={() => onRowClick(record)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{record.attributes.inventoryNumber}</TableCell>
                <TableCell>{record.attributes.barcode}</TableCell>
                {customFields.slice(0, 3).map((field) => (
                  <TableCell key={field.id}>
                    {formatFieldValue(
                      record.attributes.dynamicData?.[field.id],
                      field.fieldType
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {record.attributes.owner?.data?.attributes?.fullName ||
                    record.attributes.owner?.data?.attributes?.username}
                </TableCell>
                <TableCell>
                  {format(new Date(record.attributes.createdAt), 'dd.MM.yyyy', {
                    locale: ru,
                  })}
                </TableCell>
              </TableRow>
            ))}
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