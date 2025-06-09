/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  IconButton,
  Divider,
  FormGroup,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface ColumnVisibilityDialogProps {
  open: boolean;
  onClose: () => void;
  customFields: any[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const ColumnVisibilityDialog: React.FC<ColumnVisibilityDialogProps> = ({
  open,
  onClose,
  customFields,
  visibleColumns,
  onColumnsChange,
}) => {
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

  const handleToggleField = (fieldId: string) => {
    setLocalSelection(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    const allFieldIds = customFields.map(field => field.id);
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
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon />
            <Typography variant="h6">Настройка столбцов</Typography>
          </Box>
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Статистика */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Видимых столбцов: <strong>{localSelection.length + systemColumns.length}</strong> из{' '}
            <strong>{customFields.length + systemColumns.length}</strong>
          </Typography>
        </Box>

        {/* Системные столбцы */}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Пользовательские поля ({customFields.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<SelectAllIcon />}
                onClick={handleSelectAll}
                disabled={localSelection.length === customFields.length}
              >
                Все
              </Button>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleSelectNone}
                disabled={localSelection.length === 0}
              >
                Очистить
              </Button>
            </Box>
          </Box>

          <FormGroup>
            {customFields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Пользовательские поля не созданы
              </Typography>
            ) : (
              customFields.map((field) => {
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
                        {fieldData.name}
                        <Chip 
                          size="small" 
                          label={fieldData.fieldType} 
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
              })
            )}
          </FormGroup>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} color="inherit">
          Отмена
        </Button>
        <Button 
          onClick={handleApply} 
          variant="contained"
          startIcon={<VisibilityIcon />}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnVisibilityDialog;