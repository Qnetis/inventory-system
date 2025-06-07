// backend/src/api/record/controllers/record.ts
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { v4: uuidv4 } = require('uuid');

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
      
      // Генерация уникальных идентификаторов
      const inventoryNumber = uuidv4();
      const barcode = this.generateEAN13();
      
      // Генерация имени записи если не передано
      const recordName = data.name || `Запись ${inventoryNumber.slice(0, 8)}`;
      
      // Создание записи - используем Document Service для Strapi v5
      const entity = await strapi.documents('api::record.record').create({
        data: {
          name: recordName,
          inventoryNumber,
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
        status: 'published'
      });
      
      console.log(`Found ${records.length} records`);
      
      // Добавляем информацию о правах редактирования
      const recordsWithPermissions = records.map((record: any) => ({
        ...record,
        canEdit: record.owner?.id === user.id || user.role?.type === 'admin',
        isOwner: record.owner?.id === user.id,
      }));
      
      return {
        data: recordsWithPermissions,
        meta: {}
      };
      
    } catch (error) {
      console.error('Find error:', error);
      ctx.throw(500, error.message);
    }
  },
  
  async findOne(ctx) {
    try {
      const { id: documentId } = ctx.params;
      const user = ctx.state.user;
      
      console.log('🔍 FindOne called with documentId:', documentId);
      console.log('👤 User:', user.username, 'Role:', user.role?.type);
      
      // Пытаемся найти по documentId
      let record;
      try {
        console.log('🎯 Пытаемся найти по documentId:', documentId);
        record = await strapi.documents('api::record.record').findOne({
          documentId: documentId,
          populate: ['owner'],
          status: 'published'
        });
        console.log('✅ Запись найдена по documentId:', !!record);
      } catch (error) {
        console.log('❌ Document not found by documentId, trying by id...');
        console.log('Error details:', error.message);
        
        // Если не найдено по documentId, пробуем найти по id
        const records = await strapi.documents('api::record.record').findMany({
          filters: { id: documentId },
          populate: ['owner'],
          status: 'published'
        });
        
        console.log('🔍 Поиск по id результат:', records.length, 'записей');
        if (records.length > 0) {
          record = records[0];
          console.log('✅ Запись найдена по id:', record.id, 'documentId:', record.documentId);
        }
      }
      
      if (!record) {
        console.log('❌ Record not found with any method');
        return ctx.notFound('Record not found');
      }
      
      const ownerId = record.owner?.id;
      
      // Проверяем права доступа
      if (user.role?.type !== 'admin' && ownerId !== user.id) {
        return ctx.forbidden('Access denied');
      }
      
      return {
        data: {
          ...record,
          canEdit: ownerId === user.id || user.role?.type === 'admin',
          isOwner: ownerId === user.id,
        },
        meta: {}
      };
    } catch (error) {
      console.error('FindOne error:', error);
      ctx.throw(500, error.message);
    }
  },
  
  async update(ctx) {
    try {
      const { id: documentId } = ctx.params;
      const user = ctx.state.user;
      const { data } = ctx.request.body;
      
      console.log('Update called with documentId:', documentId);
      
      // Получаем существующую запись
      let existingRecord;
      try {
        existingRecord = await strapi.documents('api::record.record').findOne({
          documentId: documentId,
          populate: ['owner'],
          status: 'published'
        });
      } catch (error) {
        // Пробуем найти по id если не найдено по documentId
        const records = await strapi.documents('api::record.record').findMany({
          filters: { id: documentId },
          populate: ['owner'],
          status: 'published'
        });
        
        if (records.length > 0) {
          existingRecord = records[0];
        }
      }
      
      if (!existingRecord) {
        return ctx.notFound('Record not found');
      }
      
      const ownerId = existingRecord.owner?.id;
      
      // Проверяем права на редактирование
      if (user.role?.type !== 'admin' && ownerId !== user.id) {
        return ctx.forbidden('You can only edit your own records');
      }
      
      // Валидация динамических полей
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        sort: { order: 'asc' },
        status: 'published'
      });
      
      const errors = [];
      for (const field of customFields) {
        if (field.isRequired && !data.dynamicData?.[field.id]) {
          errors.push(`Field "${field.name}" is required`);
        }
      }
      
      if (errors.length > 0) {
        return ctx.badRequest('Validation failed', { errors });
      }
      
      // Обновляем запись
      const updatedRecord = await strapi.documents('api::record.record').update({
        documentId: existingRecord.documentId,
        data: {
          name: data.name || existingRecord.name,
          dynamicData: data.dynamicData || existingRecord.dynamicData,
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
      const { id: documentId } = ctx.params;
      const user = ctx.state.user;
      
      console.log('Delete called with documentId:', documentId);
      
      // Получаем запись для проверки прав
      let existingRecord;
      try {
        existingRecord = await strapi.documents('api::record.record').findOne({
          documentId: documentId,
          populate: ['owner'],
          status: 'published'
        });
      } catch (error) {
        const records = await strapi.documents('api::record.record').findMany({
          filters: { id: documentId },
          populate: ['owner'],
          status: 'published'
        });
        
        if (records.length > 0) {
          existingRecord = records[0];
        }
      }
      
      if (!existingRecord) {
        return ctx.notFound('Record not found');
      }
      
      const ownerId = existingRecord.owner?.id;
      
      // Проверяем права на удаление
      if (user.role?.type !== 'admin' && ownerId !== user.id) {
        return ctx.forbidden('You can only delete your own records');
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
          startDate = new Date(now.getFullYear(), now.getMonth(), diff);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      
      // Получаем записи за период с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        filters: {
          owner: user.id,
          createdAt: { 
            $gte: startDate.toISOString() 
          }
        },
        populate: ['owner'],
        status: 'published'
      });
      
      // Получаем денежные поля
      const moneyFields = await strapi.documents('api::custom-field.custom-field').findMany({
        filters: { 
          fieldType: 'MONEY'
        },
        status: 'published'
      });
      
      let totalMoney = 0;
      
      // Считаем общую сумму по денежным полям
      for (const record of records) {
        if (record.dynamicData && moneyFields.length > 0) {
          for (const field of moneyFields) {
            const value = record.dynamicData[field.id];
            if (value && !isNaN(value)) {
              totalMoney += Number(value);
            }
          }
        }
      }
      
      ctx.body = {
        user: user.fullName || user.username,
        count: records.length,
        totalMoney: totalMoney
      };
      
    } catch (error) {
      console.error('User statistics error:', error);
      ctx.throw(500, error.message || 'Error generating user statistics');
    }
  },

  // Общий метод статистики (алиас для getAllUsersStatistics)
  async statistics(ctx) {
    return this.getAllUsersStatistics(ctx);
  },

  // Статистика для всех пользователей (только админы)
  async getAllUsersStatistics(ctx) {
    try {
      const user = ctx.state.user;
      
      if (user.role?.type !== 'admin') {
        return ctx.forbidden('Only administrators can access this endpoint');
      }
      
      const { period = 'daily' } = ctx.query;
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'weekly':
          const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
          startDate = new Date(now.getFullYear(), now.getMonth(), diff);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      
      // Получаем записи за период с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        filters: {
          createdAt: { 
            $gte: startDate.toISOString() 
          }
        },
        populate: ['owner'],
        status: 'published'
      });
      
      // Получаем денежные поля
      const moneyFields = await strapi.documents('api::custom-field.custom-field').findMany({
        filters: { 
          fieldType: 'MONEY'
        },
        status: 'published'
      });
      
      // Группируем по пользователям
      const userStats: { [key: string]: UserStatistic } = {};
      
      for (const record of records) {
        const userId = record.owner?.id;
        const userName = record.owner?.fullName || record.owner?.username || 'Unknown';
        
        if (!userId) continue;
        
        if (!userStats[userId]) {
          userStats[userId] = {
            user: userName,
            count: 0,
            totalMoney: 0
          };
        }
        
        userStats[userId].count++;
        
        // Считаем деньги
        if (record.dynamicData && moneyFields.length > 0) {
          for (const field of moneyFields) {
            const value = record.dynamicData[field.id];
            if (value && !isNaN(value)) {
              userStats[userId].totalMoney += Number(value);
            }
          }
        }
      }
      
      // Возвращаем массив статистики
      const stats: UserStatistic[] = Object.values(userStats);
      stats.sort((a: UserStatistic, b: UserStatistic) => b.count - a.count);
      
      ctx.body = stats;
      
    } catch (error) {
      console.error('Statistics error:', error);
      ctx.throw(500, error.message || 'Error generating statistics');
    }
  },
  
  async export(ctx) {
    try {
      const user = ctx.state.user;
      const { format = 'csv', fields = [] } = ctx.request.body;
      const { showAll } = ctx.query;
      
      // ИСПРАВЛЕНИЕ: Правильно парсим boolean из строки
      const showAllBool = showAll === 'true' || showAll === true;
      
      console.log('Export - User:', user.username, 'Role:', user.role?.type, 'showAll:', showAll, 'parsed:', showAllBool);
      
      // Определяем фильтры на основе прав пользователя
      let filters: any = {};
      
      // ИСПРАВЛЕНИЕ: Применяем ту же логику что и в find - любой пользователь может видеть все записи
      if (showAllBool) {
        // Если showAll = true, экспортируем все записи (без фильтра) для любого пользователя
        console.log('Export: Пользователь просит все записи, фильтр не применяем');
      } else {
        // Если showAll = false, экспортируем только записи текущего пользователя
        filters.owner = user.id;
        console.log('Export: Пользователь просит только свои записи, применяем фильтр по owner:', user.id);
      }
      
      // Получаем все записи с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        filters,
        populate: ['owner'],
        status: 'published'
      });
      
      // Здесь должна быть логика экспорта в CSV/Excel
      // Пока возвращаем простой ответ
      ctx.body = {
        message: 'Export functionality to be implemented',
        recordsCount: records.length,
        format,
        fields
      };
      
    } catch (error) {
      console.error('Export error:', error);
      ctx.throw(500, error.message || 'Error exporting data');
    }
  }
}));