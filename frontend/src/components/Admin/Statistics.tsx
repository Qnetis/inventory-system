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

  // ИСПРАВЛЕНИЕ: Правильно обрабатываем ответ API
  const { data: statisticsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['statistics', period],
    queryFn: async () => {
      console.log('Fetching statistics for period:', period);
      const response = await api.get(`/api/records/statistics?period=${period}`);
      console.log('Statistics API response:', response.data);
      return response.data;
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // ИСПРАВЛЕНИЕ: Извлекаем данные из правильного места
  const stats = statisticsResponse?.data || [];
  console.log('Processed stats:', stats);
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

  // ИСПРАВЛЕНИЕ: Проверяем, что stats - это массив перед использованием reduce
  const totalRecords = Array.isArray(stats) ? stats.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0) : 0;
  const totalMoney = Array.isArray(stats) ? stats.reduce((sum: number, stat: any) => sum + (stat.totalMoney || 0), 0) : 0;
  const activeUsers = Array.isArray(stats) ? stats.length : 0;

  if (error) {
    console.error('Statistics error:', error);
    return (
      <Box p={3}>
        <Alert 
          severity="error"
          action={
            <ToggleButton 
              value="retry" 
              onClick={() => refetch()}
              size="small"
            >
              Повторить
            </ToggleButton>
          }
        >
          Ошибка загрузки статистики: {error?.message || 'Неизвестная ошибка'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Заголовок и переключатель периодов */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">
          Статистика активности {periodLabels[period]}
        </Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, value) => value && setPeriod(value)}
          size="small"
        >
          <ToggleButton value="daily">{periodTitles.daily}</ToggleButton>
          <ToggleButton value="weekly">{periodTitles.weekly}</ToggleButton>
          <ToggleButton value="monthly">{periodTitles.monthly}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Общая статистика */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={3} 
        sx={{ mb: 3 }}
      >
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonIcon color="primary" />
                <Box>
                  <Typography variant="h6">{activeUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных пользователей
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUpIcon color="success" />
                <Box>
                  <Typography variant="h6">{totalRecords}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего записей
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MoneyIcon color="warning" />
                <Box>
                  <Typography variant="h6">
                    {totalMoney.toLocaleString('ru-RU')} ₽
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Общая сумма
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Детальная таблица */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Детальная статистика по пользователям
          </Typography>
          
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>№</TableCell>
                    <TableCell>Пользователь</TableCell>
                    <TableCell align="right">Количество записей</TableCell>
                    <TableCell align="right">Сумма (₽)</TableCell>
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
                    stats.map((stat: any, index: number) => (
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
                          {stat.count > 0 ? (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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

      {/* ДОБАВЛЕНО: Отладочная информация (можно убрать в продакшене) */}
      {import.meta.env.DEV && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Debug: Raw response type: {typeof statisticsResponse}, Array check: {Array.isArray(stats) ? 'true' : 'false'}
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