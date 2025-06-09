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
    case 'TEXT':
      return [
        { value: 'contains', label: 'Содержит' },
        { value: 'equals', label: 'Равно' },
        { value: 'startsWith', label: 'Начинается с' },
        { value: 'endsWith', label: 'Заканчивается на' },
        { value: 'notEquals', label: 'Не равно' },
      ];
    case 'number':
    case 'money':
    case 'NUMBER':
    case 'MONEY':
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
    case 'CHECKBOX':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'notEquals', label: 'Не равно' },
      ];
    case 'select':
    case 'SELECT':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'notEquals', label: 'Не равно' },
        { value: 'in', label: 'Один из' },
        { value: 'notIn', label: 'Не один из' },
      ];
    case 'date':
    case 'DATE':
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

// ИСПРАВЛЕННАЯ функция получения значения поля
const getFieldValue = (record: any, fieldName: string) => {
  console.log('🔍 getFieldValue - Поиск поля:', fieldName, 'в записи:', record);
  
  // Системные поля
  if (fieldName === 'barcode') {
    const value = record.barcode;
    console.log('🔍 Системное поле barcode:', value);
    return value;
  }
  
  if (fieldName === 'name') {
    const value = record.name;
    console.log('🔍 Системное поле name:', value);
    return value;
  }
  
  if (fieldName === 'createdAt') {
    const value = record.createdAt;
    console.log('🔍 Системное поле createdAt:', value);
    return value;
  }

  // ИСПРАВЛЕНИЕ: Ищем пользовательские поля в dynamicData
  if (record.dynamicData && record.dynamicData[fieldName]) {
    const value = record.dynamicData[fieldName];
    console.log('🔍 Найдено в dynamicData:', fieldName, '=', value);
    return value;
  }

  console.log('❌ Поле не найдено:', fieldName);
  return undefined;
};

// Функция применения условия фильтра
const applyFilterCondition = (fieldValue: any, filter: FilterCondition) => {
  const { operator, value, fieldType } = filter;
  
  console.log('🔍 applyFilterCondition:', {
    fieldValue,
    operator,
    value,
    fieldType
  });

  // Обработка undefined/null значений
  if (fieldValue === undefined || fieldValue === null) {
    // Если поле пустое, то только условия "equals" к пустому значению будут true
    return operator === 'equals' && (value === '' || value === null || value === undefined);
  }

  // Преобразуем значения для сравнения
  let normalizedFieldValue = fieldValue;
  let normalizedFilterValue = value;

  if (fieldType === 'number' || fieldType === 'money' || fieldType === 'NUMBER' || fieldType === 'MONEY') {
    normalizedFieldValue = parseFloat(fieldValue) || 0;
    normalizedFilterValue = parseFloat(value) || 0;
  } else if (fieldType === 'checkbox' || fieldType === 'boolean' || fieldType === 'CHECKBOX') {
    normalizedFieldValue = Boolean(fieldValue);
    normalizedFilterValue = Boolean(value);
  } else if (typeof fieldValue === 'string') {
    normalizedFieldValue = fieldValue.toLowerCase();
    normalizedFilterValue = String(value).toLowerCase();
  }

  switch (operator) {
    case 'equals': {
      const result = normalizedFieldValue === normalizedFilterValue;
      console.log('🔍 equals:', normalizedFieldValue, '===', normalizedFilterValue, '=', result);
      return result;
    }
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

// ИСПРАВЛЕННАЯ функция применения фильтров к данным
export const applyFiltersToData = (data: any[], filters: FilterCondition[]) => {
  if (!filters.length) {
    console.log('🔍 Нет фильтров, возвращаем все данные');
    return data;
  }

  console.log('🔍 Применяем фильтры:', filters);
  console.log('🔍 К данным:', data.slice(0, 2)); // показываем первые 2 записи для отладки

  const filtered = data.filter(record => {
    return filters.every(filter => {
      const fieldValue = getFieldValue(record, filter.field);
      const result = applyFilterCondition(fieldValue, filter);
      console.log('🔍 Фильтр', filter.field, ':', fieldValue, '->', result);
      return result;
    });
  });

  console.log('🔍 Результат фильтрации:', filtered.length, 'из', data.length);
  return filtered;
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
    // Находим тип поля
    let fieldType = 'text';
    
    if (fieldName === 'barcode' || fieldName === 'name') {
      fieldType = 'text';
    } else if (fieldName === 'createdAt') {
      fieldType = 'date';
    } else {
      // Ищем среди пользовательских полей
      const field = fields.find(f => {
        const fieldId = f.id?.toString();
        return fieldId === fieldName;
      });
      
      if (field) {
        const fieldData = field.attributes || field;
        fieldType = fieldData.fieldType?.toLowerCase() || 'text';
      }
    }
    
    console.log('🔍 handleFieldChange:', fieldName, 'type:', fieldType);
    
    updateFilter(id, {
      field: fieldName,
      fieldType: fieldType,
      operator: 'contains',
      value: '',
    });
  };

  const handleApply = () => {
    const validFilters = filters.filter(f => f.field && f.value !== '');
    console.log('🔍 Применяем фильтры:', validFilters);
    onApplyFilters(validFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters([createEmptyFilter()]);
    onApplyFilters([]);
  };

  const renderValueInput = (filter: FilterCondition) => {
    const field = fields.find(f => f.id?.toString() === filter.field);
    const fieldData = field?.attributes || field;
    
    if (filter.operator === 'between') {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            label="От"
            type={filter.fieldType === 'number' || filter.fieldType === 'money' || 
                  filter.fieldType === 'NUMBER' || filter.fieldType === 'MONEY' ? 'number' : 'text'}
            value={filter.value?.min || ''}
            onChange={(e) => updateFilter(filter.id, {
              value: { ...filter.value, min: e.target.value }
            })}
          />
          <Typography>-</Typography>
          <TextField
            size="small"
            label="До"
            type={filter.fieldType === 'number' || filter.fieldType === 'money' ||
                  filter.fieldType === 'NUMBER' || filter.fieldType === 'MONEY' ? 'number' : 'text'}
            value={filter.value?.max || ''}
            onChange={(e) => updateFilter(filter.id, {
              value: { ...filter.value, max: e.target.value }
            })}
          />
        </Box>
      );
    }

    if (filter.fieldType === 'select' || filter.fieldType === 'SELECT') {
      return (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Значение</InputLabel>
          <Select
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            label="Значение"
          >
            {fieldData?.options?.map((option: string) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (filter.fieldType === 'checkbox' || filter.fieldType === 'CHECKBOX') {
      return (
        <FormControl size="small" sx={{ minWidth: 150 }}>
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

    return (
      <TextField
        size="small"
        label="Значение"
        sx={{ minWidth: 150 }}
        type={filter.fieldType === 'number' || filter.fieldType === 'money' || 
              filter.fieldType === 'NUMBER' || filter.fieldType === 'MONEY' ? 'number' : 
              filter.fieldType === 'date' || filter.fieldType === 'DATE' ? 'date' : 'text'}
        value={filter.value}
        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
        InputLabelProps={filter.fieldType === 'date' || filter.fieldType === 'DATE' ? { shrink: true } : undefined}
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
                    <MenuItem value="name">Название</MenuItem>
                    <MenuItem value="createdAt">Дата создания</MenuItem>
                    <Divider />
                    {fields.map(field => {
                      const fieldData = field.attributes || field;
                      const fieldId = field.id?.toString();
                      return (
                        <MenuItem key={field.id} value={fieldId}>
                          {fieldData.name}
                        </MenuItem>
                      );
                    })}
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