import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Container,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Layout: React.FC = () => {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState<null | HTMLElement>(null);

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Если не авторизован, перенаправляем на логин
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
    handleMobileMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {/* Мобильное меню */}
          {isMobile && (
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleMobileMenuOpen}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleMobileMenuClose}
              >
                <MenuItem onClick={() => handleNavigate('/records')}>
                  <InventoryIcon sx={{ mr: 1 }} /> Записи
                </MenuItem>
                {user.role?.type === 'admin' && (
                  <MenuItem onClick={() => handleNavigate('/admin')}>
                    <AdminIcon sx={{ mr: 1 }} /> Администрирование
                  </MenuItem>
                )}
              </Menu>
            </>
          )}

          {/* Логотип/Название */}
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            component="div" 
            sx={{ 
              flexGrow: 1,
              cursor: 'pointer',
              fontSize: isMobile ? '1rem' : '1.5rem'
            }}
            onClick={() => navigate('/records')}
          >
            {isMobile ? 'Инвентаризация' : 'Система инвентаризации'}
          </Typography>

          {/* Десктопное меню */}
          {!isMobile && (
            <>
              <Button 
                color="inherit" 
                startIcon={<InventoryIcon />}
                onClick={() => navigate('/records')}
                sx={{ mr: 2 }}
              >
                Записи
              </Button>
              {user.role?.type === 'admin' && (
                <Button 
                  color="inherit" 
                  startIcon={<AdminIcon />}
                  onClick={() => navigate('/admin')}
                  sx={{ mr: 2 }}
                >
                  Администрирование
                </Button>
              )}
            </>
          )}

          {/* Меню пользователя */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user.fullName || user.username}
              </Typography>
            )}
            <IconButton
              onClick={handleMenuOpen}
              color="inherit"
              size="large"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {(user.fullName || user.username || '?')[0].toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {isMobile && (
                <MenuItem disabled>
                  <AccountIcon sx={{ mr: 1 }} />
                  {user.fullName || user.username}
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Выйти
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Container 
          maxWidth={false} 
          sx={{ 
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3, md: 4 }
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;