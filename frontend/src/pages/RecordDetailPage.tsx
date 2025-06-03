/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid, // Новый Grid из MUI v7
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  Fab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Bluetooth as BluetoothIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DynamicForm from '../components/Records/DynamicForm';

const RecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Получение записи
  const { data: recordData, isLoading, refetch } = useQuery({
    queryKey: ['record', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/records/${id}?populate=owner`);
      return data.data;
    },
    enabled: !!id,
  });

  // Получение кастомных полей
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      const { data } = await api.get('/api/custom-fields?sort=order');
      return data.data;
    },
  });

  // Генерация штрихкода
  useEffect(() => {
    if (canvasRef.current && recordData) {
      const record = recordData.attributes || recordData;
      if (record.barcode) {
        JsBarcode(canvasRef.current, record.barcode, {
          format: 'EAN13',
          width: isMobile ? 1.5 : 2,
          height: isMobile ? 80 : 100,
          displayValue: true,
          fontSize: isMobile ? 14 : 16,
        });
      }
    }
  }, [recordData, isMobile]);

  const handleEdit = async (formData: any) => {
    try {
      await api.put(`/api/records/${id}`, { data: formData });
      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth API не поддерживается в этом браузере');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['battery_service'] }],
        optionalServices: ['serial_port_service'],
      });

      console.log('Connected to', device.name);
      handleSystemPrint();
    } catch (error) {
      console.error('Bluetooth error:', error);
      handleSystemPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    const record = recordData?.attributes || recordData;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Печать штрихкода</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            margin: 0;
          }
          .inventory-number {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .record-name {
            font-size: 16px;
            margin-bottom: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${record?.name ? `<div class="record-name">${record.name}</div>` : ''}
        <div class="inventory-number">
          Инв. №: ${record?.inventoryNumber}
        </div>
        <canvas id="barcode"></canvas>
        <script>
          JsBarcode("#barcode", "${record?.barcode}", {
            format: "EAN13",
            width: 2,
            height: 100,
            displayValue: true,
            fontSize: 16
          });
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 1000);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!recordData) {
    return (
      <Box p={4}>
        <Typography>Запись не найдена</Typography>
      </Box>
    );
  }

  const record = recordData.attributes || recordData;
  const owner = record.owner?.data?.attributes || record.owner;
  const canEdit = user?.id === (owner?.id || record.owner?.id) || user?.role?.type === 'admin';

  return (
    <Box>
      {/* Заголовок с кнопками */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/records')}
          size={isMobile ? 'small' : 'medium'}
        >
          {!isMobile && 'Назад к списку'}
        </Button>
        
        {canEdit && !isMobile && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setIsEditDialogOpen(true)}
          >
            Редактировать
          </Button>
        )}
      </Box>

      {/* Новый синтаксис Grid для MUI v7+ */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Основная информация */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom>
              {record.name || 'Информация о записи'}
            </Typography>
            
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Инвентарный номер
                </Typography>
                <Typography variant="body1">
                  {record.inventoryNumber}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Штрихкод
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                  {record.barcode}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Владелец
                </Typography>
                <Typography variant="body1">
                  {owner?.fullName || owner?.username}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Дата создания
                </Typography>
                <Typography variant="body1">
                  {format(new Date(record.createdAt), 'dd MMMM yyyy, HH:mm', {
                    locale: ru,
                  })}
                </Typography>
              </Box>
            </Stack>

            {customFields.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ mb: 2 }}>
                  Дополнительные поля
                </Typography>

                <Stack spacing={2}>
                  {customFields.map((field: any) => {
                    const fieldData = field.attributes || field;
                    const value = record.dynamicData?.[field.id];
                    if (value === undefined || value === null) return null;

                    return (
                      <Box key={field.id}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {fieldData.name}
                        </Typography>
                        <Typography variant="body1">
                          {formatFieldValue(value, fieldData.fieldType)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </>
            )}
          </Paper>
        </Grid>

        {/* Штрихкод */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom align="center">
                Штрихкод
              </Typography>
              <Box display="flex" justifyContent="center" my={2}>
                <canvas ref={canvasRef} />
              </Box>
              <Stack 
                direction={isMobile ? 'column' : 'row'} 
                spacing={1} 
                justifyContent="center"
              >
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handleSystemPrint}
                  size={isMobile ? 'small' : 'medium'}
                  fullWidth={isMobile}
                >
                  Печать
                </Button>
                <Button
                  variant="contained"
                  startIcon={<BluetoothIcon />}
                  onClick={handleBluetoothPrint}
                  disabled={isPrinting}
                  size={isMobile ? 'small' : 'medium'}
                  fullWidth={isMobile}
                >
                  {isPrinting ? 'Подключение...' : 'Bluetooth'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Плавающая кнопка редактирования для мобильных */}
      {canEdit && isMobile && (
        <Fab
          color="primary"
          aria-label="edit"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => setIsEditDialogOpen(true)}
        >
          <EditIcon />
        </Fab>
      )}

      {/* Диалог редактирования */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: isMobile ? { 
            m: 1, 
            width: 'calc(100% - 16px)',
            maxHeight: 'calc(100% - 16px)' 
          } : {}
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Редактирование записи</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => setIsEditDialogOpen(false)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DynamicForm
            fields={customFields}
            defaultValues={{
              name: record.name,
              ...record.dynamicData,
            }}
            onSubmit={handleEdit}
            showNameField={true}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

function formatFieldValue(value: any, fieldType: string): string {
  switch (fieldType) {
    case 'MONEY':
      return `${Number(value).toLocaleString('ru-RU')} ₽`;
    case 'CHECKBOX':
      return value ? 'Да' : 'Нет';
    default:
      return String(value);
  }
}

export default RecordDetailPage;