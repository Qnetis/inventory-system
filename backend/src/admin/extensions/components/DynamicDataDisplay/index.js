import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, Thead, Tbody, Tr, Th, Td } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';

const DynamicDataDisplay = ({ value = {} }) => {
  const [customFields, setCustomFields] = useState([]);
  const { get } = useFetchClient();

  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const { data } = await get('/api/custom-fields?sort=order&pagination[limit]=100');
        setCustomFields(data.data || []);
      } catch (error) {
        console.error('Error fetching custom fields:', error);
      }
    };

    fetchCustomFields();
  }, [get]);

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined) return '-';
    
    switch (fieldType) {
      case 'MONEY':
        return `${Number(value).toLocaleString('ru-RU')} ₽`;
      case 'CHECKBOX':
        return value ? '✓' : '✗';
      default:
        return String(value);
    }
  };

  if (!value || Object.keys(value).length === 0) {
    return (
      <Box padding={4} background="neutral100">
        <Typography variant="omega">
          Нет данных в дополнительных полях
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={4} background="neutral0" hasRadius>
      <Table colCount={2} rowCount={customFields.length + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">Поле</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Значение</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {customFields.map((field) => {
            const fieldData = field.attributes || field;
            const fieldValue = value[field.id];
            
            if (fieldValue === undefined) return null;
            
            return (
              <Tr key={field.id}>
                <Td>
                  <Typography>{fieldData.name}</Typography>
                </Td>
                <Td>
                  <Typography>
                    {formatValue(fieldValue, fieldData.fieldType)}
                  </Typography>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};

export default DynamicDataDisplay;