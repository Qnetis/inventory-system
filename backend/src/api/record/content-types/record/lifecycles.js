const { v4: uuidv4 } = require('uuid');

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Если нет инвентарного номера, генерируем
    if (!data.inventoryNumber) {
      data.inventoryNumber = uuidv4();
    }
    
    // Если нет штрихкода, генерируем
    if (!data.barcode) {
      data.barcode = generateEAN13();
    }
    
    // Если нет имени, генерируем
    if (!data.name) {
      data.name = `Запись ${data.inventoryNumber.slice(0, 8)}`;
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
  
  const customFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
    filters: { 
      publishedAt: { $notNull: true },
      isRequired: true 
    }
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
}