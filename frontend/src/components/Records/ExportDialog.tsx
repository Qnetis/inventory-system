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
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

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
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [includeSystemFields, setIncludeSystemFields] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    if (open && fields.length > 0) {
      // По умолчанию выбираем все поля
      setSelectedFields(fields.map(f => f.id));
    }
  }, [open, fields]);

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(fields.map(f => f.id));
  };

  const handleSelectNone = () => {
    setSelectedFields([]);
  };

  const generateCSV = () => {
    const headers = [];
    
    // Системные поля
    if (includeSystemFields) {
      headers.push('Инвентарный номер', 'Штрихкод', 'Дата создания', 'Создатель');
    }
    
    // Пользовательские поля
    selectedFields.forEach(fieldId => {
      const field = fields.find(f => f.id === fieldId);
      if (field) {
        headers.push(field.display_name || field.name);
      }
    });

    const rows = [headers.join(',')];

    records.forEach(record => {
      const row = [];
      
      // Системные поля
      if (includeSystemFields) {
        row.push(
          `"${record.attributes?.inventory_number || record.inventory_number || ''}"`,
          `"${record.attributes?.barcode || record.barcode || ''}"`,
          `"${new Date(record.attributes?.createdAt || record.createdAt).toLocaleDateString('ru-RU')}"`,
          `"${record.attributes?.created_by?.full_name || record.attributes?.created_by?.username || record.created_by?.full_name || record.created_by?.username || ''}"`
        );
      }
      
      // Пользовательские поля
      selectedFields.forEach(fieldId => {
        const field = fields.find(f => f.id === fieldId);
        if (field) {
          const recordField = record.attributes?.fields?.find(
            (f: any) => f.field_name === field.name
          ) || record.fields?.find(
            (f: any) => f.field_name === field.name
          );
          
          let value = recordField?.value || '';
          
          // Форматирование в зависимости от типа поля
          if (field.field_type === 'money' && value) {
            value = new Intl.NumberFormat('ru-RU').format(parseFloat(value));
          } else if (field.field_type === 'checkbox') {
            value = value ? 'Да' : 'Нет';
          }
          
          row.push(`"${String(value).replace(/"/g, '""')}"`);
        }
      });
      
      rows.push(row.join(','));
    });

    return rows.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0 && !includeSystemFields) {
      return;
    }

    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (format === 'csv') {
        const csvContent = generateCSV();
        downloadFile(
          '\uFEFF' + csvContent, // BOM для корректного отображения русских символов
          `records_${timestamp}.csv`,
          'text/csv;charset=utf-8'
        );
      } else {
        // Для Excel можно использовать библиотеку xlsx
        // Пока что используем CSV формат с расширением .xlsx
        const csvContent = generateCSV();
        downloadFile(
          '\uFEFF' + csvContent,
          `records_${timestamp}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      }
      
      onClose();
    } catch (error) {
      console.error('Ошибка экспорта:', error);
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
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'excel')}
              row
            >
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="excel" control={<Radio />} label="Excel" />
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
              label="Включить системные поля (инвентарный номер, штрихкод, дата создания, создатель)"
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
              {fields.map((field) => (
                <FormControlLabel
                  key={field.id}
                  control={
                    <Checkbox
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                    />
                  }
                  label={field.display_name || field.name}
                />
              ))}
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