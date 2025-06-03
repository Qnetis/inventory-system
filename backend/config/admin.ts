export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  watchIgnoreFiles: [
    './src/admin/**',
    './dist/**',
    './.cache/**'
  ],
  host: env('HOST', '0.0.0.0'),
  port: env.int('ADMIN_PORT', 1337),
  serveAdminPanel: env.bool('SERVE_ADMIN', true),
});