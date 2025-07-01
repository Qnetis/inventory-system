/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  FormHelperText,
  CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  Slide,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';
import { useForm, Controller } from 'react-hook-form';

interface CreateRecordDialogProps {
  open: boolean;
  onClose: () => void;
  fields: any[];
  onSubmit: (data: any) => void;
}

// Transition для мобильных устройств
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CreateRecordDialog: React.FC<CreateRecordDialogProps> = ({
  open,
  onClose,
  fields,
  onSubmit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const handleFormSubmit = (data: any) => {
    // Преобразуем данные формы в формат для API
    const dynamicData: any = {};
    
    Object.keys(data).forEach(key => {
      if (key.startsWith('field_')) {
        const fieldId = key.replace('field_', '');
        dynamicData[fieldId] = data[key];
      }
    });

    onSubmit({ dynamicData });
    reset();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={isMobile ? Transition : undefined}
      PaperProps={{
        sx: {
          ...(isMobile && {
            m: 0,
            maxHeight: '100%',
            borderRadius: 0,
          }),
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        ...(isMobile && { 
          borderBottom: 1, 
          borderColor: 'divider',
          py: 1.5,
        }),
      }}>
        <Typography variant={isMobile ? "h6" : "h5"}>
          Добавить запись
        </Typography>
        {isMobile && (
          <IconButton edge="end" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent sx={{ 
          pt: isMobile ? 2 : 3,
          pb: isMobile ? 2 : 3,
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 2.5 }}>
            {fields.map((field) => {
              const fieldData = field.attributes || field;
              const fieldName = `field_${field.id}`;
              
              switch (fieldData.fieldType) {
                case 'TEXT':
                  return (
                    <Controller
                      key={field.id}
                      name={fieldName}
                      control={control}
                      defaultValue=""
                      rules={{ required: fieldData.isRequired ? 'Это поле обязательно' : false }}
                      render={({ field: formField }) => (
                        <TextField
                          {...formField}
                          fullWidth
                          label={fieldData.name}
                          required={fieldData.isRequired}
                          error={!!errors[fieldName]}
                          helperText={errors[fieldName]?.message as string}
                          size={isMobile ? "small" : "medium"}
                          autoComplete="off"
                        />
                      )}
                    />
                  );
                  
                case 'NUMBER':
                  return (
                    <Controller
                      key={field.id}
                      name={fieldName}
                      control={control}
                      defaultValue=""
                      rules={{ 
                        required: fieldData.isRequired ? 'Это поле обязательно' : false,
                        pattern: {
                          value: /^\d+(\.\d+)?$/,
                          message: 'Введите корректное число'
                        }
                      }}
                      render={({ field: formField }) => (
                        <TextField
                          {...formField}
                          fullWidth
                          label={fieldData.name}
                          type="number"
                          required={fieldData.isRequired}
                          error={!!errors[fieldName]}
                          helperText={errors[fieldName]?.message as string}
                          size={isMobile ? "small" : "medium"}
                          autoComplete="off"
                        />
                      )}
                    />
                  );
                  
                case 'MONEY':
                  return (
                    <Controller
                      key={field.id}
                      name={fieldName}
                      control={control}
                      defaultValue=""
                      rules={{ 
                        required: fieldData.isRequired ? 'Это поле обязательно' : false,
                        pattern: {
                          value: /^\d+(\.\d{0,2})?$/,
                          message: 'Введите корректную сумму'
                        }
                      }}
                      render={({ field: formField }) => (
                        <TextField
                          {...formField}
                          fullWidth
                          label={`${fieldData.name} (₽)`}
                          type="number"
                          required={fieldData.isRequired}
                          error={!!errors[fieldName]}
                          helperText={errors[fieldName]?.message as string}
                          InputProps={{
                            inputProps: { 
                              step: 0.01,
                              min: 0 
                            }
                          }}
                          size={isMobile ? "small" : "medium"}
                          autoComplete="off"
                        />
                      )}
                    />
                  );
                  
                case 'SELECT':
                  return (
                    <Controller
                      key={field.id}
                      name={fieldName}
                      control={control}
                      defaultValue=""
                      rules={{ required: fieldData.isRequired ? 'Это поле обязательно' : false }}
                      render={({ field: formField }) => (
                        <FormControl 
                          fullWidth 
                          error={!!errors[fieldName]}
                          size={isMobile ? "small" : "medium"}
                        >
                          <InputLabel required={fieldData.isRequired}>
                            {fieldData.name}
                          </InputLabel>
                          <Select
                            {...formField}
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
                            <FormHelperText>
                              {errors[fieldName]?.message as string}
                            </FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  );
                  
                case 'CHECKBOX':
                  return (
                    <Controller
                      key={field.id}
                      name={fieldName}
                      control={control}
                      defaultValue={false}
                      render={({ field: formField }) => (
                        <FormControlLabel
                          control={
                            <Checkbox 
                              {...formField}
                              checked={formField.value}
                              size={isMobile ? "small" : "medium"}
                            />
                          }
                          label={
                            <Typography variant={isMobile ? "body2" : "body1"}>
                              {fieldData.name}
                              {fieldData.isRequired && (
                                <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                                  *
                                </Typography>
                              )}
                            </Typography>
                          }
                        />
                      )}
                    />
                  );
                  
                default:
                  return null;
              }
            })}
            
            {fields.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Нет доступных полей для заполнения.
                <br />
                Администратор должен создать поля в панели управления.
              </Typography>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          px: isMobile ? 2 : 3, 
          pb: isMobile ? 2 : 2,
          ...(isMobile && {
            borderTop: 1,
            borderColor: 'divider',
          }),
        }}>
          <Button 
            onClick={handleClose} 
            disabled={isSubmitting}
            size={isMobile ? "medium" : "large"}
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting || fields.length === 0}
            size={isMobile ? "medium" : "large"}
            sx={{ minWidth: isMobile ? 100 : 120 }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Создание...
              </>
            ) : (
              'Создать'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateRecordDialog;