// src/pages/AdminPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from '../components/Admin/UserManagement';
import FieldManagement from '../components/Admin/FieldManagement';
import Statistics from '../components/Admin/Statistics';
import ExportData from '../components/Admin/ExportData';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  if (user?.role?.type !== 'admin') {
    return <Box>У вас нет доступа к этой странице</Box>;
  }

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Пользователи" />
          <Tab label="Кастомные поля" />
          <Tab label="Статистика" />
          <Tab label="Экспорт данных" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <UserManagement />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <FieldManagement />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <Statistics />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <ExportData />
      </TabPanel>
    </Box>
  );
};

export default AdminPage;