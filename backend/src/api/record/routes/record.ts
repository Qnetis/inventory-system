/**
 * record router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::record.record', {
  config: {
    find: {
      policies: [],
      middlewares: [],
    },
    findOne: {
      policies: [],
      middlewares: [],
    },
    create: {
      policies: [],
      middlewares: [],
    },
    update: {
      policies: [],
      middlewares: [],
    },
    delete: {
      policies: [],
      middlewares: [],
    },
  },
});

// Добавляем кастомные роуты
export const customRoutes = {
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