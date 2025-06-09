/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  ExpandMore as ExpandMoreIcon,
  Bluetooth as BluetoothIcon,
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';

interface BarcodePrintDialogProps {
  open: boolean;
  onClose: () => void;
  barcode: string;
  recordName?: string;
}

interface PrintSettings {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  showName: boolean;
  showBarcode: boolean;
}

const defaultSettings: PrintSettings = {
  width: 50,
  height: 25,
  orientation: 'landscape',
  fontSize: 10,
  showName: true,
  showBarcode: true,
};

export const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  open,
  onClose,
  barcode,
  recordName,
}) => {
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const previewRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (barcodeCanvasRef.current && barcode && settings.showBarcode) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcode, {
          format: 'EAN13',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: settings.fontSize,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [barcode, settings.fontSize, settings.showBarcode]);

  const updateSettings = (key: keyof PrintSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Не удалось открыть окно печати. Проверьте настройки браузера.');
      return;
    }

    // Генерируем штрихкод для печати
    const canvas = document.createElement('canvas');
    let barcodeDataUrl = '';
    
    if (settings.showBarcode) {
      try {
        JsBarcode(canvas, barcode, {
          format: 'EAN13',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: settings.fontSize,
          margin: 10,
        });
        barcodeDataUrl = canvas.toDataURL();
      } catch (error) {
        console.error('Error generating barcode for print:', error);
      }
    }

    const printContent = `
      <html>
        <head>
          <title>Печать этикетки</title>
          <style>
            @page {
              size: ${settings.width}mm ${settings.height}mm;
              margin: 2mm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: ${settings.fontSize}px;
              text-align: center;
              margin: 0;
              padding: 5px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .label-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .name {
              font-weight: bold;
              margin-bottom: 3px;
              word-wrap: break-word;
              text-align: center;
            }
            .barcode {
              margin: 3px 0;
            }
            .barcode img {
              max-width: 100%;
              height: auto;
            }
            .barcode-text {
              font-size: ${Math.max(8, settings.fontSize - 2)}px;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="label-content">
            ${settings.showName && recordName ? `<div class="name">${recordName}</div>` : ''}
            ${settings.showBarcode && barcodeDataUrl ? `
              <div class="barcode">
                <img src="${barcodeDataUrl}" alt="Штрихкод" />
              </div>
              <div class="barcode-text">${barcode}</div>
            ` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleBluetoothPrint = async () => {
    try {
      if ('bluetooth' in navigator) {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['battery_service'] }] // Замените на реальный сервис принтера
        });
        
        console.log('Bluetooth device:', device);
        alert(`Подключение к устройству: ${device.name}\nШтрихкод: ${barcode}${recordName ? `\nНазвание: ${recordName}` : ''}`);
      } else {
        alert('Bluetooth не поддерживается в этом браузере');
      }
    } catch (error) {
      console.error('Bluetooth error:', error);
      alert('Ошибка подключения к Bluetooth устройству');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Печать этикетки
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Настройки печати */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Настройки этикетки</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {/* Размер этикетки */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Размер этикетки (мм)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Ширина"
                  type="number"
                  size="small"
                  value={settings.width}
                  onChange={(e) => updateSettings('width', Number(e.target.value))}
                  inputProps={{ min: 20, max: 100, step: 5 }}
                />
                <TextField
                  label="Высота"
                  type="number"
                  size="small"
                  value={settings.height}
                  onChange={(e) => updateSettings('height', Number(e.target.value))}
                  inputProps={{ min: 15, max: 80, step: 5 }}
                />
              </Box>
            </Box>
            
            {/* Размер шрифта */}
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Размер шрифта"
                type="number"
                size="small"
                value={settings.fontSize}
                onChange={(e) => updateSettings('fontSize', Number(e.target.value))}
                inputProps={{ min: 6, max: 16, step: 1 }}
              />
            </Box>
            
            {/* Опции отображения */}
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.showName}
                    onChange={(e) => updateSettings('showName', e.target.checked)}
                  />
                }
                label="Показывать название записи"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.showBarcode}
                    onChange={(e) => updateSettings('showBarcode', e.target.checked)}
                  />
                }
                label="Показывать штрихкод"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
        
        {/* Предпросмотр */}
        <Paper 
          elevation={3}
          sx={{ 
            mt: 3,
            p: 2, 
            bgcolor: 'grey.50',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Предпросмотр этикетки ({settings.width}×{settings.height} мм)
          </Typography>
          
          <Box
            ref={previewRef}
            sx={{
              border: '1px dashed #ccc',
              width: `${Math.min(settings.width * 3, 300)}px`,
              height: `${Math.min(settings.height * 3, 200)}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 1,
              bgcolor: 'white',
              fontSize: `${Math.max(10, settings.fontSize)}px`,
            }}
          >
            {settings.showName && recordName && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1,
                  textAlign: 'center',
                  fontSize: `${Math.max(10, settings.fontSize)}px`,
                }}
              >
                {recordName}
              </Typography>
            )}
            
            {settings.showBarcode && (
              <Box sx={{ textAlign: 'center' }}>
                <canvas 
                  ref={barcodeCanvasRef}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    transform: 'scale(0.8)',
                  }}
                />
              </Box>
            )}
          </Box>
        </Paper>

        {/* Информация */}
        {!settings.showName && !settings.showBarcode && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Выберите хотя бы один элемент для отображения на этикетке
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Отмена
        </Button>
        
        <Button
          onClick={handleBluetoothPrint}
          variant="outlined"
          startIcon={<BluetoothIcon />}
          disabled={!settings.showName && !settings.showBarcode}
        >
          Bluetooth
        </Button>
        
        <Button
          onClick={handlePrint}
          variant="contained"
          startIcon={<PrintIcon />}
          disabled={!settings.showName && !settings.showBarcode}
        >
          Печать
        </Button>
      </DialogActions>
    </Dialog>
  );
};