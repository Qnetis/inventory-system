/* eslint-disable @typescript-eslint/no-explicit-any */

// frontend/src/components/Records/AdvancedFilters.tsx
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
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

export interface FilterCondition {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  operator: string;
  value: any;
}

interface AdvancedFiltersProps {
  open: boolean;
  onClose: () => void;
  fields: any[];
  onApplyFilters: (filters: FilterCondition[]) => void;
  initialFilters?: FilterCondition[];
}

const getOperatorsForFieldType = (fieldType: string) => {
  switch (fieldType) {
    case 'text':
    case 'string':
      return [
        { value: 'contains', label: 'Содержит' },
        { value: 'equals', label: 'Равно' },
        { value: 'starts_with', label: 'Начинается с' },
        { value: 'ends_with', label: 'Заканчивается на' },
        { value: 'not_equals', label: 'Не равно' },
      ];
    case 'number':
    case 'money':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'greater_than', label: 'Больше чем' },
        { value: 'less_than', label: 'Меньше чем' },
        { value: 'greater_equal', label: 'Больше или равно' },
        { value: 'less_equal', label: 'Меньше или равно' },
        { value: 'between', label: 'Между' },
      ];
    case 'select':
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'not_equals', label: 'Не равно' },
        { value: 'in', label: 'Один из' },
      ];
    case 'checkbox':
      return [
        { value: 'equals', label: 'Равно' },
      ];
    default:
      return [
        { value: 'equals', label: 'Равно' },
        { value: 'not_equals', label: 'Не равно' },
      ];
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
    fieldId: '',
    fieldName: '',
    fieldType: '',
    operator: '',
    value: '',
  });

  const addFilter = () => {
    setFilters([...filters, createEmptyFilter()]);
  };

  const removeFilter = (index: number) => {
    if (filters.length > 1) {
      setFilters(filters.filter((_, i) => i !== index));
    }
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    
    // Если изменилось поле, сбрасываем оператор и значение
    if (updates.fieldId) {
      const field = fields.find(f => f.id === updates.fieldId);
      if (field) {
        newFilters[index].fieldName = field.name;
        newFilters[index].fieldType = field.field_type;
        newFilters[index].operator = '';
        newFilters[index].value = '';
      }
    }
    
    setFilters(newFilters);
  };

  const handleApply = () => {
    const validFilters = filters.filter(f => f.fieldId && f.operator && f.value !== '');
    onApplyFilters(validFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters([createEmptyFilter()]);
  };

  const renderValueInput = (filter: FilterCondition, index: number) => {
    const field = fields.find(f => f.id === filter.fieldId);
    
    if (!field || !filter.operator) return null;

    switch (field.field_type) {
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={filter.value === true}
                onChange={(e) => updateFilter(index, { value: e.target.checked })}
              />
            }
            label="Включено"
          />
        );

      case 'select':
        if (filter.operator === 'in') {
          // Множественный выбор
          return (
            <FormControl fullWidth size="small">
              <InputLabel>Значения</InputLabel>
              <Select
                multiple
                value={Array.isArray(filter.value) ? filter.value : []}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
                label="Значения"
              >
                {field.options?.map((option: string) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        } else {
          // Одиночный выбор
          return (
            <FormControl fullWidth size="small">
              <InputLabel>Значение</InputLabel>
              <Select
                value={filter.value || ''}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
                label="Значение"
              >
                {field.options?.map((option: string) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

      case 'number':
      case 'money':
        if (filter.operator === 'between') {
          const values = Array.isArray(filter.value) ? filter.value : ['', ''];
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                placeholder="От"
                value={values[0] || ''}
                onChange={(e) => updateFilter(index, { value: [e.target.value, values[1]] })}
              />
              <Typography>—</Typography>
              <TextField
                size="small"
                type="number"
                placeholder="До"
                value={values[1] || ''}
                onChange={(e) => updateFilter(index, { value: [values[0], e.target.value] })}
              />
            </Box>
          );
        } else {
          return (
            <TextField
              fullWidth
              size="small"
              type="number"
              placeholder="Значение"
              value={filter.value || ''}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
            />
          );
        }

      default:
        return (
          <TextField
            fullWidth
            size="small"
            placeholder="Значение"
            value={filter.value || ''}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
          />
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        Расширенные фильтры
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {filters.map((filter, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              {index > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Divider sx={{ flex: 1 }} />
                  <Typography variant="body2" sx={{ mx: 2, color: 'text.secondary' }}>
                    И
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                {/* Выбор поля */}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Поле</InputLabel>
                  <Select
                    value={filter.fieldId || ''}
                    onChange={(e) => updateFilter(index, { fieldId: e.target.value })}
                    label="Поле"
                  >
                    {fields.map((field) => (
                      <MenuItem key={field.id} value={field.id}>
                        {field.display_name || field.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Выбор оператора */}
                {filter.fieldId && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Условие</InputLabel>
                    <Select
                      value={filter.operator || ''}
                      onChange={(e) => updateFilter(index, { operator: e.target.value })}
                      label="Условие"
                    >
                      {getOperatorsForFieldType(filter.fieldType).map((op) => (
                        <MenuItem key={op.value} value={op.value}>
                          {op.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Ввод значения */}
                <Box sx={{ flex: 1 }}>
                  {renderValueInput(filter, index)}
                </Box>

                {/* Кнопка удаления */}
                <IconButton
                  size="small"
                  onClick={() => removeFilter(index)}
                  disabled={filters.length === 1}
                  color="error"
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
        <Button onClick={handleClear} color="secondary">
          Очистить
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

// Функция для применения фильтров к данным
export const applyFiltersToData = (
  data: any[],
  filters: FilterCondition[],
  fields: any[]
): any[] => {
  if (!filters.length) return data;

  return data.filter((record) => {
    return filters.every((filter) => {
      const field = fields.find(f => f.id === filter.fieldId);
      if (!field) return true;

      const recordField = record.attributes.fields?.find(
        (f: any) => f.field_name === field.name
      );
      
      if (!recordField) return false;

      const fieldValue = recordField.value;
      const filterValue = filter.value;

      switch (filter.operator) {
        case 'equals':
          return fieldValue === filterValue;
        
        case 'not_equals':
          return fieldValue !== filterValue;
        
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
        
        case 'starts_with':
          return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
        
        case 'ends_with':
          return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
        
        case 'greater_than':
          return Number(fieldValue) > Number(filterValue);
        
        case 'less_than':
          return Number(fieldValue) < Number(filterValue);
        
        case 'greater_equal':
          return Number(fieldValue) >= Number(filterValue);
        
        case 'less_equal':
          return Number(fieldValue) <= Number(filterValue);
        
        case 'between':
          if (Array.isArray(filterValue) && filterValue.length === 2) {
            const [min, max] = filterValue.map(Number);
            const numValue = Number(fieldValue);
            return numValue >= min && numValue <= max;
          }
          return false;
        
        case 'in':
          if (Array.isArray(filterValue)) {
            return filterValue.includes(fieldValue);
          }
          return false;
        
        default:
          return true;
      }
    });
  });
};