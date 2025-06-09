// frontend/src/components/Records/AdvancedFilters.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  fieldType?: string;
}

interface AdvancedFiltersProps {
  open: boolean;
  onClose: () => void;
  fields: any[];
  onApplyFilters: (filters: FilterCondition[]) => void;
  initialFilters?: FilterCondition[];
}

// Операторы для разных типов полей
const getOperatorsForFieldType = (fieldType: string) => {
  switch (fieldType) {
    case 'text':
    case 'string':
      return [
        { value: 'contains', label: 'Содержит' },
        { value: 'equals', label: 'Равно' },
        { value: 'startsWith', label: 'Начинается с' },
        { value: 'endsWith', label: 'Заканчивается на' },
        { value: 'notEquals', label: 'Не равно' },
      ];
    case 'number':
    case 'money':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'notEquals', label: 'Не равно' },
        { value: 'greater', label: 'Больше' },
        { value: 'less', label: 'Меньше' },
        { value: 'greaterOrEqual', label: 'Больше или равно' },
        { value: 'lessOrEqual', label: 'Меньше или равно' },
        { value: 'between', label: 'Между' },
      ];
    case 'checkbox':
    case 'boolean':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'notEquals', label: 'Не равно' },
      ];
    case 'select':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'notEquals', label: 'Не равно' },
        { value: 'in', label: 'Один из' },
        { value: 'notIn', label: 'Не один из' },
      ];
    case 'date':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'notEquals', label: 'Не равно' },
        { value: 'after', label: 'После' },
        { value: 'before', label: 'До' },
        { value: 'between', label: 'Между' },
      ];
    default:
      return [
        { value: 'contains', label: 'Содержит' },
        { value: 'equals', label: 'Равно' },
      ];
  }
};

// Функция применения фильтров к данным
export const applyFiltersToData = (data: any[], filters: FilterCondition[]) => {
  if (!filters.length) return data;

  return data.filter(record => {
    return filters.every(filter => {
      const fieldValue = getFieldValue(record, filter.field);
      return applyFilterCondition(fieldValue, filter);
    });
  });
};

const getFieldValue = (record: any, fieldName: string) => {
  // Системные поля
  if (fieldName === 'inventory_number') {
    return record.attributes?.inventory_number || record.inventory_number;
  }
  if (fieldName === 'barcode') {
    return record.attributes?.barcode || record.barcode;
  }
  if (fieldName === 'createdAt') {
    return record.attributes?.createdAt || record.createdAt;
  }

  // Пользовательские поля
  const customField = record.attributes?.fields?.find(
    (f: any) => f.field_name === fieldName
  ) || record.fields?.find(
    (f: any) => f.field_name === fieldName
  );

  return customField?.value;
};

