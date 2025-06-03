module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    
    console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`);
    console.log('Headers:', ctx.headers);
    console.log('Query:', ctx.query);
    
    if (ctx.state.user) {
      console.log('User:', {
        id: ctx.state.user.id,
        username: ctx.state.user.username,
        role: ctx.state.user.role?.type
      });
    }
    
    try {
      await next();
      const delta = Math.ceil(Date.now() - start);
      console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url} - ${ctx.status} - ${delta}ms`);
    } catch (error) {
      const delta = Math.ceil(Date.now() - start);
      console.error(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url} - ERROR - ${delta}ms`);
      console.error('Error:', error.message);
      throw error;
    }
  };
};