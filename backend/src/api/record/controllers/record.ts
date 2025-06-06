// src/api/record/controllers/record.js
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
      
      // Создание записи - простой способ для Strapi v5
      const entity = await strapi.entityService.create('api::record.record', {
        data: {
          name: recordName,
          inventoryNumber,
          barcode,
          dynamicData: data.dynamicData || {},
          owner: user.id, // Просто ID пользователя
          publishedAt: new Date()
        }
      });
      
      // Получаем созданную запись с populate
      const populatedEntity = await strapi.entityService.findOne('api::record.record', entity.id, {
        populate: ['owner']
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
      
      // Для обычных пользователей добавляем фильтр по владельцу
      if (user.role?.type !== 'admin') {
        // Правильный формат фильтра для Strapi v5
        if (!ctx.query.filters) {
          ctx.query.filters = {};
        }
        ctx.query.filters.owner = user.id;
      }
      
      // Устанавливаем populate если не задан
      if (!ctx.query.populate) {
        ctx.query.populate = ['owner'];
      }
      
      // Вызываем родительский метод find
      const response = await super.find(ctx);
      
      return response;
    } catch (error) {
      console.error('Find error:', error);
      ctx.throw(500, error.message);
    }
  },
  
  async findOne(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Вызываем родительский метод findOne
    const response = await super.findOne(ctx);
    
    if (!response || !response.data) {
      return ctx.notFound('Record not found');
    }
    
    const record = response.data;
    const ownerId = record.attributes?.owner?.data?.id || record.owner?.id;
    
    // Проверяем права доступа
    if (user.role?.type !== 'admin' && ownerId !== user.id) {
      return ctx.forbidden('Access denied');
    }
    
    return response;
  },
  
  async update(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    const { data } = ctx.request.body;
    
    // Получаем существующую запись
    const existingEntity = await strapi.entityService.findOne('api::record.record', id, {
      populate: ['owner']
    });
    
    if (!existingEntity) {
      return ctx.notFound('Record not found');
    }
    
    const ownerId = existingEntity.owner?.id;
    
    // Проверяем права на редактирование
    if (user.role?.type !== 'admin' && ownerId !== user.id) {
      return ctx.forbidden('You can only edit your own records');
    }
    
    // Валидация динамических полей
    const customFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
      sort: { order: 'asc' },
      filters: { publishedAt: { $notNull: true } }
    });
    
    const errors = [];
    for (const field of customFields) {
      if (field.isRequired && !data.dynamicData?.[field.id]) {
        errors.push(`Поле "${field.name}" обязательно для заполнения`);
      }
    }
    
    if (errors.length > 0) {
      return ctx.badRequest('Validation failed', { errors });
    }
    
    // Обновляем запись
    const entity = await strapi.entityService.update('api::record.record', id, {
      data: {
        name: data.name || existingEntity.name,
        dynamicData: data.dynamicData || existingEntity.dynamicData
      },
      populate: ['owner']
    });
    
    return {
      data: entity,
      meta: {}
    };
  },
  
  async delete(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Получаем запись для проверки прав
    const entity = await strapi.entityService.findOne('api::record.record', id, {
      populate: ['owner']
    });
    
    if (!entity) {
      return ctx.notFound('Record not found');
    }
    
    const ownerId = entity.owner?.id;
    
    // Проверяем права на удаление
    if (user.role?.type !== 'admin' && ownerId !== user.id) {
      return ctx.forbidden('You can only delete your own records');
    }
    
    // Вызываем родительский метод delete
    return super.delete(ctx);
  },
  
  // Дополнительные методы
  
  // Замените метод statistics в backend/src/api/record/controllers/record.ts

