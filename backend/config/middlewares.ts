export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'ws:', 'wss:', 'http://localhost:*', 'ws://localhost:*', 'http://93.189.228.76:*'],
          'img-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com', 'https:'],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https:', 'fonts.googleapis.com'],
          'font-src': ["'self'", 'https:', 'fonts.gstatic.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:5173', 
        'http://localhost:5174', 
        'http://localhost:3000',
        'http://localhost:1337',
        // ДОБАВЛЯЕМ IP ВАШЕГО СЕРВЕРА
        'http://93.189.228.76',
        'http://93.189.228.76:80',
        'http://93.189.228.76:1337',
        // Если у вас есть домен, добавьте его тоже
        // 'https://yourdomain.com',
      ],
      credentials: true, // Добавляем поддержку credentials
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];