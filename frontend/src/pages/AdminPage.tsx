// src/pages/AdminPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from '../components/Admin/UserManagement';
import FieldManagement from '../components/Admin/FieldManagement';
import Statistics from '../components/Admin/Statistics';
import ExportData from '../components/Admin/ExportData';
import {
  People as PeopleIcon,
  FormatListBulleted as FieldsIcon,
  BarChart as StatsIcon,
  Download as ExportIcon,
} from '@mui/icons-material';

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
      {value === index && <Box sx={{ py: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
        >
          <Tab 
            label={isMobile ? undefined : "Пользователи"} 
            icon={isMobile ? <PeopleIcon /> : undefined}
            iconPosition="start"
          />
          <Tab 
            label={isMobile ? undefined : "Кастомные поля"} 
            icon={isMobile ? <FieldsIcon /> : undefined}
            iconPosition="start"
          />
          <Tab 
            label={isMobile ? undefined : "Статистика"} 
            icon={isMobile ? <StatsIcon /> : undefined}
            iconPosition="start"
          />
          <Tab 
            label={isMobile ? undefined : "Экспорт данных"} 
            icon={isMobile ? <ExportIcon /> : undefined}
            iconPosition="start"
          />
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