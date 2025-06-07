/* eslint-disable @typescript-eslint/no-explicit-any */


import React, { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';

interface BarcodePrintDialogProps {
  open: boolean;
  onClose: () => void;
  barcode: string;
  inventoryNumber: string;
  recordName?: string;
}

interface PrintSettings {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  showName: boolean;
  showInventoryNumber: boolean;
  showBarcode: boolean;
}

const defaultSettings: PrintSettings = {
  width: 50,
  height: 25,
  orientation: 'landscape',
  fontSize: 10,
  showName: true,
  showInventoryNumber: true,
  showBarcode: true,
};

export const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  open,
  onClose,
  barcode,
  inventoryNumber,
  recordName,
}) => {
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Не удалось открыть окно печати. Проверьте настройки браузера.');
      return;
    }

    // Конвертируем размеры из мм в пиксели (96 DPI)
    const widthPx = Math.round((settings.width * 96) / 25.4);
    const heightPx = Math.round((settings.height * 96) / 25.4);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Печать этикетки</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page {
            size: ${settings.width}mm ${settings.height}mm;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .label {
            width: ${widthPx}px;
            height: ${heightPx}px;
            box-sizing: border-box;
            padding: 3mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            overflow: hidden;
          }
          
          .record-name {
            font-size: ${settings.fontSize + 2}px;
            font-weight: bold;
            margin-bottom: 2mm;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .inventory-number {
            font-size: ${settings.fontSize}px;
            margin-bottom: 2mm;
          }
          
          canvas {
            max-width: 100%;
            height: auto;
          }
          
          @media print {
            body {
              min-height: auto;
            }
            .label {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="label">
          ${settings.showName && recordName ? `<div class="record-name">${recordName}</div>` : ''}
          ${settings.showInventoryNumber ? `<div class="inventory-number">Инв. №: ${inventoryNumber}</div>` : ''}
          ${settings.showBarcode ? '<canvas id="barcode"></canvas>' : ''}
        </div>
        <script>
          ${settings.showBarcode ? `
          window.onload = function() {
            JsBarcode("#barcode", "${barcode}", {
              format: "EAN13",
              width: 1.2,
              height: 35,
              displayValue: true,
              fontSize: ${settings.fontSize},
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000'
            });
            
            // Автопечать
            setTimeout(() => {
              window.print();
              setTimeout(() => window.close(), 1000);
            }, 500);
          };
          ` : `
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 1000);
          };
          `}
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const updateSettings = (key: keyof PrintSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Настройка печати этикетки</Typography>
          <Box>
            <IconButton
              onClick={() => setShowSettings(!showSettings)}
              size="small"
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {showSettings && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Настройки печати
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
              <TextField
                label="Ширина (мм)"
                type="number"
                value={settings.width}
                onChange={(e) => updateSettings('width', Number(e.target.value))}
                size="small"
                inputProps={{ min: 20, max: 100 }}
              />
              
              <TextField
                label="Высота (мм)"
                type="number"
                value={settings.height}
                onChange={(e) => updateSettings('height', Number(e.target.value))}
                size="small"
                inputProps={{ min: 20, max: 100 }}
              />
              
              <FormControl size="small" fullWidth>
                <InputLabel>Ориентация</InputLabel>
                <Select
                  value={settings.orientation}
                  label="Ориентация"
                  onChange={(e) => updateSettings('orientation', e.target.value)}
                >
                  <MenuItem value="portrait">Книжная</MenuItem>
                  <MenuItem value="landscape">Альбомная</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Размер шрифта"
                type="number"
                value={settings.fontSize}
                onChange={(e) => updateSettings('fontSize', Number(e.target.value))}
                size="small"
                inputProps={{ min: 8, max: 16 }}
              />
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <FormControl component="fieldset">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.showName}
                      onChange={(e) => updateSettings('showName', e.target.checked)}
                    />
                    {' '}Показывать название
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.showInventoryNumber}
                      onChange={(e) => updateSettings('showInventoryNumber', e.target.checked)}
                    />
                    {' '}Показывать инвентарный номер
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.showBarcode}
                      onChange={(e) => updateSettings('showBarcode', e.target.checked)}
                    />
                    {' '}Показывать штрихкод
                  </label>
                </Box>
              </FormControl>
            </Box>
          </Box>
        )}
        
        <Paper 
          elevation={3}
          sx={{ 
            p: 2, 
            bgcolor: 'white',
            border: '1px dashed grey.400',
            minHeight: '150px',
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
              width: `${settings.width * 3}px`,
              height: `${settings.height * 3}px`,
              border: '1px solid grey.300',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
              bgcolor: 'white',
              overflow: 'hidden',
            }}
          >
            {settings.showName && recordName && (
              <Typography 
                variant="body2" 
                fontWeight="bold"
                sx={{ 
                  fontSize: `${settings.fontSize + 2}px`,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                {recordName}
              </Typography>
            )}
            
            {settings.showInventoryNumber && (
              <Typography 
                variant="caption" 
                sx={{ fontSize: `${settings.fontSize}px`, my: 0.5 }}
              >
                Инв. №: {inventoryNumber}
              </Typography>
            )}
            
            {settings.showBarcode && (
              <canvas ref={barcodeCanvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
            )}
          </Box>
        </Paper>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          При печати убедитесь, что в настройках принтера отключены поля и масштабирование установлено на 100%
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          onClick={handlePrint} 
          variant="contained" 
          startIcon={<PrintIcon />}
          disabled={!settings.showName && !settings.showInventoryNumber && !settings.showBarcode}
        >
          Печать
        </Button>
      </DialogActions>
    </Dialog>
  );
};