// src/api/record/controllers/record.ts
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
      
      // Для обычных пользователей добавляем фильтр по владельцу
      if (user.role?.type !== 'admin') {
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
          errors.push(`Поле "${field.name}" обязательно для заполнения`);
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
          dynamicData: data.dynamicData || existingRecord.dynamicData
        },
        populate: ['owner']
      });
      
      return {
        data: updatedRecord,
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
      
      // Получаем запись для проверки прав
      let record;
      try {
        record = await strapi.documents('api::record.record').findOne({
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
          record = records[0];
        }
      }
      
      if (!record) {
        return ctx.notFound('Record not found');
      }
      
      const ownerId = record.owner?.id;
      
      // Проверяем права на удаление
      if (user.role?.type !== 'admin' && ownerId !== user.id) {
        return ctx.forbidden('You can only delete your own records');
      }
      
      // Удаляем запись
      const deletedRecord = await strapi.documents('api::record.record').delete({
        documentId: record.documentId
      });
      
      return {
        data: deletedRecord,
        meta: {}
      };
    } catch (error) {
      console.error('Delete error:', error);
      ctx.throw(500, error.message);
    }
  },
  
  // Дополнительные методы
  
  async statistics(ctx) {
    try {
      console.log("Statistics endpoint called");
      const { period = 'daily' } = ctx.query;

      // Определяем начальную дату
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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
      const { format = 'csv', fields = [] } = ctx.request.body;
      
      // Получаем все записи с использованием Document Service
      const records = await strapi.documents('api::record.record').findMany({
        populate: ['owner'],
        status: 'published'
      });
      
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        sort: { order: 'asc' },
        status: 'published'
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