async statistics(ctx) {
  try {
    console.log("=== Statistics endpoint called ===");
    const { period = 'daily' } = ctx.query;
    console.log("Period:", period);

    // Определяем начальную и конечную дату
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'daily':
        // С начала текущего дня
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'weekly':
        // С начала недели (понедельник)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        endDate = new Date(now);
        break;
      case 'monthly':
        // С начала месяца
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
    
    console.log("Date range:", startDate.toISOString(), "to", endDate.toISOString());
    
    // Получаем записи за период
    const records = await strapi.entityService.findMany('api::record.record', {
      filters: {
        createdAt: { 
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        },
        publishedAt: {
          $notNull: true
        }
      },
      populate: {
        owner: {
          fields: ['id', 'username', 'fullName', 'email']
        }
      },
      pagination: {
        limit: -1 // Получаем все записи
      }
    });
    
    console.log("Found records:", records?.length || 0);
    
    // Получаем денежные поля для подсчета сумм
    const moneyFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
      filters: { 
        fieldType: 'MONEY',
        publishedAt: {
          $notNull: true
        }
      },
      pagination: {
        limit: -1
      }
    });
    
    console.log("Money fields found:", moneyFields?.length || 0);
    
    // Группируем записи по пользователям
    const userStats = new Map();
    
    if (records && records.length > 0) {
      for (const record of records) {
        const owner = record.owner;
        
        if (!owner || !owner.id) {
          console.log("Record without owner:", record.id);
          continue;
        }
        
        const userId = owner.id.toString();
        const userName = owner.fullName || owner.username || owner.email || `User ${userId}`;
        
        // Инициализируем статистику пользователя если её нет
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            user: userName,
            userId: userId,
            count: 0,
            totalMoney: 0
          });
        }
        
        // Увеличиваем счетчик записей
        const stats = userStats.get(userId);
        stats.count++;
        
        // Считаем деньги из динамических полей
        if (record.dynamicData && moneyFields.length > 0) {
          for (const field of moneyFields) {
            const fieldValue = record.dynamicData[field.id];
            if (fieldValue !== null && fieldValue !== undefined && !isNaN(fieldValue)) {
              const moneyValue = Number(fieldValue);
              if (moneyValue > 0) {
                stats.totalMoney += moneyValue;
              }
            }
          }
        }
        
        userStats.set(userId, stats);
      }
    }
    
    // Преобразуем Map в массив и сортируем
    const statsArray = Array.from(userStats.values());
    
    // Сортируем по количеству записей (убывание)
    statsArray.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      // Если количество одинаковое, сортируем по сумме
      return b.totalMoney - a.totalMoney;
    });
    
    console.log("Final statistics:", statsArray);
    
    // Если нет данных, возвращаем пустой массив
    if (statsArray.length === 0) {
      console.log("No statistics data found for period:", period);
    }
    
    // Возвращаем ответ
    ctx.body = statsArray;
    
  } catch (error) {
    console.error('Statistics error:', error);
    console.error('Error stack:', error.stack);
    ctx.throw(500, `Error generating statistics: ${error.message}`);
  }
},
  // Добавьте этот метод в контроллер для отладки

