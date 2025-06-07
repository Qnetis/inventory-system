// backend/src/api/record/middlewares/record-ownership.js
'use strict';

/**
 * Middleware для проверки прав владельца записи
 * Позволяет редактировать запись только владельцу или администратору
 */
module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const { id } = ctx.params;
    const user = ctx.state.user;

    // Если пользователь не авторизован
    if (!user) {
      return ctx.forbidden('You must be authenticated to perform this action');
    }

    // Администраторы могут редактировать любые записи
    if (user.role?.type === 'admin' || user.role?.name === 'Admin') {
      return next();
    }

    // Для методов создания записи пропускаем проверку
    if (ctx.request.method === 'POST' && !id) {
      return next();
    }

    // Для GET запросов проверяем права на просмотр
    if (ctx.request.method === 'GET') {
      // Если запрос списка записей
      if (!id) {
        // Добавляем фильтр для показа только записей пользователя
        if (!ctx.query.filters) {
          ctx.query.filters = {};
        }
        
        // Если не администратор и нет параметра showAll
        if (!ctx.query.showAll) {
          ctx.query.filters.created_by = user.id;
        }
        
        return next();
      }
      
      // Если запрос конкретной записи
      const record = await strapi.entityService.findOne('api::record.record', id, {
        populate: ['created_by'],
      });

      if (!record) {
        return ctx.notFound('Record not found');
      }

      // Проверяем, является ли пользователь владельцем
      if (record.created_by?.id !== user.id) {
        return ctx.forbidden('You are not allowed to view this record');
      }

      return next();
    }

    // Для методов изменения (PUT, DELETE) проверяем владельца
    if (['PUT', 'DELETE'].includes(ctx.request.method) && id) {
      const record = await strapi.entityService.findOne('api::record.record', id, {
        populate: ['created_by'],
      });

      if (!record) {
        return ctx.notFound('Record not found');
      }

      // Проверяем, является ли пользователь владельцем записи
      if (record.created_by?.id !== user.id) {
        return ctx.forbidden('You are not allowed to modify this record');
      }
    }

    await next();
  };
};

// backend/src/api/record/routes/record.js
'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::record.record', {
  config: {
    find: {
      middlewares: ['api::record.record-ownership'],
    },
    findOne: {
      middlewares: ['api::record.record-ownership'],
    },
    create: {
      middlewares: ['api::record.record-ownership'],
    },
    update: {
      middlewares: ['api::record.record-ownership'],
    },
    delete: {
      middlewares: ['api::record.record-ownership'],
    },
  },
});

