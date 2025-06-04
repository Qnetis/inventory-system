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
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const Statistics: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const { data: stats = [], isLoading, error } = useQuery({
    queryKey: ['statistics', period],
    queryFn: async () => {
      const { data } = await api.get(`/api/records/statistics?period=${period}`);
      return data;
    },
    retry: 1,
  });

  const periodLabels = {
    daily: 'За день',
    weekly: 'За неделю',
    monthly: 'За месяц',
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Ошибка загрузки статистики. Убедитесь, что у вас есть права администратора.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Статистика активности {periodLabels[period]}
          </Typography>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, value) => value && setPeriod(value)}
            size="small"
          >
            <ToggleButton value="daily">{periodLabels.daily}</ToggleButton>
            <ToggleButton value="weekly">{periodLabels.weekly}</ToggleButton>
            <ToggleButton value="monthly">{periodLabels.monthly}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Пользователь</TableCell>
                  <TableCell align="right">Кол-во добавленных позиций</TableCell>
                  <TableCell align="right">Сумма (по денежным полям)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Нет данных за выбранный период
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.map((stat: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{stat.user}</TableCell>
                      <TableCell align="right">{stat.count}</TableCell>
                      <TableCell align="right">
                        {stat.totalMoney.toLocaleString('ru-RU')} ₽
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default Statistics;