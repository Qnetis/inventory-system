export default {
  routes: [
    {
      method: 'GET',
      path: '/api/records/statistics',
      handler: 'api::record.record.statistics',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/api/records/export',
      handler: 'api::record.record.export',
      config: {
        auth: {
          scope: ['authenticated']
        },
        policies: [],
        middlewares: [],
      },
    },
  ],
};