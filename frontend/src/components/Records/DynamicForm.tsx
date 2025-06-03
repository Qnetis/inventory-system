// src/components/Records/DynamicForm.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  FormHelperText,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';

interface DynamicFormProps {
  fields: any[];
  onSubmit: (data: any) => void;
  defaultValues?: any;
  showNameField?: boolean;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  onSubmit,
  defaultValues,
  showNameField = false,
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: defaultValues?.name || '',
      ...defaultValues,
    },
  });

  console.log('DynamicForm fields:', fields); // Для отладки

  const renderField = (field: any) => {
    const fieldData = field.attributes || field;
    const fieldName = field.id.toString();

    switch (fieldData.fieldType) {
      case 'TEXT':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: fieldData.isRequired }}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                label={fieldData.name}
                value={value || ''}
                onChange={onChange}
                error={!!errors[fieldName]}
                helperText={errors[fieldName] && 'Это поле обязательно'}
              />
            )}
          />
        );

      case 'NUMBER':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: fieldData.isRequired }}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                type="number"
                label={fieldData.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                error={!!errors[fieldName]}
                helperText={errors[fieldName] && 'Это поле обязательно'}
              />
            )}
          />
        );

      case 'MONEY':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: fieldData.isRequired }}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                type="number"
                label={fieldData.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                }}
                error={!!errors[fieldName]}
                helperText={errors[fieldName] && 'Это поле обязательно'}
              />
            )}
          />
        );

      case 'SELECT':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: fieldData.isRequired }}
            render={({ field: { onChange, value } }) => (
              <FormControl fullWidth error={!!errors[fieldName]}>
                <InputLabel>{fieldData.name}</InputLabel>
                <Select
                  value={value || ''}
                  onChange={onChange}
                  label={fieldData.name}
                >
                  <MenuItem value="">
                    <em>Не выбрано</em>
                  </MenuItem>
                  {fieldData.options?.map((option: string) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
                {errors[fieldName] && (
                  <FormHelperText>Это поле обязательно</FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case 'CHECKBOX':
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field: { onChange, value } }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                  />
                }
                label={fieldData.name}
              />
            )}
          />
        );

      default:
        return null;
    }
  };

  const onFormSubmit = (data: any) => {
    console.log('Form data before submit:', data); // Для отладки
    
    const dynamicData: any = {};
    const result: any = {};
    
    // Добавляем имя записи если есть
    if (showNameField && data.name) {
      result.name = data.name;
    }
    
    // Формируем динамические данные
    fields.forEach((field) => {
      const value = data[field.id];
      if (value !== undefined && value !== '') {
        dynamicData[field.id] = value;
      }
    });

    result.dynamicData = dynamicData;

    console.log('Data to submit:', result); // Для отладки
    onSubmit(result);
  };

  if (!fields || fields.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Нет полей для отображения. Обратитесь к администратору для настройки полей.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
      {showNameField && (
        <Box sx={{ mb: 2 }}>
          <Controller
            name="name"
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                label="Название записи (необязательно)"
                value={value || ''}
                onChange={onChange}
                helperText="Если не указано, будет сгенерировано автоматически"
              />
            )}
          />
        </Box>
      )}

      {fields
        .sort((a, b) => {
          const aOrder = (a.attributes?.order || a.order) || 0;
          const bOrder = (b.attributes?.order || b.order) || 0;
          return aOrder - bOrder;
        })
        .map((field) => (
          <Box key={field.id} sx={{ mt: 2 }}>
            {renderField(field)}
          </Box>
        ))}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        sx={{ mt: 3 }}
      >
        Сохранить
      </Button>
    </Box>
  );
};

export default DynamicForm;