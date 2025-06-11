// backend/src/api/record/controllers/record.ts
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

interface UserStatistic {
  user: string;
  count: number;
  totalMoney: number;
}

module.exports = createCoreController('api::record.record', ({ strapi }) => ({
  
  async create(ctx) {
    try {
      const { data } = ctx.request.body;
      const user = ctx.state.user;
      
      console.log('Create request data:', data);
      console.log('User:', user);
      
      // Генерация уникального штрихкода
      const barcode = this.generateEAN13();
      
      // Генерация имени записи если не передано (используем штрихкод)
      const recordName = data.name || `Запись ${barcode.slice(0, 8)}`;
      
      // Создание записи - используем Document Service для Strapi v5
      const entity = await strapi.documents('api::record.record').create({
        data: {
          name: recordName,
          barcode,
          dynamicData: data.dynamicData || {},
          owner: user.id,
        },
        status: 'published' // Сразу публикуем запись
      });
      
      // Получаем созданную запись с populate
      const populatedEntity = await strapi.documents('api::record.record').findOne({
        documentId: entity.documentId,
        populate: ['owner'],
        status: 'published'
      });
      
      return {
        data: populatedEntity,
        meta: {}
      };
      
    } catch (error) {
      console.error('Create error:', error);
      ctx.throw(500, error.message);
    }
  },
  
  async find(ctx) {
    try {
      const user = ctx.state.user;
      const { showAll } = ctx.query;
      
      // ИСПРАВЛЕНИЕ: Правильно парсим boolean из строки
      const showAllBool = showAll === 'true' || showAll === true;
      
      console.log('Find records - User:', user.username, 'Role:', user.role?.type, 'showAll:', showAll, 'parsed:', showAllBool);
      
      // Определяем фильтры на основе прав пользователя и параметра showAll
      let filters: any = {};
      
      // ИСПРАВЛЕНИЕ: Новая логика - любой пользователь может видеть все записи при showAll=true
      if (showAllBool) {
        // Если showAll = true, показываем все записи (без фильтра) для любого пользователя
        console.log('Пользователь просит все записи, фильтр не применяем');
      } else {
        // Если showAll = false, показываем только записи текущего пользователя
        filters.owner = user.id;
        console.log('Пользователь просит только свои записи, применяем фильтр по owner:', user.id);
      }
      
      console.log('Applied filters:', filters);
      
      // Получаем записи с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        filters,
        populate: ['owner'],
        sort: ['createdAt:desc'],
        status: 'published'
      });
      
      console.log(`Found ${records.length} records for user ${user.username}`);
      
      return {
        data: records,
        meta: {
          pagination: {
            page: 1,
            pageSize: records.length,
            pageCount: 1,
            total: records.length
          }
        }
      };
      
    } catch (error) {
      console.error('Find error:', error);
      ctx.throw(500, error.message);
    }
  },

  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;
      
      console.log('FindOne record - ID:', id, 'User:', user.username);
      
      // Получаем запись с populate
      const record = await strapi.documents('api::record.record').findOne({
        documentId: id,
        populate: ['owner'],
        status: 'published'
      });
      
      if (!record) {
        return ctx.notFound('Record not found');
      }
      
      // Проверяем права доступа
      const isOwner = record.owner?.id === user.id || record.owner === user.id;
      const isAdmin = user.role?.type === 'admin';
      
      console.log('Access check - isOwner:', isOwner, 'isAdmin:', isAdmin);
      
      if (!isOwner && !isAdmin) {
        return ctx.forbidden('Access denied. You can only view your own records.');
      }
      
      return {
        data: record,
        meta: {}
      };
      
    } catch (error) {
      console.error('FindOne error:', error);
      ctx.throw(500, error.message);
    }
  },

  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      const user = ctx.state.user;
      
      console.log('Update record - ID:', id, 'Data:', data, 'User:', user.username);
      
      // Получаем существующую запись
      const existingRecord = await strapi.documents('api::record.record').findOne({
        documentId: id,
        populate: ['owner'],
        status: 'published'
      });
      
      if (!existingRecord) {
        return ctx.notFound('Record not found');
      }
      
      // Проверяем права доступа
      const isOwner = existingRecord.owner?.id === user.id || existingRecord.owner === user.id;
      const isAdmin = user.role?.type === 'admin';
      
      console.log('Update access check - isOwner:', isOwner, 'isAdmin:', isAdmin);
      
      if (!isOwner && !isAdmin) {
        return ctx.forbidden('Access denied. You can only edit your own records.');
      }
      
      // Обновляем запись
      const updatedRecord = await strapi.documents('api::record.record').update({
        documentId: id,
        data: {
          name: data.name,
          dynamicData: data.dynamicData,
          // barcode не изменяется после создания
        },
        status: 'published'
      });
      
      // Получаем обновленную запись с populate
      const populatedRecord = await strapi.documents('api::record.record').findOne({
        documentId: updatedRecord.documentId,
        populate: ['owner'],
        status: 'published'
      });
      
      return {
        data: populatedRecord,
        meta: {}
      };
      
    } catch (error) {
      console.error('Update error:', error);
      ctx.throw(500, error.message);
    }
  },

  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const user = ctx.state.user;
      
      console.log('Delete record - ID:', id, 'User:', user.username);
      
      // Получаем существующую запись
      const existingRecord = await strapi.documents('api::record.record').findOne({
        documentId: id,
        populate: ['owner'],
        status: 'published'
      });
      
      if (!existingRecord) {
        return ctx.notFound('Record not found');
      }
      
      // Проверяем права доступа
      const isOwner = existingRecord.owner?.id === user.id || existingRecord.owner === user.id;
      const isAdmin = user.role?.type === 'admin';
      
      console.log('Delete access check - isOwner:', isOwner, 'isAdmin:', isAdmin);
      
      if (!isOwner && !isAdmin) {
        return ctx.forbidden('Access denied. You can only delete your own records.');
      }
      
      // Удаляем запись
      await strapi.documents('api::record.record').delete({
        documentId: existingRecord.documentId,
      });
      
      return { data: null, meta: {} };
      
    } catch (error) {
      console.error('Delete error:', error);
      ctx.throw(500, error.message);
    }
  },

  // Генерация EAN-13 штрихкода
  generateEAN13() {
    // Генерируем 12 случайных цифр
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    // Вычисляем контрольную сумму
    let oddSum = 0;
    let evenSum = 0;
    
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) {
        oddSum += parseInt(code[i]);
      } else {
        evenSum += parseInt(code[i]);
      }
    }
    
    const checksum = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
    
    return code + checksum;
  },

  // Статистика для текущего пользователя
  async getUserStatistics(ctx) {
    try {
      const user = ctx.state.user;
      const { period = 'daily' } = ctx.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'weekly':
          const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default: // daily
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }

      const records = await strapi.documents('api::record.record').findMany({
        filters: {
          owner: user.id,
          createdAt: {
            $gte: startDate.toISOString(),
          },
        },
        status: 'published'
      });

      // Получаем пользовательские поля для расчета сумм
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        filters: { fieldType: 'MONEY' },
        status: 'published'
      });

      let totalMoney = 0;
      records.forEach((record: any) => {
        if (record.dynamicData) {
          customFields.forEach((field: any) => {
            const value = record.dynamicData[field.id];
            if (value && !isNaN(parseFloat(value))) {
              totalMoney += parseFloat(value);
            }
          });
        }
      });

      return {
        data: {
          user: user.username || user.email,
          count: records.length,
          totalMoney,
          period,
        },
        meta: {}
      };

    } catch (error) {
      console.error('Get user statistics error:', error);
      ctx.throw(500, error.message);
    }
  },

  // Статистика для всех пользователей (только для админов)
  async getAllUsersStatistics(ctx) {
    try {
      const user = ctx.state.user;
      
      if (user.role?.type !== 'admin') {
        return ctx.forbidden('Access denied. Admin role required.');
      }
      
      const { period = 'daily' } = ctx.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'weekly':
          const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default: // daily
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }

      const records = await strapi.documents('api::record.record').findMany({
        filters: {
          createdAt: {
            $gte: startDate.toISOString(),
          },
        },
        populate: ['owner'],
        status: 'published'
      });

      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        filters: { fieldType: 'MONEY' },
        status: 'published'
      });

      const userStats: { [key: string]: UserStatistic } = {};

      records.forEach((record: any) => {
        const username = record.owner?.username || record.owner?.email || 'Неизвестен';
        
        if (!userStats[username]) {
          userStats[username] = {
            user: username,
            count: 0,
            totalMoney: 0
          };
        }
        
        userStats[username].count++;
        
        if (record.dynamicData) {
          customFields.forEach((field: any) => {
            const value = record.dynamicData[field.id];
            if (value && !isNaN(parseFloat(value))) {
              userStats[username].totalMoney += parseFloat(value);
            }
          });
        }
      });

      return {
        data: Object.values(userStats),
        meta: { period }
      };

    } catch (error) {
      console.error('Get all users statistics error:', error);
      ctx.throw(500, error.message);
    }
  },

  // Экспорт данных (обновлено без inventoryNumber)
  async export(ctx) {
    try {
      const { format = 'csv', selectedFields } = ctx.request.body;
      
      const records = await strapi.documents('api::record.record').findMany({
        populate: ['owner'],
        status: 'published'
      });
      
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        status: 'published'
      });
      
      // Обновленные заголовки без inventoryNumber
const headers = ['barcode', 'createdAt', 'owner'];
      
      if (selectedFields && selectedFields.length > 0) {
        selectedFields.forEach((fieldId: string) => {
          const field = customFields.find((f: any) => f.id === fieldId);
          if (field) {
            headers.push(field.name);
          }
        });
      }
      
      let output = '';
      
      if (format === 'csv') {
        output = headers.join(',') + '\n';
        
        records.forEach((record: any) => {
const row = [
  record.barcode || '',
  record.createdAt || '',
  record.owner?.username || record.owner?.email || ''
];
          
          if (selectedFields && selectedFields.length > 0) {
            selectedFields.forEach((fieldId: string) => {
              const value = record.dynamicData?.[fieldId] || '';
              row.push(String(value));
            });
          }
          
          output += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', 'attachment; filename="records.csv"');
      }
      
      ctx.body = output;
      
    } catch (error) {
      console.error('Export error:', error);
      ctx.throw(500, error.message);
    }
  },

  // Алиас для getAllUsersStatistics (для совместимости с роутом)
  async statistics(ctx) {
    return this.getAllUsersStatistics(ctx);
  },

}));