// frontend/src/components/Records/BarcodePrintDialog.tsx
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
  barcodeHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const PRESET_SIZES = [
  { label: 'Стандарт (50×25 мм)', width: 50, height: 25 },
  { label: 'Квадрат (40×40 мм)', width: 40, height: 40 },
  { label: 'Большая (70×30 мм)', width: 70, height: 30 },
  { label: 'Маленькая (30×20 мм)', width: 30, height: 20 },
];

export const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  open,
  onClose,
  barcode,
  inventoryNumber,
  recordName,
}) => {
  const [settings, setSettings] = useState<PrintSettings>(() => {
    // Загружаем сохраненные настройки
    const saved = localStorage.getItem('barcodePrintSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
    return {
      width: 50,
      height: 25,
      orientation: 'landscape',
      fontSize: 10,
      showName: true,
      showInventoryNumber: true,
      showBarcode: true,
      barcodeHeight: 35,
      margins: { top: 3, right: 3, bottom: 3, left: 3 },
    };
  });

  const [selectedPreset, setSelectedPreset] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Сохраняем настройки при изменении
  useEffect(() => {
    localStorage.setItem('barcodePrintSettings', JSON.stringify(settings));
  }, [settings]);

  // Генерация штрихкода для предпросмотра
  useEffect(() => {
    if (barcodeCanvasRef.current && barcode && settings.showBarcode) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcode, {
          format: 'EAN13',
          width: 1.2,
          height: settings.barcodeHeight,
          displayValue: true,
          fontSize: settings.fontSize,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [barcode, settings.fontSize, settings.showBarcode, settings.barcodeHeight]);

  const updateSettings = (key: keyof PrintSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateMargin = (side: keyof PrintSettings['margins'], value: number) => {
    setSettings(prev => ({
      ...prev,
      margins: { ...prev.margins, [side]: value }
    }));
  };

  const applyPreset = (preset: typeof PRESET_SIZES[0]) => {
    setSettings(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height,
    }));
    setSelectedPreset(preset.label);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Не удалось открыть окно печати. Проверьте настройки браузера.');
      return;
    }

    // Конвертируем размеры из мм в пиксели (96 DPI для экрана)
    const dpi = 96;
    const mmToPx = (mm: number) => Math.round((mm * dpi) / 25.4);

    const widthPx = mmToPx(settings.width);
    const heightPx = mmToPx(settings.height);
    const marginTopPx = mmToPx(settings.margins.top);
    const marginRightPx = mmToPx(settings.margins.right);
    const marginBottomPx = mmToPx(settings.margins.bottom);
    const marginLeftPx = mmToPx(settings.margins.left);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Печать этикетки - ${inventoryNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page {
            size: ${settings.width}mm ${settings.height}mm ${settings.orientation};
            margin: 0;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .label-container {
            width: ${widthPx}px;
            height: ${heightPx}px;
            position: relative;
            page-break-inside: avoid;
            overflow: hidden;
          }
          
          .label-content {
            position: absolute;
            top: ${marginTopPx}px;
            right: ${marginRightPx}px;
            bottom: ${marginBottomPx}px;
            left: ${marginLeftPx}px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
          }
          
          .record-name {
            font-size: ${settings.fontSize + 2}px;
            font-weight: bold;
            line-height: 1.2;
            margin-bottom: ${mmToPx(2)}px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          
          .inventory-number {
            font-size: ${settings.fontSize}px;
            margin-bottom: ${mmToPx(2)}px;
            font-weight: 500;
          }
          
          #barcode-canvas {
            max-width: 100%;
            height: auto;
          }
          
          .print-info {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="label-content">
            ${settings.showName && recordName ? 
              `<div class="record-name">${recordName}</div>` : ''}
            ${settings.showInventoryNumber ? 
              `<div class="inventory-number">Инв. №: ${inventoryNumber}</div>` : ''}
            ${settings.showBarcode ? 
              '<canvas id="barcode-canvas"></canvas>' : ''}
          </div>
        </div>
        
        <div class="print-info no-print">
          <p>Размер этикетки: ${settings.width}×${settings.height} мм</p>
          <p>Нажмите Ctrl+P для печати</p>
          <button onclick="window.print()">Печать</button>
        </div>
        
        <script>
          ${settings.showBarcode ? `
          // Генерируем штрихкод
          try {
            JsBarcode("#barcode-canvas", "${barcode}", {
              format: "EAN13",
              width: ${settings.width > 40 ? 1.5 : 1.2},
              height: ${settings.barcodeHeight},
              displayValue: true,
              fontSize: ${settings.fontSize},
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000'
            });
          } catch (error) {
            console.error('Barcode generation error:', error);
            document.getElementById('barcode-canvas').style.display = 'none';
          }
          ` : ''}
          
          // Автопечать с задержкой
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
              // Закрываем окно после печати
              window.addEventListener('afterprint', function() {
                setTimeout(function() {
                  window.close();
                }, 500);
              });
            }, 500);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleBluetoothPrint = async () => {
    try {
      // Проверяем поддержку Web Bluetooth API
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API не поддерживается в этом браузере');
      }

      // Запрашиваем устройство
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['00001800-0000-1000-8000-00805f9b34fb'] }, // Generic Access
          { namePrefix: 'Printer' }
        ],
        optionalServices: [
          '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
        ]
      });

      console.log('Подключено к устройству:', device.name);
      
      // Для реальной печати потребуется протокол конкретного принтера
      // Пока используем обычную печать
      alert(`Подключено к ${device.name}. Функция Bluetooth-печати в разработке.`);
      handlePrint();
      
    } catch (error) {
      console.error('Bluetooth error:', error);
      if (error instanceof Error && error.message.includes('не поддерживается')) {
        alert('Ваш браузер не поддерживает Bluetooth. Используйте обычную печать.');
      } else {
        alert('Не удалось подключиться к Bluetooth-принтеру. Используйте обычную печать.');
      }
      handlePrint();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Печать этикетки</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Быстрый выбор размера */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Быстрый выбор размера:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PRESET_SIZES.map((preset) => (
              <Button
                key={preset.label}
                size="small"
                variant={selectedPreset === preset.label ? "contained" : "outlined"}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Настройки печати */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Настройки печати</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Ширина (мм)"
                type="number"
                value={settings.width}
                onChange={(e) => {
                  updateSettings('width', Number(e.target.value));
                  setSelectedPreset('');
                }}
                size="small"
                inputProps={{ min: 20, max: 100, step: 5 }}
              />
              
              <TextField
                label="Высота (мм)"
                type="number"
                value={settings.height}
                onChange={(e) => {
                  updateSettings('height', Number(e.target.value));
                  setSelectedPreset('');
                }}
                size="small"
                inputProps={{ min: 20, max: 100, step: 5 }}
              />
              
              <TextField
                label="Размер шрифта"
                type="number"
                value={settings.fontSize}
                onChange={(e) => updateSettings('fontSize', Number(e.target.value))}
                size="small"
                inputProps={{ min: 8, max: 16 }}
              />
              
              <TextField
                label="Высота штрихкода"
                type="number"
                value={settings.barcodeHeight}
                onChange={(e) => updateSettings('barcodeHeight', Number(e.target.value))}
                size="small"
                inputProps={{ min: 20, max: 60 }}
              />
            </Box>
            
            {/* Отступы */}
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Отступы (мм):
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              <TextField
                label="Сверху"
                type="number"
                value={settings.margins.top}
                onChange={(e) => updateMargin('top', Number(e.target.value))}
                size="small"
                inputProps={{ min: 0, max: 10, step: 0.5 }}
              />
              <TextField
                label="Справа"
                type="number"
                value={settings.margins.right}
                onChange={(e) => updateMargin('right', Number(e.target.value))}
                size="small"
                inputProps={{ min: 0, max: 10, step: 0.5 }}
              />
              <TextField
                label="Снизу"
                type="number"
                value={settings.margins.bottom}
                onChange={(e) => updateMargin('bottom', Number(e.target.value))}
                size="small"
                inputProps={{ min: 0, max: 10, step: 0.5 }}
              />
              <TextField
                label="Слева"
                type="number"
                value={settings.margins.left}
                onChange={(e) => updateMargin('left', Number(e.target.value))}
                size="small"
                inputProps={{ min: 0, max: 10, step: 0.5 }}
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
                label="Показывать название"
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
              width: `${Math.min(settings.width * 4, 300)}px`,
              height: `${Math.min(settings.height * 4, 200)}px`,
              border: '2px solid',
              borderColor: 'grey.400',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: `${settings.margins.top * 0.1}rem ${settings.margins.right * 0.1}rem ${settings.margins.bottom * 0.1}rem ${settings.margins.left * 0.1}rem`,
              bgcolor: 'white',
              overflow: 'hidden',
              boxShadow: 2,
              position: 'relative',
            }}
          >
            {settings.showName && recordName && (
              <Typography 
                variant="body2" 
                fontWeight="bold"
                sx={{ 
                  fontSize: `${(settings.fontSize + 2) * 0.8}px`,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  width: '100%',
                  textAlign: 'center',
                  mb: 0.5,
                }}
              >
                {recordName}
              </Typography>
            )}
            
            {settings.showInventoryNumber && (
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: `${settings.fontSize * 0.8}px`, 
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                Инв. №: {inventoryNumber}
              </Typography>
            )}
            
            {settings.showBarcode && (
              <Box sx={{ maxWidth: '90%', height: 'auto' }}>
                <canvas ref={barcodeCanvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
              </Box>
            )}
          </Box>
        </Paper>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          При печати убедитесь, что:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>В настройках принтера отключены поля</li>
            <li>Масштабирование установлено на 100%</li>
            <li>Выбран правильный размер бумаги</li>
          </ul>
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Отмена
        </Button>
        <Button 
          onClick={handleBluetoothPrint}
          variant="outlined"
          startIcon={<BluetoothIcon />}
          sx={{ ml: 'auto', mr: 1 }}
        >
          Bluetooth печать
        </Button>
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

// Экспортируем также функцию для печати без диалога
export const printBarcodeLabel = (
  barcode: string,
  inventoryNumber: string,
  recordName?: string,
  customSettings?: Partial<PrintSettings>
) => {
  const defaultSettings: PrintSettings = {
    width: 50,
    height: 25,
    orientation: 'landscape',
    fontSize: 10,
    showName: true,
    showInventoryNumber: true,
    showBarcode: true,
    barcodeHeight: 35,
    margins: { top: 3, right: 3, bottom: 3, left: 3 },
  };
  
  const settings = { ...defaultSettings, ...customSettings };
  
  // Реализация прямой печати
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
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


  // Используем ту же логику генерации HTML
  // ... (код генерации HTML как в handlePrint)
};

export default BarcodePrintDialog;