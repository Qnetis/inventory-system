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
import { ru } from 'date-fns/locale';

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
      default:
        return value;
    }
  };

  const prepareExportData = () => {
    const headers: string[] = [];
    const fieldMap: { [key: string]: any } = {};

    // Системные поля
    if (includeSystemFields) {
      headers.push('Штрихкод', 'Название', 'Дата создания', 'Создатель');
    }

    // Пользовательские поля
    fields.forEach(field => {
      if (selectedFields.includes(field.id)) {
        const fieldData = field.attributes || field;
        headers.push(fieldData.name);
        fieldMap[field.id] = fieldData;
      }
    });

    // Подготовка данных
    const exportData = records.map(record => {
      const row: any = {};

      if (includeSystemFields) {
        row['Штрихкод'] = record.barcode || '';
        row['Название'] = record.name || '';
        row['Дата создания'] = record.createdAt ? 
          formatDate(new Date(record.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '';
        row['Создатель'] = record.owner?.username || record.owner?.email || '';
      }

      // Пользовательские поля
      fields.forEach(field => {
        if (selectedFields.includes(field.id)) {
          const fieldData = fieldMap[field.id];
          const value = record.dynamicData?.[field.id];
          row[fieldData.name] = formatFieldValue(value, fieldData.fieldType);
        }
      });

      return row;
    });

    return { headers, data: exportData };
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const { data } = prepareExportData();

      if (exportFormat === 'csv') {
        // CSV экспорт
        const csvContent = [
          // Заголовки
          Object.keys(data[0] || {}).join(','),
          // Данные
          ...data.map(row => 
            Object.values(row).map(value => 
              typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value
            ).join(',')
          )
        ].join('\n');

        // Создаем и скачиваем файл без внешних библиотек
        const blob = new Blob(['\ufeff' + csvContent], { 
          type: 'text/csv;charset=utf-8' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `records_export_${formatDate(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Excel экспорт - упрощенная версия без XLSX
        alert('Экспорт в Excel временно недоступен. Используйте CSV формат.');
      }

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте данных');
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
                label="Excel (временно недоступен)" 
                disabled
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
              label="Включить системные поля (штрихкод, название, дата создания, создатель)"
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