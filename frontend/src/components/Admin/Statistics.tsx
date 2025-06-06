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
  Grid,
  Chip,
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

  const { data: stats = [], isLoading, error, refetch } = useQuery({
    queryKey: ['statistics', period],
    queryFn: async () => {
      console.log('Fetching statistics for period:', period);
      const { data } = await api.get(`/api/records/statistics?period=${period}`);
      console.log('Statistics response:', data);
      return data || [];
    },
    retry: 2,
    refetchOnWindowFocus: false,
  });

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

  // Подсчитываем общую статистику
  const totalRecords = stats.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0);
  const totalMoney = stats.reduce((sum: number, stat: any) => sum + (stat.totalMoney || 0), 0);
  const activeUsers = stats.length;

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
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
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
        </Grid>
        <Grid item xs={12} sm={4}>
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
        </Grid>
        <Grid item xs={12} sm={4}>
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
        </Grid>
      </Grid>

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
                  {stats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Box py={4}>
                          <Typography variant="body1" color="text.secondary">
                            Нет данных за выбранный период
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Попробуйте выбрать другой период или проверьте, есть ли записи в системе
                          </Typography>
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
      {stats.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Последнее обновление: {new Date().toLocaleString('ru-RU')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Statistics;