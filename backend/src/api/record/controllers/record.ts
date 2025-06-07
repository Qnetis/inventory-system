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
      
      console.log('Find records - User:', user.username, 'showAll:', showAll);
      
      // Для обычных пользователей добавляем фильтр по владельцу
      let filters: any = {};
      
      // Если пользователь НЕ администратор И НЕ запрашивает все записи
      if (user.role?.type !== 'admin' && !showAll) {
        filters.owner = user.id;
      }
      
      // Получаем записи с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        filters,
        populate: ['owner'],
        status: 'published'
      });
      
      // Добавляем информацию о правах редактирования
      const recordsWithPermissions = records.map(record => ({
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
      
      console.log('FindOne called with documentId:', documentId);
      
      // Пытаемся найти по documentId
      let record;
      try {
        record = await strapi.documents('api::record.record').findOne({
          documentId: documentId,
          populate: ['owner'],
          status: 'published'
        });
      } catch (error) {
        console.log('Document not found by documentId, trying by id...');
        
        // Если не найдено по documentId, пробуем найти по id
        const records = await strapi.documents('api::record.record').findMany({
          filters: { id: documentId },
          populate: ['owner'],
          status: 'published'
        });
        
        if (records.length > 0) {
          record = records[0];
        }
      }
      
      if (!record) {
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
      const userStats = {};
      
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
      stats.sort((a, b) => b.count - a.count);
      
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
      
      // Определяем фильтры на основе прав пользователя
      let filters: any = {};
      
      // Если пользователь НЕ администратор И НЕ запрашивает все записи
      if (user.role?.type !== 'admin' && !showAll) {
        filters.owner = user.id;
      }
      
      // Получаем все записи с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        filters,
        populate: ['owner'],
        status: 'published'
      });
      
      // Получаем кастомные поля
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        sort: { order: 'asc' },
        status: 'published'
      });
      
      // Генерируем CSV
      const headers = ['Инвентарный номер', 'Штрихкод', 'Название', 'Дата создания', 'Владелец'];
      
      // Добавляем кастомные поля в заголовки
      if (fields.length === 0) {
        // Если поля не выбраны, экспортируем все
        customFields.forEach(field => {
          headers.push(field.name);
        });
      } else {
        // Экспортируем только выбранные поля
        fields.forEach(fieldId => {
          const field = customFields.find(f => f.id === fieldId);
          if (field) {
            headers.push(field.name);
          }
        });
      }
      
      let csvContent = headers.join(',') + '\n';
      
      // Добавляем данные
      records.forEach(record => {
        const row = [
          `"${record.inventoryNumber || ''}"`,
          `"${record.barcode || ''}"`,
          `"${record.name || ''}"`,
          `"${new Date(record.createdAt).toLocaleDateString('ru-RU')}"`,
          `"${record.owner?.fullName || record.owner?.username || ''}"`
        ];
        
        // Добавляем значения кастомных полей
        const fieldsToExport = fields.length === 0 ? customFields : 
          fields.map(fieldId => customFields.find(f => f.id === fieldId)).filter(Boolean);
        
        fieldsToExport.forEach(field => {
          const value = record.dynamicData?.[field.id] || '';
          
          // Форматирование значений
          let formattedValue = '';
          if (field.fieldType === 'MONEY' && value) {
            formattedValue = new Intl.NumberFormat('ru-RU').format(parseFloat(value));
          } else if (field.fieldType === 'CHECKBOX') {
            formattedValue = value ? 'Да' : 'Нет';
          } else {
            formattedValue = String(value);
          }
          
          row.push(`"${formattedValue}"`);
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      // Устанавливаем заголовки для скачивания файла
      const fileName = `export_${new Date().toISOString().split('T')[0]}.${format}`;
      
      ctx.set('Content-Type', 'text/csv; charset=utf-8');
      ctx.set('Content-Disposition', `attachment; filename="${fileName}"`);
      
      ctx.body = csvContent;
      
    } catch (error) {
      console.error('Export error:', error);
      ctx.throw(500, 'Export failed');
    }
  }
}));