// frontend/src/components/Records/CreateRecordDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import DynamicForm from './DynamicForm';

interface CreateRecordDialogProps {
  open: boolean;
  onClose: () => void;
  fields: any[];
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  error?: string | null;
}

const CreateRecordDialog: React.FC<CreateRecordDialogProps> = ({
  open,
  onClose,
  fields,
  onSubmit,
  isLoading = false,
  error = null,
}) => {
  // ИСПРАВЛЕНИЕ: Используем ref для доступа к методам DynamicForm
  const dynamicFormRef = useRef<{ triggerSubmit: () => void }>(null);

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  const handleSave = () => {
    // ИСПРАВЛЕНИЕ: Вызываем метод отправки из DynamicForm
    if (dynamicFormRef.current) {
      dynamicFormRef.current.triggerSubmit();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Создание новой записи
          <IconButton 
            onClick={handleClose}
            disabled={isLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* ИСПРАВЛЕНИЕ: Убираем форму отсюда, DynamicForm управляет своей формой */}
<DynamicForm
  ref={dynamicFormRef}
  fields={fields}
  onSubmit={handleSubmit}
  showNameField={false} // Было: true
  showSubmitButton={false}
/>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button 
          onClick={handleClose}
          disabled={isLoading}
          color="inherit"
        >
          Отмена
        </Button>
        
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={isLoading || fields.length === 0}
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateRecordDialog;