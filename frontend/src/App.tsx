import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RecordsPage from './pages/RecordsPage';
import RecordDetailPage from './pages/RecordDetailPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

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
                <Route path="records/:id" element={<RecordDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;