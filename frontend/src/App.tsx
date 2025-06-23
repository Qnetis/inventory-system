

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ruRU } from '@mui/material/locale';

import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RecordsPage from './pages/RecordsPage';
import RecordDetailPage from './pages/RecordDetailPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 минут
    },
  },
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiTablePagination: {
      defaultProps: {
        rowsPerPageOptions: [10, 25, 50],
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
}, ruRU);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/records" />} />
                <Route path="records" element={<RecordsPage />} />
                <Route path="records/create" element={<Navigate to="/records" replace />} />
                <Route path="records/new" element={<Navigate to="/records" replace />} />
                <Route path="records/add" element={<Navigate to="/records" replace />} />
                <Route path="records/:id" element={<RecordDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/records" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;