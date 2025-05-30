module.exports = async (ctx, next) => {
  if (ctx.state.user && ctx.state.user.isAdmin) {
    return next();
  }
  
  ctx.unauthorized('Only admins can access this resource');
};