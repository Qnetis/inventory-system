module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/records/statistics',
      handler: 'record.statistics',
      config: {
        policies: ['global::is-admin'],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/records/export',
      handler: 'record.export',
      config: {
        policies: ['global::is-admin'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/records/:id/barcode',
      handler: 'record.barcode',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};