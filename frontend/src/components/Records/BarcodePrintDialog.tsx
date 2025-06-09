// frontend/src/components/Records/BarcodePrintDialog.tsx
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
  fontSize: number;
  barcodeHeight: number;
  showName: boolean;
  showInventoryNumber: boolean;
  showBarcode: boolean;
}

const PRESET_SIZES = [
  { label: '58×40 мм', width: 58, height: 40 },
  { label: '58×60 мм', width: 58, height: 60 },
  { label: '76×25 мм', width: 76, height: 25 },
  { label: '100×50 мм', width: 100, height: 50 },
];

const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({
  open,
  onClose,
  barcode,
  inventoryNumber,
  recordName
}) => {
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<PrintSettings>({
    width: 58,
    height: 40,
    fontSize: 10,
    barcodeHeight: 30,
    showName: true,
    showInventoryNumber: true,
    showBarcode: true,
  });
  const [selectedPreset, setSelectedPreset] = useState('58×40 мм');

  const updateSettings = (key: keyof PrintSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: typeof PRESET_SIZES[0]) => {
    setSettings(prev => ({
      ...prev,
      width: preset.width,
      height: preset.height,
    }));
    setSelectedPreset(preset.label);
  };

  // Генерируем штрихкод для предварительного просмотра
  useEffect(() => {
    if (barcodeCanvasRef.current && settings.showBarcode) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcode, {
          format: "EAN13",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 2,
        });
      } catch (error) {
        console.error('Ошибка генерации штрихкода:', error);
      }
    }
  }, [barcode, settings.showBarcode]);

  const handlePrint = () => {
    const mmToPx = (mm: number) => (mm * 96) / 25.4;

    // Создаем контент для печати
    const printContent = `
      <div style="
        width: ${mmToPx(settings.width)}px;
        height: ${mmToPx(settings.height)}px;
        border: 1px solid #000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        padding: ${mmToPx(2)}px;
        box-sizing: border-box;
        text-align: center;
        background: white;
        margin: 0 auto;
        page-break-inside: avoid;
      ">
        ${settings.showName && recordName ? 
          `<div style="
            font-size: ${settings.fontSize}px;
            font-weight: bold;
            line-height: 1.2;
            margin-bottom: ${mmToPx(2)}px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            word-wrap: break-word;
            hyphens: auto;
          ">${recordName}</div>` : ''}
        
        ${settings.showInventoryNumber ? 
          `<div style="
            font-size: ${Math.max(settings.fontSize - 2, 8)}px;
            margin-bottom: ${mmToPx(1)}px;
            font-weight: 500;
          ">Инв. №: ${inventoryNumber}</div>` : ''}
        
        ${settings.showBarcode ? 
          `<div id="barcode-container-print" style="
            margin: ${mmToPx(1)}px 0;
            max-width: 100%;
            overflow: hidden;
          "></div>` : ''}
      </div>
    `;

    // Создаем элемент для печати
    const printElement = document.createElement('div');
    printElement.id = 'print-label-content';
    printElement.innerHTML = printContent;
    printElement.style.display = 'none';

    // Добавляем стили для печати
    const printStyles = document.createElement('style');
    printStyles.id = 'print-label-styles';
    printStyles.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        
        #print-label-content, #print-label-content * {
          visibility: visible;
        }
        
        #print-label-content {
          position: absolute !important;
          left: 50% !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
          display: block !important;
        }
        
        @page {
          margin: 5mm;
          size: ${settings.width}mm ${settings.height}mm;
        }
      }
    `;

    // Добавляем в DOM
    document.head.appendChild(printStyles);
    document.body.appendChild(printElement);

    // Генерируем штрихкод для печати
    if (settings.showBarcode) {
      const barcodeContainer = document.getElementById('barcode-container-print');
      if (barcodeContainer) {
        const canvas = document.createElement('canvas');
        barcodeContainer.appendChild(canvas);
        
        try {
          const scaleFactor = settings.width > 60 ? 1.5 : 1.2;
          JsBarcode(canvas, barcode, {
            format: "EAN13",
            width: scaleFactor,
            height: settings.barcodeHeight,
            displayValue: true,
            fontSize: Math.max(settings.fontSize - 2, 8),
            margin: 0,
            background: '#ffffff',
            lineColor: '#000000'
          });
          
          // Масштабируем canvas под размер этикетки
          const maxWidth = mmToPx(settings.width - 4); // с учетом отступов
          if (canvas.width > maxWidth) {
            const scale = maxWidth / canvas.width;
            canvas.style.width = `${canvas.width * scale}px`;
            canvas.style.height = `${canvas.height * scale}px`;
          }
        } catch (error) {
          console.error('Ошибка генерации штрихкода для печати:', error);
          barcodeContainer.innerHTML = `
            <div style="
              font-size: ${Math.max(settings.fontSize - 2, 8)}px;
              font-family: monospace;
              letter-spacing: 1px;
            ">${barcode}</div>
          `;
        }
      }
    }

    // Печатаем с небольшой задержкой
    setTimeout(() => {
      window.print();
      
      // Очистка после печати
      const cleanup = () => {
        const styleEl = document.getElementById('print-label-styles');
        const contentEl = document.getElementById('print-label-content');
        
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
        if (contentEl && contentEl.parentNode) {
          contentEl.parentNode.removeChild(contentEl);
        }
        
        window.removeEventListener('afterprint', cleanup);
      };
      
      window.addEventListener('afterprint', cleanup);
      
      // Страховочная очистка через 5 секунд
      setTimeout(cleanup, 5000);
    }, 300);
  };

  const handleBluetoothPrint = async () => {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API не поддерживается в этом браузере');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['00001800-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'Printer' }
        ],
        optionalServices: [
          '00001801-0000-1000-8000-00805f9b34fb',
          '0000180a-0000-1000-8000-00805f9b34fb',
        ]
      });

      console.log('Подключено к устройству:', device.name);
      alert(`Подключено к ${device.name}. Функция Bluetooth-печати в разработке.`);
      
      // Пока используем обычную печать
      handlePrint();
      
    } catch (error) {
      console.error('Ошибка Bluetooth:', error);
      if (error instanceof Error) {
        if (error.message.includes('не поддерживается')) {
          alert('Ваш браузер не поддерживает Bluetooth. Используется обычная печать.');
        } else if (error.name === 'NotFoundError') {
          alert('Bluetooth-принтер не найден. Используется обычная печать.');
        } else {
          alert('Не удалось подключиться к Bluetooth-принтеру. Используется обычная печать.');
        }
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
                variant={selectedPreset === preset.label ? 'contained' : 'outlined'}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Настройки */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Настройки этикетки</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {/* Размер */}
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
                  inputProps={{ min: 20, max: 120, step: 2 }}
                />
                <TextField
                  label="Высота"
                  type="number"
                  size="small"
                  value={settings.height}
                  onChange={(e) => updateSettings('height', Number(e.target.value))}
                  inputProps={{ min: 15, max: 100, step: 2 }}
                />
              </Box>
            </Box>
            
            {/* Шрифт */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Размер шрифта
              </Typography>
              <TextField
                type="number"
                size="small"
                value={settings.fontSize}
                onChange={(e) => updateSettings('fontSize', Number(e.target.value))}
                inputProps={{ min: 6, max: 20, step: 1 }}
                sx={{ width: '120px' }}
              />
            </Box>

            {/* Высота штрихкода */}
            {settings.showBarcode && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Высота штрихкода
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={settings.barcodeHeight}
                  onChange={(e) => updateSettings('barcodeHeight', Number(e.target.value))}
                  inputProps={{ min: 15, max: 80, step: 5 }}
                  sx={{ width: '120px' }}
                />
              </Box>
            )}

            {/* Отображаемые элементы */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Отображать на этикетке:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.showName}
                      onChange={(e) => updateSettings('showName', e.target.checked)}
                    />
                  }
                  label="Название записи"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.showInventoryNumber}
                      onChange={(e) => updateSettings('showInventoryNumber', e.target.checked)}
                    />
                  }
                  label="Инвентарный номер"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={settings.showBarcode}
                      onChange={(e) => updateSettings('showBarcode', e.target.checked)}
                    />
                  }
                  label="Штрихкод"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Предварительный просмотр */}
        <Typography variant="subtitle1" gutterBottom>
          Предварительный просмотр:
        </Typography>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9f9f9'
          }}
        >
          <Box
            sx={{
              width: `${settings.width * 2}px`,
              height: `${settings.height * 2}px`,
              border: '2px solid #333',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              p: 1,
              maxWidth: '300px',
              maxHeight: '200px',
              overflow: 'hidden'
            }}
          >
            {settings.showName && recordName && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: `${Math.max(settings.fontSize * 0.8, 8)}px`,
                  fontWeight: 'bold',
                  mb: 0.5,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  lineHeight: 1.2
                }}
              >
                {recordName}
              </Typography>
            )}
            
            {settings.showInventoryNumber && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: `${Math.max(settings.fontSize * 0.7, 7)}px`,
                  mb: 0.5,
                  fontWeight: 500
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

export default BarcodePrintDialog;