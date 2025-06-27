/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const Statistics: React.FC = () => {
  // Добавляем 'all' в тип периода
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');

  // Получение статистики с улучшенной обработкой ошибок
  const { data: statisticsResponse, isLoading, error } = useQuery({
    queryKey: ['statistics', period],
    queryFn: async () => {
      try {
        console.log('Fetching statistics for period:', period);
        const response = await api.get(`/api/records/statistics?period=${period}`);
        console.log('Statistics API full response:', response);
        console.log('Statistics API response data:', response.data);
        return response.data;
      } catch (error) {
        console.error('Statistics API error:', error);
        throw error;
      }
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Безопасное извлечение статистики с множественными проверками
  const extractStats = (response: any) => {
    console.log('Extracting stats from response:', response);
    
    // Проверяем различные форматы ответа
    if (response?.data && Array.isArray(response.data)) {
      console.log('Found stats in response.data');
      return response.data;
    }
    
    if (response?.statistics && Array.isArray(response.statistics)) {
      console.log('Found stats in response.statistics');
      return response.statistics;
    }
    
    if (Array.isArray(response)) {
      console.log('Response is array directly');
      return response;
    }
    
    console.warn('Could not extract stats array from response:', response);
    return [];
  };

  const stats = extractStats(statisticsResponse);
  console.log('Final processed stats:', stats);
  console.log('Is stats an array?', Array.isArray(stats));

  // Обновляем лейблы с добавлением "всё время"
  const periodLabels = {
    daily: 'за сегодня',
    weekly: 'за текущую неделю', 
    monthly: 'за текущий месяц',
    all: 'за всё время',
  };

  const periodTitles = {
    daily: 'За день',
    weekly: 'За неделю',
    monthly: 'За месяц',
    all: 'За всё время',
  };

  // Вычисления с защитой от ошибок
  const safeStats = Array.isArray(stats) ? stats : [];
  const totalRecords = safeStats.reduce((sum: number, stat: any) => {
    return sum + (typeof stat?.count === 'number' ? stat.count : 0);
  }, 0);
  
  const totalMoney = safeStats.reduce((sum: number, stat: any) => {
    return sum + (typeof stat?.totalMoney === 'number' ? stat.totalMoney : 0);
  }, 0);
  
  const activeUsers = safeStats.length;

  // Состояние загрузки
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка статистики...</Typography>
      </Box>
    );
  }

  // Обработка ошибки
  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Ошибка загрузки статистики. Попробуйте обновить страницу.
          <br />
          <small>Детали ошибки: {error.message}</small>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Переключатель периода с добавлением кнопки "Всё время" */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, newPeriod) => {
            if (newPeriod !== null) {
              setPeriod(newPeriod);
            }
          }}
          aria-label="период статистики"
        >
          <ToggleButton value="daily" aria-label="день">
            День
          </ToggleButton>
          <ToggleButton value="weekly" aria-label="неделя">
            Неделя
          </ToggleButton>
          <ToggleButton value="monthly" aria-label="месяц">
            Месяц
          </ToggleButton>
          <ToggleButton value="all" aria-label="всё время">
            Всё время
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Карточки с общей статистикой */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon color="primary" />
              <Box>
                <Typography variant="h4" component="div">
                  {totalRecords}
                </Typography>
                <Typography color="text.secondary">
                  Записей {periodLabels[period]}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MoneyIcon color="success" />
              <Box>
                <Typography variant="h4" component="div">
                  {totalMoney.toLocaleString('ru-RU')} ₽
                </Typography>
                <Typography color="text.secondary">
                  Общая сумма {periodLabels[period]}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon color="info" />
              <Box>
                <Typography variant="h4" component="div">
                  {activeUsers}
                </Typography>
                <Typography color="text.secondary">
                  Активных пользователей
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* Таблица детальной статистики */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Детальная статистика {periodTitles[period].toLowerCase()}
          </Typography>
          
          {!Array.isArray(stats) ? (
            <Alert severity="info">
              Данные не найдены или имеют неожиданный формат
            </Alert>
          ) : safeStats.length === 0 ? (
            <Alert severity="info">
              Нет данных для отображения {periodLabels[period]}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Пользователь</strong></TableCell>
                    <TableCell align="right"><strong>Записей</strong></TableCell>
                    <TableCell align="right"><strong>Сумма</strong></TableCell>
                    <TableCell align="center"><strong>Статус</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {safeStats.map((stat: any, index: number) => (
                    <TableRow key={stat.user || index} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {stat.user || 'Неизвестный пользователь'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={stat.count || 0} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main">
                          {typeof stat.totalMoney === 'number' 
                            ? `${stat.totalMoney.toLocaleString('ru-RU')} ₽`
                            : '0 ₽'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={stat.count > 0 ? 'Активен' : 'Неактивен'} 
                          color={stat.count > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Statistics;