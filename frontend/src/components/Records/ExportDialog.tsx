// frontend/src/components/Records/ExportDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { format as formatDate } from 'date-fns';
import { api } from '../../services/api';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  records: any[];
  fields: any[];
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  records,
  fields,
}) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [includeSystemFields, setIncludeSystemFields] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(fields.map(field => field.id));
  };

  const handleSelectNone = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Отправляем запрос на сервер для экспорта
      const response = await api.post(
        '/api/records/export',
        {
          format: exportFormat,
          selectedFields: includeSystemFields ? selectedFields : [],
        },
        {
          responseType: 'blob',
        }
      );
      
      // Создаем ссылку для скачивания
      const blob = new Blob([response.data], {
        type: exportFormat === 'csv' 
          ? 'text/csv;charset=utf-8' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `records_export_${formatDate(new Date(), 'yyyy-MM-dd_HH-mm')}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте данных. Попробуйте еще раз.');
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = selectedFields.length > 0 || includeSystemFields;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Экспорт данных
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* Формат файла */}
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Формат файла</FormLabel>
            <RadioGroup
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
              row
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel 
                value="excel" 
                control={<Radio />} 
                label="Excel" 
              />
            </RadioGroup>
          </FormControl>

          {/* Системные поля */}
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeSystemFields}
                  onChange={(e) => setIncludeSystemFields(e.target.checked)}
                />
              }
              label="Включить системные поля (штрихкод, дата создания, создатель)"
            />
          </FormControl>

          {/* Пользовательские поля */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <FormLabel component="legend">Пользовательские поля</FormLabel>
              <Box>
                <Button size="small" onClick={handleSelectAll}>
                  Выбрать все
                </Button>
                <Button size="small" onClick={handleSelectNone} sx={{ ml: 1 }}>
                  Снять все
                </Button>
              </Box>
            </Box>
            
            <FormGroup>
              {fields.map((field) => {
                const fieldData = field.attributes || field;
                return (
                  <FormControlLabel
                    key={field.id}
                    control={
                      <Checkbox
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                      />
                    }
                    label={fieldData.name}
                  />
                );
              })}
            </FormGroup>
          </FormControl>

          {/* Информация о количестве записей */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Будет экспортировано записей: {records.length}
          </Typography>

          {/* Предупреждение если ничего не выбрано */}
          {!canExport && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Выберите хотя бы одно поле для экспорта
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Отмена
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={!canExport || isExporting}
          startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
        >
          {isExporting ? 'Экспорт...' : 'Экспортировать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};