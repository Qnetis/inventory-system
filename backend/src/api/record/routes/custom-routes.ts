export default {
  routes: [
    {
      method: 'GET',
      path: '/records/statistics',
      handler: 'record.statistics',
      config: {
        // Убираем auth чтобы не требовать авторизацию
        // Или оставляем только базовую проверку authenticated без проверки роли
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/records/export',
      handler: 'record.export',
      config: {
        // Убираем auth чтобы не требовать авторизацию
        // Или оставляем только базовую проверку authenticated без проверки роли
        policies: [],
        middlewares: [],
      },
    },
  ],
};