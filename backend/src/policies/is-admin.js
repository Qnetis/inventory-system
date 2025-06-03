module.exports = async (ctx, next) => {
  const user = ctx.state.user;
  
  if (!user) {
    return ctx.unauthorized('You must be logged in');
  }
  
  // Проверяем роль пользователя
  if (user.role?.type === 'admin') {
    return next();
  }
  
  ctx.unauthorized('Only admins can access this resource');
};