const applyFilterCondition = (fieldValue: any, filter: FilterCondition) => {
  const { operator, value, fieldType } = filter;

  // Преобразуем значения для сравнения
  let normalizedFieldValue = fieldValue;
  let normalizedFilterValue = value;

  if (fieldType === 'number' || fieldType === 'money') {
    normalizedFieldValue = parseFloat(fieldValue) || 0;
    normalizedFilterValue = parseFloat(value) || 0;
  } else if (fieldType === 'checkbox' || fieldType === 'boolean') {
    normalizedFieldValue = Boolean(fieldValue);
    normalizedFilterValue = Boolean(value);
  } else if (typeof fieldValue === 'string') {
    normalizedFieldValue = fieldValue.toLowerCase();
    normalizedFilterValue = String(value).toLowerCase();
  }

  switch (operator) {
    case 'equals':
      return normalizedFieldValue === normalizedFilterValue;
    case 'notEquals':
      return normalizedFieldValue !== normalizedFilterValue;
    case 'contains':
      return String(normalizedFieldValue).includes(String(normalizedFilterValue));
    case 'startsWith':
      return String(normalizedFieldValue).startsWith(String(normalizedFilterValue));
    case 'endsWith':
      return String(normalizedFieldValue).endsWith(String(normalizedFilterValue));
    case 'greater':
      return normalizedFieldValue > normalizedFilterValue;
    case 'less':
      return normalizedFieldValue < normalizedFilterValue;
    case 'greaterOrEqual':
      return normalizedFieldValue >= normalizedFilterValue;
    case 'lessOrEqual':
      return normalizedFieldValue <= normalizedFilterValue;
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [value.min, value.max];
      return normalizedFieldValue >= parseFloat(min) && normalizedFieldValue <= parseFloat(max);
    }
    case 'in': {
      const inValues = Array.isArray(value) ? value : [value];
      return inValues.includes(normalizedFieldValue);
    }
    case 'notIn': {
      const notInValues = Array.isArray(value) ? value : [value];
      return !notInValues.includes(normalizedFieldValue);
    }
    case 'after':
      return new Date(fieldValue) > new Date(value);
    case 'before':
      return new Date(fieldValue) < new Date(value);
    default:
      return true;
  }
};

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  open,
  onClose,
  fields,
  onApplyFilters,
  initialFilters = [],
}) => {
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  useEffect(() => {
    if (open) {
      setFilters(initialFilters.length > 0 ? [...initialFilters] : [createEmptyFilter()]);
    }
  }, [open, initialFilters]);

  const createEmptyFilter = (): FilterCondition => ({
    id: Math.random().toString(36).substr(2, 9),
    field: '',
    operator: 'contains',
    value: '',
    fieldType: 'text',
  });

  const addFilter = () => {
    setFilters([...filters, createEmptyFilter()]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const handleFieldChange = (id: string, fieldName: string) => {
    const field = fields.find(f => f.name === fieldName);
    updateFilter(id, {
      field: fieldName,
      fieldType: field?.field_type || 'text',
      operator: 'contains',
      value: '',
    });
  };

  const handleApply = () => {
    const validFilters = filters.filter(f => f.field && f.value !== '');
    onApplyFilters(validFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters([createEmptyFilter()]);
    onApplyFilters([]);
  };

  const renderValueInput = (filter: FilterCondition) => {
    const field = fields.find(f => f.name === filter.field);
    
    if (filter.operator === 'between') {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            label="От"
            type={filter.fieldType === 'number' || filter.fieldType === 'money' ? 'number' : 'text'}
            value={filter.value?.min || ''}
            onChange={(e) => updateFilter(filter.id, {
              value: { ...filter.value, min: e.target.value }
            })}
          />
          <Typography>-</Typography>
          <TextField
            size="small"
            label="До"
            type={filter.fieldType === 'number' || filter.fieldType === 'money' ? 'number' : 'text'}
            value={filter.value?.max || ''}
            onChange={(e) => updateFilter(filter.id, {
              value: { ...filter.value, max: e.target.value }
            })}
          />
        </Box>
      );
    }

    if (filter.fieldType === 'checkbox' || filter.fieldType === 'boolean') {
      return (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Значение</InputLabel>
          <Select
            value={filter.value === true ? 'true' : filter.value === false ? 'false' : ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value === 'true' })}
            label="Значение"
          >
            <MenuItem value="true">Да</MenuItem>
            <MenuItem value="false">Нет</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (filter.fieldType === 'select' && field?.options) {
      return (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Значение</InputLabel>
          <Select
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            label="Значение"
            multiple={filter.operator === 'in' || filter.operator === 'notIn'}
          >
            {field.options.map((option: any) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        size="small"
        label="Значение"
        type={filter.fieldType === 'number' || filter.fieldType === 'money' ? 'number' : 
              filter.fieldType === 'date' ? 'date' : 'text'}
        value={filter.value}
        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
        InputLabelProps={filter.fieldType === 'date' ? { shrink: true } : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Расширенные фильтры
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {filters.map((filter, index) => (
            <Box key={filter.id} sx={{ mb: 2 }}>
              {index > 0 && (
                <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  И
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Поле */}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Поле</InputLabel>
                  <Select
                    value={filter.field}
                    onChange={(e) => handleFieldChange(filter.id, e.target.value)}
                    label="Поле"
                  >
                    <MenuItem value="barcode">Штрихкод</MenuItem>
                    <MenuItem value="createdAt">Дата создания</MenuItem>
                    <Divider />
                    {fields.map(field => (
                      <MenuItem key={field.id} value={field.name}>
                        {field.display_name || field.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Оператор */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Условие</InputLabel>
                  <Select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                    label="Условие"
                    disabled={!filter.field}
                  >
                    {getOperatorsForFieldType(filter.fieldType || 'text').map(op => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Значение */}
                {renderValueInput(filter)}

                {/* Кнопка удаления */}
                <IconButton
                  size="small"
                  onClick={() => removeFilter(filter.id)}
                  disabled={filters.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={addFilter}
            variant="outlined"
            size="small"
          >
            Добавить условие
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClear}>
          Очистить все
        </Button>
        <Button onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={handleApply} variant="contained">
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};