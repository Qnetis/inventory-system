import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  FormGroup,
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';

const ExportData: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // Получение кастомных полей
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      const { data } = await api.get('/api/custom-fields');
      return data.data;
    },
  });

  // Мутация для экспорта
  const exportMutation = useMutation({
    mutationFn: async () => {
      const fields = selectAll ? [] : selectedFields;
      const { data } = await api.post(
        '/api/records/export',
        { format, fields },
        { responseType: 'blob' }
      );
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectAll(event.target.checked);
    if (event.target.checked) {
      setSelectedFields([]);
    }
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Экспорт данных
        </Typography>

        <Box sx={{ mt: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Формат экспорта</FormLabel>
            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'excel')}
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="excel" control={<Radio />} label="Excel" />
            </RadioGroup>
          </FormControl>
        </Box>

        <Box sx={{ mt: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Поля для экспорта</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                  />
                }
                label="Все поля"
              />
              
              {!selectAll && (
                <Box sx={{ ml: 3, mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Стандартные поля:
                  </Typography>
                  <FormControlLabel
                    control={<Checkbox checked disabled />}
                    label="Инвентарный номер"
                  />
                  <FormControlLabel
                    control={<Checkbox checked disabled />}
                    label="Штрихкод"
                  />
                  <FormControlLabel
                    control={<Checkbox checked disabled />}
                    label="Владелец"
                  />
                  <FormControlLabel
                    control={<Checkbox checked disabled />}
                    label="Дата создания"
                  />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
                    Кастомные поля:
                  </Typography>
                  {customFields.map((field: any) => (
                    <FormControlLabel
                      key={field.id}
                      control={
                        <Checkbox
                          checked={selectedFields.includes(field.id)}
                          onChange={() => handleFieldToggle(field.id)}
                        />
                      }
                      label={field.attributes.name}
                    />
                  ))}
                </Box>
              )}
            </FormGroup>
          </FormControl>
        </Box>

        {exportMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Произошла ошибка при экспорте данных
          </Alert>
        )}

        {exportMutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Данные успешно экспортированы
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={
              exportMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={handleExport}
            disabled={exportMutation.isPending || (!selectAll && selectedFields.length === 0)}
          >
            {exportMutation.isPending ? 'Экспорт...' : 'Экспортировать'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ExportData;