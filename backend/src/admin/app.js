module.exports = {
  config: {
    locales: ['ru'],
    translations: {
      ru: {
        'app.components.LeftMenu.navbrand.title': 'Система инвентаризации',
        'app.components.LeftMenu.navbrand.workplace': 'Панель управления',
        'HomePage.welcome': 'Добро пожаловать в систему инвентаризации',
        'HomePage.welcome.again': 'Добро пожаловать!',
        'global.documentation': 'Документация',
      }
    },
    head: {
      favicon: '/favicon.ico',
    },
    theme: {
      colors: {
        primary100: '#f0f7ff',
        primary200: '#d9ecff', 
        primary500: '#1976d2',
        primary600: '#1565c0',
        primary700: '#0d47a1',
      }
    }
  },
  bootstrap(app) {
    console.log('Admin app bootstrapped');
  },
};