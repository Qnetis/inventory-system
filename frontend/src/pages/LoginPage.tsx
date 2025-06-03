/* eslint-disable @typescript-eslint/no-explicit-any */


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identifier, password);
      navigate('/records');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: isMobile ? 2 : 3,
      }}
    >
      <Container component="main" maxWidth="xs">
        <Paper 
          elevation={isMobile ? 0 : 3} 
          sx={{ 
            padding: isMobile ? 3 : 4, 
            width: '100%',
            ...(isMobile && {
              boxShadow: 'none',
              border: 1,
              borderColor: 'divider'
            })
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography 
              component="h1" 
              variant={isMobile ? "h5" : "h4"} 
              align="center"
              gutterBottom
            >
              Система инвентаризации
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center" 
              sx={{ mb: 3 }}
            >
              Войдите в свою учетную запись
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="identifier"
                label="Email или логин"
                name="identifier"
                autoComplete="username"
                autoFocus={!isMobile}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                size={isMobile ? "medium" : "medium"}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Пароль"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size={isMobile ? "medium" : "medium"}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size={isMobile ? "large" : "large"}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={isLoading}
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;