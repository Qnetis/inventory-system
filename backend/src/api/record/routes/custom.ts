/**
 * Кастомные роуты для статистики и экспорта
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
      method: 'GET',
      path: '/records/user-statistics',
      handler: 'record.getUserStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/records/all-statistics',
      handler: 'record.getAllUsersStatistics',
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