export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'ws:', 'wss:', 'http://localhost:*', 'ws://localhost:*'],
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
        'http://localhost:1337'
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];