/* eslint-disable @typescript-eslint/no-explicit-any */

// src/pages/RecordDetailPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,

  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';




import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Bluetooth as BluetoothIcon,
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
      const { data } = await api.get('/api/custom-fields');
      return data.data;
    },
  });

  // Генерация штрихкода
  useEffect(() => {
    if (canvasRef.current && recordData?.attributes?.barcode) {
      JsBarcode(canvasRef.current, recordData.attributes.barcode, {
        format: 'EAN13',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
      });
    }
  }, [recordData]);

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

      // Запрос Bluetooth устройства
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['battery_service'] }],
        optionalServices: ['serial_port_service'],
      });

      console.log('Connected to', device.name);

      // В реальном приложении здесь будет код для отправки на принтер
      // Сейчас используем fallback на системную печать
      handleSystemPrint();
    } catch (error) {
      console.error('Bluetooth error:', error);
      // Fallback на системную печать
      handleSystemPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = () => {
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
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="inventory-number">
          Инв. №: ${recordData?.attributes?.inventoryNumber}
        </div>
        <canvas id="barcode"></canvas>
        <script>
          JsBarcode("#barcode", "${recordData?.attributes?.barcode}", {
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

  const record = recordData.attributes;
  const owner = record.owner?.data?.attributes;
  const canEdit = user?.id === record.owner?.data?.id || user?.role?.type === 'admin';

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/records')}
        >
          Назад к списку
        </Button>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setIsEditDialogOpen(true)}
          >
            Редактировать
          </Button>
        )}
      </Box>

   // В MUI v7 Grid API изменился. Используйте это:
<Grid container spacing={3}>
  <Grid size={{ xs: 12, md: 8 }}>
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Информация о записи
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Инвентарный номер
        </Typography>
        <Typography variant="body1" gutterBottom>
          {record.inventoryNumber}
        </Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Штрихкод
        </Typography>
        <Typography variant="body1" gutterBottom>
          {record.barcode}
        </Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Владелец
        </Typography>
        <Typography variant="body1" gutterBottom>
          {owner?.fullName || owner?.username}
        </Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Дата создания
        </Typography>
        <Typography variant="body1" gutterBottom>
          {format(new Date(record.createdAt), 'dd MMMM yyyy, HH:mm', {
            locale: ru,
          })}
        </Typography>
      </Box>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Дополнительные поля
      </Typography>

      {customFields.map((field: any) => {
        const value = record.dynamicData?.[field.id];
        if (value === undefined || value === null) return null;

        return (
          <Box key={field.id} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {field.attributes.name}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatFieldValue(value, field.attributes.fieldType)}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  </Grid>

  <Grid size={{ xs: 12, md: 4 }}>
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom align="center">
          Штрихкод
        </Typography>
        <Box display="flex" justifyContent="center" my={2}>
          <canvas ref={canvasRef} />
        </Box>
        <Box display="flex" gap={1} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handleSystemPrint}
          >
            Печать
          </Button>
          <Button
            variant="contained"
            startIcon={<BluetoothIcon />}
            onClick={handleBluetoothPrint}
            disabled={isPrinting}
          >
            {isPrinting ? 'Подключение...' : 'Bluetooth'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  </Grid>
</Grid>

      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Редактирование записи</DialogTitle>
        <DialogContent>
          <DynamicForm
            fields={customFields}
            defaultValues={record.dynamicData}
            onSubmit={handleEdit}
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