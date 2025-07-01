// backend/src/api/record/controllers/record.ts
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const ExcelJS = require('exceljs');

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
          dynamicData: data.dynamicData || existingRecord.dynamicData,
        },
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
      
      // Получаем запись для проверки прав
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
        case 'all':
          // Для "всё время" не устанавливаем фильтр по дате
          startDate = null;
          break;
        default: // daily
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }

      // Условный фильтр - добавляем фильтр по дате только если startDate не null
      const filters = {
        owner: user.id,
        ...(startDate && {
          createdAt: {
            $gte: startDate.toISOString(),
          },
        }),
      };

      const records = await strapi.documents('api::record.record').findMany({
        filters,
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

  // Статистика для всех пользователей (только админ)
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
        case 'all':
          // Для "всё время" не устанавливаем фильтр по дате
          startDate = null;
          break;
        default: // daily
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }

      // Условный фильтр - добавляем фильтр по дате только если startDate не null
      const filters = {
        ...(startDate && {
          createdAt: {
            $gte: startDate.toISOString(),
          },
        }),
      };

      const records = await strapi.documents('api::record.record').findMany({
        filters,
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

  // Алиас для getAllUsersStatistics (для совместимости с роутом)
  async statistics(ctx) {
    return this.getAllUsersStatistics(ctx);
  },

  // Экспорт данных с поддержкой Excel
  async export(ctx) {
    try {
      const { format = 'csv', selectedFields = [] } = ctx.request.body;
      
      // Получаем все записи
      const records = await strapi.documents('api::record.record').findMany({
        populate: ['owner'],
        status: 'published'
      });
      
      // Получаем кастомные поля
      const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
        status: 'published'
      });
      
      // Подготовка заголовков
      const headers = ['Штрихкод', 'Дата создания', 'Создатель'];
      const headerMapping = {
        'Штрихкод': 'barcode',
        'Дата создания': 'createdAt',
        'Создатель': 'owner'
      };
      
      // Добавляем выбранные пользовательские поля
      if (selectedFields && selectedFields.length > 0) {
        selectedFields.forEach((fieldId: string) => {
          const field = customFields.find((f: any) => f.id === fieldId);
          if (field) {
            headers.push(field.name);
            headerMapping[field.name] = fieldId;
          }
        });
      } else {
        // Если поля не выбраны, добавляем все
        customFields.forEach((field: any) => {
          headers.push(field.name);
          headerMapping[field.name] = field.id;
        });
      }
      
      if (format === 'excel') {
        // Создаем новую книгу Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Записи');
        
        // Добавляем заголовки
        worksheet.addRow(headers);
        
        // Стилизация заголовков
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Добавляем данные
        records.forEach((record: any) => {
          const row = [];
          
          // Системные поля
          row.push(record.barcode || '');
          row.push(record.createdAt ? new Date(record.createdAt).toLocaleString('ru-RU') : '');
          row.push(record.owner?.username || record.owner?.email || '');
          
          // Пользовательские поля
          headers.slice(3).forEach((header) => {
            const fieldId = headerMapping[header];
            const value = record.dynamicData?.[fieldId] || '';
            
            // Находим тип поля для форматирования
            const field = customFields.find((f: any) => f.id === fieldId);
            if (field) {
              switch (field.fieldType) {
                case 'MONEY':
                  row.push(value ? parseFloat(value) : 0);
                  break;
                case 'NUMBER':
                  row.push(value ? parseFloat(value) : 0);
                  break;
                case 'CHECKBOX':
                  row.push(value ? 'Да' : 'Нет');
                  break;
                default:
                  row.push(String(value));
              }
            } else {
              row.push(String(value));
            }
          });
          
          worksheet.addRow(row);
        });
        
        // Автоматическая ширина колонок
        worksheet.columns.forEach((column, index) => {
          let maxLength = headers[index].length;
          worksheet.getColumn(index + 1).eachCell({ includeEmpty: false }, (cell) => {
            const cellLength = cell.value ? String(cell.value).length : 0;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          });
          column.width = Math.min(maxLength + 2, 50);
        });
        
        // Форматирование денежных полей
        headers.forEach((header, index) => {
          const fieldId = headerMapping[header];
          const field = customFields.find((f: any) => f.id === fieldId);
          
          if (field && field.fieldType === 'MONEY') {
            worksheet.getColumn(index + 1).numFmt = '#,##0.00 ₽';
          } else if (field && field.fieldType === 'NUMBER') {
            worksheet.getColumn(index + 1).numFmt = '#,##0.00';
          }
        });
        
        // Генерируем буфер
        const buffer = await workbook.xlsx.writeBuffer();
        
        ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        ctx.set('Content-Disposition', 'attachment; filename="records_export.xlsx"');
        ctx.body = buffer;
        
      } else {
        // CSV экспорт
        let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
        
        records.forEach((record: any) => {
          const row = [
            record.barcode || '',
            record.createdAt || '',
            record.owner?.username || record.owner?.email || ''
          ];
          
          // Добавляем пользовательские поля
          headers.slice(3).forEach((header) => {
            const fieldId = headerMapping[header];
            const value = record.dynamicData?.[fieldId] || '';
            row.push(String(value));
          });
          
          csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        // Добавляем BOM для корректного отображения кириллицы в Excel
        const bom = '\ufeff';
        ctx.set('Content-Type', 'text/csv; charset=utf-8');
        ctx.set('Content-Disposition', 'attachment; filename="records_export.csv"');
        ctx.body = bom + csvContent;
      }
      
    } catch (error) {
      console.error('Export error:', error);
      ctx.throw(500, error.message);
    }
  },

}));