async debugStatistics(ctx) {
  try {
    console.log("=== DEBUG Statistics ===");
    
    // Проверяем все записи в системе
    const allRecords = await strapi.entityService.findMany('api::record.record', {
      populate: {
        owner: {
          fields: ['id', 'username', 'fullName', 'email']
        }
      },
      pagination: {
        limit: -1
      }
    });
    
    console.log("Total records in system:", allRecords?.length || 0);
    
    // Проверяем пользователей
    const allUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
      fields: ['id', 'username', 'fullName', 'email'],
      pagination: {
        limit: -1
      }
    });
    
    console.log("Total users in system:", allUsers?.length || 0);
    
    // Проверяем денежные поля
    const moneyFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
      filters: { 
        fieldType: 'MONEY'
      },
      pagination: {
        limit: -1
      }
    });
    
    console.log("Money fields:", moneyFields?.length || 0);
    
    // Группируем записи по дням
    const recordsByDate = {};
    
    if (allRecords) {
      for (const record of allRecords) {
        const date = new Date(record.createdAt).toISOString().split('T')[0];
        if (!recordsByDate[date]) {
          recordsByDate[date] = [];
        }
        recordsByDate[date].push({
          id: record.id,
          createdAt: record.createdAt,
          owner: record.owner ? {
            id: record.owner.id,
            name: record.owner.fullName || record.owner.username
          } : null
        });
      }
    }
    
    const debugInfo = {
      totalRecords: allRecords?.length || 0,
      totalUsers: allUsers?.length || 0,
      moneyFieldsCount: moneyFields?.length || 0,
      recordsByDate,
      users: allUsers?.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email
      })) || [],
      moneyFields: moneyFields?.map(f => ({
        id: f.id,
        name: f.name,
        fieldType: f.fieldType
      })) || []
    };
    
    ctx.body = debugInfo;
    
  } catch (error) {
    console.error('Debug statistics error:', error);
    ctx.throw(500, error.message);
  }
},
  async export(ctx) {
    try {
      const { format = 'csv', fields = [] } = ctx.request.body;
      
      // Получаем все записи
      const records = await strapi.entityService.findMany('api::record.record', {
        populate: ['owner'],
        limit: -1
      });
      
      const customFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
        sort: { order: 'asc' }
      });
      
      if (format === 'csv') {
        const csv = await this.generateCSV(records, customFields, fields);
        ctx.set('Content-Type', 'text/csv; charset=utf-8');
        ctx.set('Content-Disposition', 'attachment; filename="export.csv"');
        ctx.body = '\ufeff' + csv; // BOM для корректного отображения в Excel
      } else {
        const excel = await this.generateExcel(records, customFields, fields);
        ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        ctx.set('Content-Disposition', 'attachment; filename="export.xlsx"');
        ctx.body = excel;
      }
      
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  
  // Вспомогательные методы
  
  generateEAN13() {
    const code = Array.from({ length: 12 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return code + checkDigit;
  },
  
  async generateCSV(records, customFields, selectedFields) {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const tempFile = path.join(os.tmpdir(), `export-${Date.now()}.csv`);
    
    // Заголовки
    const headers = [
      { id: 'inventoryNumber', title: 'Инв. номер' },
      { id: 'barcode', title: 'Штрихкод' },
      { id: 'owner', title: 'Владелец' },
      { id: 'createdAt', title: 'Дата создания' }
    ];
    
    // Добавляем кастомные поля
    for (const field of customFields) {
      if (!selectedFields.length || selectedFields.includes(field.id.toString())) {
        headers.push({
          id: `field_${field.id}`,
          title: field.name
        });
      }
    }
    
    const csvWriter = createCsvWriter({
      path: tempFile,
      header: headers
    });
    
    // Данные
    const data = records.map(record => {
      const row = {
        inventoryNumber: record.inventoryNumber,
        barcode: record.barcode,
        owner: record.owner?.fullName || record.owner?.username || '',
        createdAt: new Date(record.createdAt).toLocaleString('ru-RU')
      };
      
      for (const field of customFields) {
        if (!selectedFields.length || selectedFields.includes(field.id.toString())) {
          row[`field_${field.id}`] = record.dynamicData?.[field.id] || '';
        }
      }
      
      return row;
    });
    
    await csvWriter.writeRecords(data);
    const csvContent = await fs.readFile(tempFile, 'utf-8');
    await fs.unlink(tempFile);
    
    return csvContent;
  },
  
  async generateExcel(records, customFields, selectedFields) {
    const ExcelJS = require('exceljs');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Записи');
    
    // Заголовки
    const headers = ['Инв. номер', 'Штрихкод', 'Владелец', 'Дата создания'];
    
    for (const field of customFields) {
      if (!selectedFields.length || selectedFields.includes(field.id.toString())) {
        headers.push(field.name);
      }
    }
    
    worksheet.addRow(headers);
    
    // Стиль заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Данные
    for (const record of records) {
      const row = [
        record.inventoryNumber,
        record.barcode,
        record.owner?.fullName || record.owner?.username || '',
        new Date(record.createdAt).toLocaleString('ru-RU')
      ];
      
      for (const field of customFields) {
        if (!selectedFields.length || selectedFields.includes(field.id.toString())) {
          row.push(record.dynamicData?.[field.id] || '');
        }
      }
      
      worksheet.addRow(row);
    }
    
    // Автоширина колонок
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Генерация буфера
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
  
}));