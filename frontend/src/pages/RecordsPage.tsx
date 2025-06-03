/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import RecordsTable from '../components/Records/RecordsTable';
import DynamicForm from '../components/Records/DynamicForm';

const RecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Получение кастомных полей
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      const { data } = await api.get('/api/custom-fields?sort=order');
      console.log('Custom fields response:', data);
      return data.data;
    },
  });

const { data: recordsData, isLoading, refetch, error } = useQuery({
    queryKey: ['records', page, pageSize, searchQuery],
    queryFn: async () => {
      const params: any = {
        'pagination[page]': page + 1,
        'pagination[pageSize]': pageSize,
        'populate': '*',
      };

      if (searchQuery) {
        params['filters[$or][0][inventoryNumber][$containsi]'] = searchQuery;
        params['filters[$or][1][barcode][$containsi]'] = searchQuery;
        params['filters[$or][2][name][$containsi]'] = searchQuery;
      }

      console.log('Request params:', params); // Для отладки
      
      const { data } = await api.get('/api/records', { params });
      console.log('Records response:', data); // Для отладки
      return data;
    },
    retry: 1,
    staleTime: 30000, // 30 секунд
  });

  // Показываем ошибку если есть
  React.useEffect(() => {
    if (error) {
      console.error('Error loading records:', error);
    }
  }, [error]);

  const handleCreateRecord = async (formData: any) => {
    try {
      console.log('Creating record with data:', formData);
      
      const response = await api.post('/api/records', { 
        data: formData 
      });
      
      console.log('Create response:', response);
      
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error creating record:', error);
      console.error('Error response:', error.response?.data);
      
      // Более детальная информация об ошибке
      let errorMessage = 'Неизвестная ошибка';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.error?.details?.errors) {
        errorMessage = error.response.data.error.details.errors.map((e: any) => e.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Ошибка: ${errorMessage}`);
    }
  };

  const handleRowClick = (record: any) => {
    navigate(`/records/${record.id}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Записи</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          Добавить запись
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Поиск по инвентарному номеру, штрихкоду или названию"
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
                <IconButton onClick={() => setSearchQuery('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <RecordsTable
        records={recordsData?.data || []}
        customFields={customFields}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalPages={recordsData?.meta?.pagination?.pageCount || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
      />

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создание новой записи</DialogTitle>
        <DialogContent>
          <DynamicForm
            fields={customFields}
            onSubmit={handleCreateRecord}
            showNameField={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Отмена</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordsPage;