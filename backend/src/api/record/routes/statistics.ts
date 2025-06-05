/**
 * Кастомные роуты для статистики и экспорта
 * Файл: backend/src/api/record/routes/statistics.ts
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/records/statistics',
      handler: 'record.statistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/records/export',
      handler: 'record.export',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};