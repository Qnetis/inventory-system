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
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';

interface DynamicFormProps {
  fields: any[];
  onSubmit: (data: any) => void;
  defaultValues?: any;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  onSubmit,
  defaultValues,
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: defaultValues || {},
  });

  console.log('DynamicForm fields:', fields); // Для отладки

  const renderField = (field: any) => {
    const fieldName = field.id.toString();

    switch (field.fieldType) {
      case 'TEXT':
        return (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: field.isRequired }}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                label={field.name}
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
            rules={{ required: field.isRequired }}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                type="number"
                label={field.name}
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
            rules={{ required: field.isRequired }}
            render={({ field: { onChange, value } }) => (
              <TextField
                fullWidth
                type="number"
                label={field.name}
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
            rules={{ required: field.isRequired }}
            render={({ field: { onChange, value } }) => (
              <FormControl fullWidth error={!!errors[fieldName]}>
                <InputLabel>{field.name}</InputLabel>
                <Select
                  value={value || ''}
                  onChange={onChange}
                  label={field.name}
                >
                  <MenuItem value="">
                    <em>Не выбрано</em>
                  </MenuItem>
                  {field.options?.map((option: string) => (
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
                label={field.name}
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
    fields.forEach((field) => {
      const value = data[field.id];
      if (value !== undefined && value !== '') {
        dynamicData[field.id] = value;
      }
    });

    console.log('Dynamic data to submit:', dynamicData); // Для отладки
    onSubmit({ dynamicData });
  };

  if (!fields || fields.length === 0) {
    return <div>Нет полей для отображения</div>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
      {fields
        .sort((a, b) => (a.order || 0) - (b.order || 0))
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