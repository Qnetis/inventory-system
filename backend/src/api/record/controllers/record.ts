// src/api/record/controllers/record.js
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { v4: uuidv4 } = require('uuid');

module.exports = createCoreController('api::record.record', ({ strapi }) => ({
  
  async create(ctx) {
    try {
      const { data } = ctx.request.body;
      const user = ctx.state.user;
      
      // Валидация динамических полей
      const customFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
        sort: { order: 'asc' }
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
      
      // Генерация уникальных идентификаторов
      const inventoryNumber = uuidv4();
      const barcode = this.generateEAN13();
      
      // Создание записи
      const entity = await strapi.entityService.create('api::record.record', {
        data: {
          inventoryNumber,
          barcode,
          dynamicData: data.dynamicData || {},
          owner: user.id
        },
        populate: ['owner']
      });
      

      
      // Вариант 2: Ручное форматирование ответа (рекомендуется)
      return {
        data: entity,
        meta: {}
      };
      
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  
  async find(ctx) {
    const user = ctx.state.user;
    
    // Только свои записи для обычных пользователей
    if (!user.isAdmin && user.role?.type !== 'admin') {
      ctx.query = {
        ...ctx.query,
        filters: {
          ...ctx.query.filters,
          owner: { id: user.id }
        }
      };
    }
    
    // Вызываем родительский метод find
    const { data, meta } = await super.find(ctx);
    
    return { data, meta };
  },
  
  async findOne(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Получаем запись
    const entity = await strapi.entityService.findOne('api::record.record', id, {
      populate: ['owner']
    });
    
    if (!entity) {
      return ctx.notFound('Record not found');
    }
    
    // Проверяем права доступа
    if (!user.isAdmin && user.role?.type !== 'admin' && entity.owner.id !== user.id) {
      return ctx.forbidden('Access denied');
    }
    
    // Возвращаем в формате Strapi
    return {
      data: entity,
      meta: {}
    };
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
    
    // Проверяем права на редактирование
    if (!user.isAdmin && user.role?.type !== 'admin' && existingEntity.owner.id !== user.id) {
      return ctx.forbidden('You can only edit your own records');
    }
    
    // Валидация динамических полей
    const customFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
      sort: { order: 'asc' }
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
    
    // Проверяем права на удаление
    if (!user.isAdmin && user.role?.type !== 'admin' && entity.owner.id !== user.id) {
      return ctx.forbidden('You can only delete your own records');
    }
    
    // Удаляем запись
    const deletedEntity = await strapi.entityService.delete('api::record.record', id);
    
    return {
      data: deletedEntity,
      meta: {}
    };
  },
  
  // Дополнительные методы
  
  async statistics(ctx) {
    try {
      // Проверка прав админа
      const user = ctx.state.user;
      if (!user.isAdmin && user.role?.type !== 'admin') {
        return ctx.forbidden('Only admins can view statistics');
      }
      
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
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      
      // Получаем записи за период
      const records = await strapi.entityService.findMany('api::record.record', {
        filters: {
          createdAt: { $gte: startDate.toISOString() }
        },
        populate: ['owner'],
        limit: -1 // Получаем все записи
      });
      
      // Получаем денежные поля
      const moneyFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
        filters: { fieldType: 'MONEY' }
      });
      
      // Группируем по пользователям
      const userStats = {};
      
      for (const record of records) {
        const userId = record.owner.id;
        const userName = record.owner.fullName || record.owner.username;
        
        if (!userStats[userId]) {
          userStats[userId] = {
            user: userName,
            count: 0,
            totalMoney: 0
          };
        }
        
        userStats[userId].count++;
        
        // Считаем деньги
        for (const field of moneyFields) {
          const value = record.dynamicData?.[field.id];
          if (value) {
            userStats[userId].totalMoney += Number(value);
          }
        }
      }
      
      return Object.values(userStats);
      
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  
  async export(ctx) {
    try {
      // Проверка прав админа
      const user = ctx.state.user;
      if (!user.isAdmin && user.role?.type !== 'admin') {
        return ctx.forbidden('Only admins can export data');
      }
      
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
  
  async barcode(ctx) {
    try {
      const { id } = ctx.params;
      const JsBarcode = require('jsbarcode');
      const { createCanvas } = require('canvas');
      
      const record = await strapi.entityService.findOne('api::record.record', id);
      
      if (!record) {
        return ctx.notFound('Record not found');
      }
      
      const canvas = createCanvas(400, 200);
      const context = canvas.getContext('2d');
      
      // Белый фон
      context.fillStyle = 'white';
      context.fillRect(0, 0, 400, 200);
      
      // Текст инвентарного номера
      context.fillStyle = 'black';
      context.font = 'bold 20px Arial';
      context.textAlign = 'center';
      context.fillText(`Инв. №: ${record.inventoryNumber}`, 200, 40);
      
      // Генерация штрихкода
      JsBarcode(canvas, record.barcode, {
        format: "EAN13",
        width: 2,
        height: 100,
        displayValue: true,
        marginTop: 60
      });
      
      ctx.set('Content-Type', 'image/png');
      ctx.body = canvas.toBuffer('image/png');
      
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