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
  
  // ИСПРАВЛЕНИЕ: Полностью переписанный findOne с правильным логированием
  async findOne(ctx) {
    try {
      const { id: requestedId } = ctx.params;
      const user = ctx.state.user;
      
      console.log('🔍 FindOne called with ID:', requestedId);
      console.log('👤 User:', user.username, 'Role:', user.role?.type);
      
      let record = null;
      let searchMethod = '';
      
      // Сначала пытаемся найти по documentId
      try {
        console.log('🎯 Пытаемся найти по documentId:', requestedId);
        record = await strapi.documents('api::record.record').findOne({
          documentId: requestedId,
          populate: ['owner'],
          status: 'published'
        });
        
        if (record) {
          searchMethod = 'documentId';
          console.log('✅ Запись найдена по documentId. ID:', record.id, 'DocumentId:', record.documentId);
        } else {
          console.log('❌ Запись не найдена по documentId');
        }
      } catch (error) {
        console.log('💥 Ошибка поиска по documentId:', error.message);
      }
      
      // Если не найдено по documentId, пробуем найти по обычному id
      if (!record) {
        try {
          console.log('🔄 Пытаемся найти по обычному id:', requestedId);
          const records = await strapi.documents('api::record.record').findMany({
            filters: { id: requestedId },
            populate: ['owner'],
            status: 'published'
          });
          
          console.log('🔍 Поиск по id результат:', records.length, 'записей');
          if (records.length > 0) {
            record = records[0];
            searchMethod = 'id';
            console.log('✅ Запись найдена по id. ID:', record.id, 'DocumentId:', record.documentId);
          } else {
            console.log('❌ Запись не найдена по id');
          }
        } catch (error) {
          console.log('💥 Ошибка поиска по id:', error.message);
        }
      }
      
      // Если запись все еще не найдена, пытаемся найти по любому полю
      if (!record) {
        try {
          console.log('🔄 Последняя попытка: поиск среди всех записей...');
          const allRecords = await strapi.documents('api::record.record').findMany({
            populate: ['owner'],
            status: 'published'
          });
          
          console.log('📋 Всего записей в БД:', allRecords.length);
          if (allRecords.length > 0) {
            console.log('📝 Первые 3 записи:');
            allRecords.slice(0, 3).forEach((rec, index) => {
              console.log(`   ${index + 1}. ID: ${rec.id}, DocumentId: ${rec.documentId}, Inventory: ${rec.inventoryNumber}`);
            });
          }
          
          // Пытаемся найти точно по ID
          const foundRecord = allRecords.find(rec => 
            rec.id == requestedId || 
            rec.documentId == requestedId
          );
          
          if (foundRecord) {
            record = foundRecord;
            searchMethod = 'brute_force';
            console.log('✅ Запись найдена перебором! ID:', record.id, 'DocumentId:', record.documentId);
          } else {
            console.log('❌ Запись не найдена даже перебором');
          }
        } catch (error) {
          console.log('💥 Ошибка поиска перебором:', error.message);
        }
      }
      
      if (!record) {
        console.log('🚫 ИТОГ: Запись с ID', requestedId, 'не найдена никаким способом');
        return ctx.notFound('Record not found');
      }
      
      console.log('🎉 ИТОГ: Запись найдена методом', searchMethod);
      
      const ownerId = record.owner?.id;
      console.log('👤 Владелец записи ID:', ownerId);
      console.log('👤 Текущий пользователь ID:', user.id);
      
      // Проверяем права доступа
      if (user.role?.type !== 'admin' && ownerId !== user.id) {
        console.log('🚫 Отказано в доступе: пользователь не админ и не владелец');
        return ctx.forbidden('Access denied');
      }
      
      console.log('✅ Доступ разрешен');
      
      return {
        data: {
          ...record,
          canEdit: ownerId === user.id || user.role?.type === 'admin',
          isOwner: ownerId === user.id,
        },
        meta: {}
      };
    } catch (error) {
      console.error('💥 FindOne general error:', error);
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
        default:
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
        const userId = record.owner?.id;
        const userName = record.owner?.username || record.owner?.email || 'Unknown';
        
        if (!userStats[userId]) {
          userStats[userId] = {
            user: userName,
            count: 0,
            totalMoney: 0,
          };
        }
        
        userStats[userId].count += 1;
        
        if (record.dynamicData) {
          customFields.forEach((field: any) => {
            const value = record.dynamicData[field.id];
            if (value && !isNaN(parseFloat(value))) {
              userStats[userId].totalMoney += parseFloat(value);
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

  // Экспорт данных
  async export(ctx) {
    try {
      const user = ctx.state.user;
      const { format = 'csv', fields: selectedFields, showAll } = ctx.request.body;
      
      console.log('Export request:', { format, selectedFields, showAll });
      
      let filters: any = {};
      
      if (!showAll || user.role?.type !== 'admin') {
        filters.owner = user.id;
      }
      
      const records = await strapi.documents('api::record.record').findMany({
        filters,
        populate: ['owner'],
        status: 'published'
      });
      
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        status: 'published'
      });
      
      const headers = ['inventoryNumber', 'barcode', 'name', 'createdAt', 'owner'];
      
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
            record.inventoryNumber || '',
            record.barcode || '',
            record.name || '',
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

  // ДОБАВЛЕНО: Общий метод статистики (алиас для getAllUsersStatistics)
  async statistics(ctx) {
    return this.getAllUsersStatistics(ctx);
  },

}));