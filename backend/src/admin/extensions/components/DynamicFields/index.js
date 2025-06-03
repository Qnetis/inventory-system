import React, { useState, useEffect } from 'react';
import { 
  TextInput, 
  NumberInput, 
  Select, 
  Option,
  Checkbox,
  Field,
  Flex,
  Box,
  Typography
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';

const DynamicFields = ({ value = {}, onChange, name }) => {
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState(value || {});
  const { get } = useFetchClient();

  // Загружаем кастомные поля
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const { data } = await get('/api/custom-fields?sort=order&populate=*&pagination[limit]=100');
        setCustomFields(data.data || []);
      } catch (error) {
        console.error('Error fetching custom fields:', error);
      }
    };

    fetchCustomFields();
  }, [get]);

  // Обновляем значения при изменении
  const handleFieldChange = (fieldId, newValue) => {
    const updatedValues = {
      ...fieldValues,
      [fieldId]: newValue
    };
    setFieldValues(updatedValues);
    onChange({ target: { name, value: updatedValues } });
  };

  // Рендерим поле в зависимости от типа
  const renderField = (field) => {
    const fieldData = field.attributes || field;
    const fieldId = field.id.toString();
    const currentValue = fieldValues[fieldId] || '';

    switch (fieldData.fieldType) {
      case 'TEXT':
        return (
          <TextInput
            label={fieldData.name}
            name={`${name}.${fieldId}`}
            value={currentValue}
            onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            required={fieldData.isRequired}
          />
        );

      case 'NUMBER':
        return (
          <NumberInput
            label={fieldData.name}
            name={`${name}.${fieldId}`}
            value={currentValue || 0}
            onValueChange={(value) => handleFieldChange(fieldId, value)}
            required={fieldData.isRequired}
          />
        );

      case 'MONEY':
        return (
          <NumberInput
            label={`${fieldData.name} (₽)`}
            name={`${name}.${fieldId}`}
            value={currentValue || 0}
            onValueChange={(value) => handleFieldChange(fieldId, value)}
            required={fieldData.isRequired}
          />
        );

      case 'SELECT':
        return (
          <Select
            label={fieldData.name}
            name={`${name}.${fieldId}`}
            value={currentValue}
            onChange={(value) => handleFieldChange(fieldId, value)}
            required={fieldData.isRequired}
          >
            <Option value="">Не выбрано</Option>
            {fieldData.options?.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );

      case 'CHECKBOX':
        return (
          <Checkbox
            name={`${name}.${fieldId}`}
            value={!!currentValue}
            onValueChange={(value) => handleFieldChange(fieldId, value)}
          >
            {fieldData.name}
          </Checkbox>
        );

      default:
        return null;
    }
  };

  if (customFields.length === 0) {
    return (
      <Box padding={4} background="neutral100">
        <Typography variant="omega">
          Нет доступных полей. Создайте кастомные поля в разделе Custom Fields.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Flex direction="column" alignItems="stretch" gap={4}>
        {customFields.map((field) => (
          <Field key={field.id}>
            {renderField(field)}
          </Field>
        ))}
      </Flex>
    </Box>
  );
};

export default DynamicFields;