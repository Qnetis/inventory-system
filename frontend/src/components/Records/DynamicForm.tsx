// src/components/Records/DynamicForm.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useImperativeHandle } from 'react';
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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';

interface DynamicFormProps {
  fields: any[];
  onSubmit: (data: any) => void;
  defaultValues?: any;
  showNameField?: boolean;
  submitButtonText?: string;
  showSubmitButton?: boolean; // НОВОЕ: позволяет скрыть кнопку отправки
}

// ИСПРАВЛЕНИЕ: Добавляем типы для ref
export interface DynamicFormRef {
  triggerSubmit: () => void;
}

const DynamicForm = React.forwardRef<DynamicFormRef, DynamicFormProps>(({
  fields,
  onSubmit,
  defaultValues,
  submitButtonText = 'Сохранить',
  showSubmitButton = true, // По умолчанию показываем
}, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      ...defaultValues,
    },
  });

  console.log('DynamicForm fields:', fields);

  const onFormSubmit = (data: any) => {
    console.log('Form data before submit:', data);
    
    const dynamicData: any = {};
    const result: any = {};
    

    // Формируем динамические данные
    fields.forEach((field) => {
      const value = data[field.id];
      if (value !== undefined && value !== '') {
        dynamicData[field.id] = value;
      }
    });

    result.dynamicData = dynamicData;

    console.log('Data to submit:', result);
    onSubmit(result);
  };

  // ИСПРАВЛЕНИЕ: Добавляем возможность программно запускать отправку
  useImperativeHandle(ref, () => ({
    triggerSubmit: () => {
      handleSubmit(onFormSubmit)();
    }
  }));

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
                size={isMobile ? "small" : "medium"}
                label={fieldData.name}
                value={value || ''}
                onChange={onChange}
                error={!!errors[fieldName]}
                helperText={errors[fieldName] && 'Это поле обязательно'}
                required={fieldData.isRequired}
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
                size={isMobile ? "small" : "medium"}
                type="number"
                label={fieldData.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                error={!!errors[fieldName]}
                helperText={errors[fieldName] && 'Это поле обязательно'}
                required={fieldData.isRequired}
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
                size={isMobile ? "small" : "medium"}
                type="number"
                label={fieldData.name}
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                error={!!errors[fieldName]}
                helperText={errors[fieldName] && 'Это поле обязательно'}
                required={fieldData.isRequired}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                }}
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
              <FormControl 
                fullWidth 
                size={isMobile ? "small" : "medium"}
                error={!!errors[fieldName]}
                required={fieldData.isRequired}
              >
                <InputLabel>{fieldData.name}</InputLabel>
                <Select
                  value={value || ''}
                  onChange={onChange}
                  label={fieldData.name}
                >
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
                    size={isMobile ? "small" : "medium"}
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

  if (!fields || fields.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary" variant={isMobile ? "body2" : "body1"}>
          Нет полей для отображения. Обратитесь к администратору для настройки полей.
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit(onFormSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >


      {fields
        .sort((a, b) => {
          const aOrder = (a.attributes?.order || a.order) || 0;
          const bOrder = (b.attributes?.order || b.order) || 0;
          return aOrder - bOrder;
        })
        .map((field) => (
          <Box key={field.id}>
            {renderField(field)}
          </Box>
        ))}

      {/* ИЗМЕНЕНИЕ: Кнопка отправки теперь опциональна */}
      {showSubmitButton && (
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size={isMobile ? "large" : "large"}
          sx={{ mt: 1, py: isMobile ? 1.5 : 1 }}
        >
          {submitButtonText}
        </Button>
      )}
    </Box>
  );
});

// ИСПРАВЛЕНИЕ: Добавляем displayName для отладки
DynamicForm.displayName = 'DynamicForm';

export default DynamicForm;