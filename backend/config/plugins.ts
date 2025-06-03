module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d', // Токен будет действителен 7 дней
      },
    },
  },
});