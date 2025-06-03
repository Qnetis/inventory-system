const fs = require('fs');
const path = require('path');

async function generateFieldsReference() {
  try {
    // Запускаем скрипт через Strapi
    const strapi = require('@strapi/strapi');
    const app = await strapi().load();
    
    // Получаем все кастомные поля
    const customFields = await app.entityService.findMany('api::custom-field.custom-field', {
      sort: { order: 'asc' },
      filters: { publishedAt: { $notNull: true } }
    });
    
    // Генерируем справку
    let reference = '# Справочник кастомных полей\n\n';
    reference += 'Используйте эти ID при заполнении поля dynamicData в админ-панели.\n\n';
    reference += '## Формат JSON для dynamicData:\n';
    reference += '```json\n{\n';
    
    const examples = [];
    
    customFields.forEach((field, index) => {
      reference += `\n### ${index + 1}. ${field.name}\n`;
      reference += `- **ID**: ${field.id}\n`;
      reference += `- **Тип**: ${field.fieldType}\n`;
      reference += `- **Обязательное**: ${field.isRequired ? 'Да' : 'Нет'}\n`;
      
      if (field.fieldType === 'SELECT' && field.options) {
        reference += `- **Опции**: ${JSON.stringify(field.options)}\n`;
      }
      
      // Примеры для JSON
      let example = '';
      switch (field.fieldType) {
        case 'TEXT':
          example = `  "${field.id}": "Пример текста"`;
          break;
        case 'NUMBER':
          example = `  "${field.id}": 123`;
          break;
        case 'MONEY':
          example = `  "${field.id}": 50000`;
          break;
        case 'SELECT':
          const option = field.options?.[0] || 'Опция';
          example = `  "${field.id}": "${option}"`;
          break;
        case 'CHECKBOX':
          example = `  "${field.id}": true`;
          break;
      }
      
      if (example) {
        examples.push(example);
      }
    });
    
    reference = reference.replace('```json\n{\n', '```json\n{\n' + examples.join(',\n') + '\n');
    reference += '}\n```\n\n';
    
    reference += '## Примечания:\n';
    reference += '- Для полей типа TEXT и SELECT используйте строковые значения в кавычках\n';
    reference += '- Для полей типа NUMBER и MONEY используйте числовые значения без кавычек\n';
    reference += '- Для полей типа CHECKBOX используйте true или false\n';
    reference += '- Обязательные поля должны быть заполнены\n';
    
    // Сохраняем файл
    const outputPath = path.join(__dirname, '..', 'CUSTOM_FIELDS_REFERENCE.md');
    fs.writeFileSync(outputPath, reference);
    
    console.log(`Справочник сохранен в: ${outputPath}`);
    
    // Также выводим в консоль
    console.log('\n' + reference);
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

generateFieldsReference();