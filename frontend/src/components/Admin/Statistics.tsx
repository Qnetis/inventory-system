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
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Получение статистики с улучшенной обработкой ошибок
  const { data: statisticsResponse, isLoading, error, refetch } = useQuery({
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

  const periodLabels = {
    daily: 'за сегодня',
    weekly: 'за текущую неделю', 
    monthly: 'за текущий месяц',
  };

  const periodTitles = {
    daily: 'За день',
    weekly: 'За неделю',
    monthly: 'За месяц',
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
      {/* Переключатель периода */}
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
            <Alert severity="error" sx={{ mb: 2 }}>
              Ошибка формата данных статистики. Обратитесь к администратору.
              <br />
              <small>Получен: {typeof stats} вместо массива</small>
            </Alert>
          ) : null}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Пользователь</TableCell>
                  <TableCell align="right">Записей</TableCell>
                  <TableCell align="right">Сумма</TableCell>
                  <TableCell align="center">Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(stats) || stats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box py={4}>
                        <Typography variant="body1" color="text.secondary">
                          {!Array.isArray(stats) ? 'Ошибка формата данных' : 'Нет данных за выбранный период'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {!Array.isArray(stats) 
                            ? 'Обратитесь к администратору' 
                            : 'Попробуйте выбрать другой период или проверьте, есть ли записи в системе'
                          }
                        </Typography>
                        {!Array.isArray(stats) && (
                          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                            Получен: {typeof stats} вместо массива
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.map((stat: any, index: number) => {
                    // Дополнительная проверка каждого элемента
                    if (!stat || typeof stat !== 'object') {
                      console.warn('Invalid stat item:', stat);
                      return null;
                    }

                    return (
                      <TableRow key={stat.userId || index} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {stat.user || 'Неизвестный пользователь'}
                            </Typography>
                            {stat.userId && (
                              <Typography variant="caption" color="text.secondary">
                                ID: {stat.userId}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {stat.count || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {(stat.totalMoney || 0).toLocaleString('ru-RU')} ₽
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {(stat.count || 0) > 0 ? (
                            <Chip 
                              label="Активен" 
                              color="success" 
                              size="small" 
                            />
                          ) : (
                            <Chip 
                              label="Неактивен" 
                              color="default" 
                              size="small" 
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  }).filter(Boolean) // Убираем null элементы
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Дополнительная информация */}
      {Array.isArray(stats) && stats.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Последнее обновление: {new Date().toLocaleString('ru-RU')}
          </Typography>
        </Box>
      )}

      {/* Отладочная информация в режиме разработки */}
      {import.meta.env.DEV && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Debug: Raw response type: {typeof statisticsResponse}, Stats type: {typeof stats}, Array check: {Array.isArray(stats) ? 'true' : 'false'}
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            Stats length: {Array.isArray(stats) ? stats.length : 'N/A'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Statistics;