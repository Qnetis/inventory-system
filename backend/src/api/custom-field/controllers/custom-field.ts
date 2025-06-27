/**
 * custom-field controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::custom-field.custom-field', ({ strapi }) => ({
  // Переопределяем метод find для корректной работы с Strapi v5
  async find(ctx) {
    try {
      console.log('🔍 Custom Field Find - начало запроса');
      
      // Используем Document Service API для Strapi v5
      const results = await strapi.documents('api::custom-field.custom-field').findMany({
        sort: { order: 'asc' },
        status: 'published',
        ...ctx.query
      });

      console.log('📋 Custom fields найдено:', results?.length || 0);
      
      return {
        data: results || [],
        meta: {
          pagination: {
            page: 1,
            pageSize: results?.length || 0,
            pageCount: 1,
            total: results?.length || 0
          }
        }
      };
    } catch (error) {
      console.error('❌ Ошибка получения custom fields:', error);
      throw error;
    }
  },

  // Переопределяем метод create
  async create(ctx) {
    try {
      console.log('➕ Creating custom field with data:', ctx.request.body);
      
      const { data } = ctx.request.body;
      
      // Используем Document Service API
      const result = await strapi.documents('api::custom-field.custom-field').create({
        data,
        status: 'published' // Сразу публикуем
      });

      console.log('✅ Custom field создано:', result.id);
      
      return { data: result };
    } catch (error) {
      console.error('❌ Ошибка создания custom field:', error);
      throw error;
    }
  },

  // Переопределяем метод update
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      
      console.log('📝 Updating custom field:', id, 'with data:', data);
      
      // Используем Document Service API
      const result = await strapi.documents('api::custom-field.custom-field').update({
        documentId: id,
        data,
        status: 'published'
      });

      console.log('✅ Custom field обновлено:', result.id);
      
      return { data: result };
    } catch (error) {
      console.error('❌ Ошибка обновления custom field:', error);
      throw error;
    }
  },

  // Переопределяем метод delete - ключевое исправление!
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      
      console.log('🗑️ Deleting custom field with ID:', id);
      
      // Сначала проверяем, существует ли поле
      const existingField = await strapi.documents('api::custom-field.custom-field').findFirst({
        filters: { documentId: id }
      });

      if (!existingField) {
        console.log('❌ Custom field не найдено:', id);
        return ctx.notFound('Custom field not found');
      }

      console.log('📋 Найдено поле для удаления:', existingField.name);

      // Используем Document Service API для удаления
      const result = await strapi.documents('api::custom-field.custom-field').delete({
        documentId: id
      });

      console.log('✅ Custom field успешно удалено:', id);
      
      return { data: result };
    } catch (error) {
      console.error('❌ Ошибка удаления custom field:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  },

  // Переопределяем метод findOne
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      
      console.log('🔍 Finding custom field:', id);
      
      const result = await strapi.documents('api::custom-field.custom-field').findFirst({
        filters: { documentId: id },
        status: 'published'
      });

      if (!result) {
        return ctx.notFound('Custom field not found');
      }

      console.log('✅ Custom field найдено:', result.name);
      
      return { data: result };
    } catch (error) {
      console.error('❌ Ошибка получения custom field:', error);
      throw error;
    }
  }
}));