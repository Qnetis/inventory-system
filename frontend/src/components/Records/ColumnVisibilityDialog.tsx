/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Slide,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';

interface ColumnVisibilityDialogProps {
  open: boolean;
  onClose: () => void;
  customFields: any[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
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

const ColumnVisibilityDialog: React.FC<ColumnVisibilityDialogProps> = ({
  open,
  onClose,
  customFields,
  visibleColumns,
  onColumnsChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [localSelection, setLocalSelection] = useState<string[]>(visibleColumns);
  
  // Системные столбцы - всегда видны
  const systemColumns = [
    { id: 'barcode', name: 'Штрихкод', fixed: true },
    { id: 'owner', name: 'Владелец', fixed: true },
    { id: 'createdAt', name: 'Дата создания', fixed: true },
  ];

  useEffect(() => {
    setLocalSelection(visibleColumns);
  }, [visibleColumns, open]);

  // Безопасное извлечение полей
  const safeCustomFields = Array.isArray(customFields) ? customFields : [];

  const handleToggleField = (fieldId: string) => {
    setLocalSelection(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    const allFieldIds = safeCustomFields.map(field => field.id).filter(Boolean);
    setLocalSelection(allFieldIds);
  };

  const handleSelectNone = () => {
    setLocalSelection([]);
  };

  const handleApply = () => {
    onColumnsChange(localSelection);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelection(visibleColumns);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon />
          <Box>
            <Typography variant={isMobile ? "h6" : "h5"}>
              Настройка столбцов
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Выбрано: {localSelection.length} из {safeCustomFields.length}
            </Typography>
          </Box>
        </Box>
        <IconButton edge="end" onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: 0,
        ...(isMobile && { flex: 1, overflow: 'auto' }),
      }}>
        {/* Кнопки быстрого выбора */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            disabled={localSelection.length === safeCustomFields.length}
          >
            Все
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleSelectNone}
            disabled={localSelection.length === 0}
          >
            Очистить
          </Button>
        </Box>

        {/* Статистика */}
        <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            Видимых столбцов: <strong>{localSelection.length + systemColumns.length}</strong> из{' '}
            <strong>{safeCustomFields.length + systemColumns.length}</strong>
          </Typography>
        </Box>

        {/* Список для мобильных устройств */}
        {isMobile ? (
          <List sx={{ pt: 0 }}>
            {/* Системные поля */}
            <ListItem sx={{ py: 0.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                Системные поля (всегда видимы)
              </Typography>
            </ListItem>
            {systemColumns.map((column) => (
              <ListItem key={column.id} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <VisibilityIcon color="action" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={column.name}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
                <Chip
                  label="Системное"
                  size="small"
                  variant="outlined"
                />
              </ListItem>
            ))}
            
            <Divider sx={{ my: 1 }} />
            
            {/* Пользовательские поля */}
            <ListItem sx={{ py: 0.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                Пользовательские поля
              </Typography>
            </ListItem>
            {safeCustomFields.length === 0 ? (
              <ListItem>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', width: '100%' }}>
                  Пользовательские поля не созданы
                </Typography>
              </ListItem>
            ) : (
              safeCustomFields.map((field) => {
                if (!field || !field.id) {
                  console.warn('Invalid field in ColumnVisibilityDialog:', field);
                  return null;
                }

                const fieldData = field.attributes || field;
                const isSelected = localSelection.includes(field.id);
                
                return (
                  <ListItem
                    key={field.id}
                    disablePadding
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={isSelected}
                        onChange={() => handleToggleField(field.id)}
                        size="small"
                      />
                    }
                  >
                    <ListItemButton onClick={() => handleToggleField(field.id)} sx={{ py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {isSelected ? (
                          <VisibilityIcon color="primary" fontSize="small" />
                        ) : (
                          <VisibilityOffIcon color="action" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={fieldData.name || 'Без названия'}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Chip 
                              size="small" 
                              label={fieldData.fieldType || 'TEXT'} 
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: '18px' }}
                            />
                            {fieldData.isRequired && (
                              <Chip 
                                size="small" 
                                label="Обяз." 
                                color="error"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: '18px' }}
                              />
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{ 
                          variant: 'body2',
                          fontWeight: isSelected ? 'medium' : 'normal',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              }).filter(Boolean)
            )}
          </List>
        ) : (
          // Десктопная версия - чекбоксы
          <Box sx={{ p: 3 }}>
            {/* Системные поля */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Системные столбцы
                <Chip size="small" label="Всегда видны" color="primary" variant="outlined" />
              </Typography>
              <FormGroup>
                {systemColumns.map((column) => (
                  <FormControlLabel
                    key={column.id}
                    control={
                      <Checkbox 
                        checked={true} 
                        disabled={true}
                        color="primary"
                      />
                    }
                    label={column.name}
                    sx={{ color: 'text.secondary' }}
                  />
                ))}
              </FormGroup>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Пользовательские поля */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Пользовательские поля ({safeCustomFields.length})
              </Typography>
              <FormGroup>
                {safeCustomFields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Пользовательские поля не созданы
                  </Typography>
                ) : (
                  safeCustomFields.map((field) => {
                    if (!field || !field.id) {
                      console.warn('Invalid field in ColumnVisibilityDialog:', field);
                      return null;
                    }

                    const fieldData = field.attributes || field;
                    const isChecked = localSelection.includes(field.id);
                    
                    return (
                      <FormControlLabel
                        key={field.id}
                        control={
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleField(field.id)}
                            color="primary"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {fieldData.name || 'Без названия'}
                            <Chip 
                              size="small" 
                              label={fieldData.fieldType || 'TEXT'} 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                            {fieldData.isRequired && (
                              <Chip 
                                size="small" 
                                label="Обязательное" 
                                color="error"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            )}
                          </Box>
                        }
                      />
                    );
                  }).filter(Boolean)
                )}
              </FormGroup>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ 
        px: isMobile ? 2 : 3,
        py: isMobile ? 2 : 2,
        ...(isMobile && {
          borderTop: 1,
          borderColor: 'divider',
        }),
      }}>
        <Button onClick={handleCancel} size={isMobile ? "medium" : "large"} color="inherit">
          Отмена
        </Button>
        <Button 
          onClick={handleApply} 
          variant="contained"
          size={isMobile ? "medium" : "large"}
          sx={{ minWidth: isMobile ? 100 : 120 }}
          startIcon={<VisibilityIcon />}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnVisibilityDialog;