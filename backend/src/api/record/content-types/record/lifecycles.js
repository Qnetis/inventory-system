// backend/src/api/record/content-types/record/lifecycles.js

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    console.log('Record lifecycle beforeCreate called with data:', data);
    
    // Если нет штрихкода, генерируем
    if (!data.barcode) {
      data.barcode = generateEAN13();
    }
    

    
    // Если нет владельца и есть пользователь в контексте
    if (!data.owner && event.state?.user) {
      data.owner = event.state.user.id;
    }
    
    // Валидация кастомных полей
    await validateCustomFields(data.dynamicData);
  },
  
  async beforeUpdate(event) {
    const { data } = event.params;
    
    console.log('Record lifecycle beforeUpdate called with data:', data);
    
    // Валидация кастомных полей при обновлении
    if (data.dynamicData) {
      await validateCustomFields(data.dynamicData);
    }
  }
};

function generateEAN13() {
  const code = Array.from({ length: 12 }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return code + checkDigit;
}

async function validateCustomFields(dynamicData) {
  if (!dynamicData) return;
  
  try {
    // Используем Document Service для получения кастомных полей в Strapi v5
    const customFields = await strapi.documents('api::custom-field.custom-field').findMany({
      filters: { 
        isRequired: true 
      },
      status: 'published'
    });
    
    const errors = [];
    
    for (const field of customFields) {
      const value = dynamicData[field.id];
      if (field.isRequired && (value === undefined || value === null || value === '')) {
        errors.push(`Поле "${field.name}" обязательно для заполнения`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}Ы