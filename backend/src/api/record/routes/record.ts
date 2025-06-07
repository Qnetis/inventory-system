/**
 * record router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::record.record', {
  config: {
    find: {
      policies: [],
      middlewares: [], // Убираем middleware, логика теперь в контроллере
    },
    findOne: {
      policies: [],
      middlewares: [], // Убираем middleware
    },
    create: {
      policies: [],
      middlewares: [], // Убираем middleware
    },
    update: {
      policies: [],
      middlewares: [], // Убираем middleware - логика в контроллере
    },
    delete: {
      policies: [],
      middlewares: [], // Убираем middleware - логика в контроллере
    },
  },
});