// backend/src/api/record/controllers/record.js
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::record.record', ({ strapi }) => ({
  // Переопределяем метод create для автоматического добавления created_by
  async create(ctx) {
    const user = ctx.state.user;
    
    // Добавляем created_by в данные
    ctx.request.body.data = {
      ...ctx.request.body.data,
      created_by: user.id,
    };

    // Вызываем стандартный метод создания
    const response = await super.create(ctx);
    return response;
  },

  // Метод для получения записей с дополнительной информацией
  async find(ctx) {
    const user = ctx.state.user;
    const { showAll } = ctx.query;
    
    // Удаляем showAll из query, чтобы не передавать его в запрос
    delete ctx.query.showAll;
    
    // Добавляем populate для получения информации о создателе
    ctx.query = {
      ...ctx.query,
      populate: {
        ...ctx.query.populate,
        created_by: {
          fields: ['id', 'username', 'email'],
        },
        fields: true,
      },
    };

    // Если пользователь не администратор и не запрашивает все записи
    if (user.role?.type !== 'admin' && !showAll) {
      if (!ctx.query.filters) {
        ctx.query.filters = {};
      }
      ctx.query.filters.created_by = user.id;
    }

    const response = await super.find(ctx);
    
    // Добавляем информацию о правах редактирования
    if (response.data && Array.isArray(response.data)) {
      response.data = response.data.map(record => ({
        ...record,
        attributes: {
          ...record.attributes,
          canEdit: record.attributes.created_by?.data?.id === user.id || user.role?.type === 'admin',
          isOwner: record.attributes.created_by?.data?.id === user.id,
        },
      }));
    }

    return response;
  },

  // Метод для получения одной записи с проверкой прав
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    // Добавляем populate
    ctx.query = {
      ...ctx.query,
      populate: {
        ...ctx.query.populate,
        created_by: {
          fields: ['id', 'username', 'email'],
        },
        fields: true,
      },
    };

    const response = await super.findOne(ctx);

    if (response.data) {
      const record = response.data;
      
      // Проверяем права доступа
      const isOwner = record.attributes.created_by?.data?.id === user.id;
      const isAdmin = user.role?.type === 'admin';
      
      if (!isOwner && !isAdmin) {
        return ctx.forbidden('You are not allowed to view this record');
      }

      // Добавляем информацию о правах
      response.data = {
        ...record,
        attributes: {
          ...record.attributes,
          canEdit: isOwner || isAdmin,
          isOwner: isOwner,
        },
      };
    }

    return response;
  },

  // Метод для статистики пользователя
  async getUserStatistics(ctx) {
    const user = ctx.state.user;
    const { period } = ctx.query; // 'day', 'week', 'month'
    
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return ctx.badRequest('Invalid period. Use: day, week, or month');
    }

    const records = await strapi.entityService.findMany('api::record.record', {
      filters: {
        created_by: user.id,
        createdAt: {
          $gte: startDate.toISOString(),
        },
      },
      populate: ['fields'],
    });

    // Подсчет статистики
    const stats = {
      totalRecords: records.length,
      totalAmount: 0,
      byField: {},
    };

    records.forEach(record => {
      if (record.fields) {
        record.fields.forEach(field => {
          if (field.field_type === 'money' && field.value) {
            stats.totalAmount += parseFloat(field.value) || 0;
            
            if (!stats.byField[field.field_name]) {
              stats.byField[field.field_name] = 0;
            }
            stats.byField[field.field_name] += parseFloat(field.value) || 0;
          }
        });
      }
    });

    return {
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        period: period,
        startDate: startDate.toISOString(),
        statistics: stats,
      },
    };
  },

  // Метод для администраторов - получение статистики всех пользователей
  async getAllUsersStatistics(ctx) {
    const user = ctx.state.user;
    
    // Проверяем, что пользователь администратор
    if (user.role?.type !== 'admin') {
      return ctx.forbidden('Only administrators can access this endpoint');
    }

    const { period } = ctx.query;
    
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return ctx.badRequest('Invalid period. Use: day, week, or month');
    }

    // Получаем всех пользователей
    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      fields: ['id', 'username', 'email'],
    });

    const userStatistics = [];

    for (const user of users) {
      const records = await strapi.entityService.findMany('api::record.record', {
        filters: {
          created_by: user.id,
          createdAt: {
            $gte: startDate.toISOString(),
          },
        },
        populate: ['fields'],
      });

      let totalAmount = 0;
      const amountsByField = {};

      records.forEach(record => {
        if (record.fields) {
          record.fields.forEach(field => {
            if (field.field_type === 'money' && field.value) {
              const amount = parseFloat(field.value) || 0;
              totalAmount += amount;
              
              if (!amountsByField[field.field_name]) {
                amountsByField[field.field_name] = 0;
              }
              amountsByField[field.field_name] += amount;
            }
          });
        }
      });

      userStatistics.push({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        recordsCount: records.length,
        totalAmount: totalAmount,
        amountsByField: amountsByField,
      });
    }

    // Сортируем по количеству записей
    userStatistics.sort((a, b) => b.recordsCount - a.recordsCount);

    return {
      data: {
        period: period,
        startDate: startDate.toISOString(),
        statistics: userStatistics,
      },
    };
  },
}));

// backend/src/api/record/routes/custom-record.js
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/records/my-statistics',
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
  ],
};