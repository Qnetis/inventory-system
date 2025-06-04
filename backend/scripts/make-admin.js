const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function makeAdmin() {
  try {
    // Загружаем Strapi
    console.log('Загрузка Strapi...');
    const strapi = await require('@strapi/strapi')().load();
    
    console.log('Strapi загружен успешно!');

    // Получаем всех пользователей
    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      populate: ['role']
    });

    if (!users || users.length === 0) {
      console.log('Пользователи не найдены!');
      process.exit(1);
    }

    console.log('\nСуществующие пользователи:');
    users.forEach((user, index) => {
      const roleInfo = user.role ? `${user.role.name} (${user.role.type})` : 'Нет роли';
      console.log(`${index + 1}. ${user.username} (${user.email}) - Роль: ${roleInfo}`);
    });

    // Получаем все роли
    const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {});
    
    console.log('\nСуществующие роли:');
    roles.forEach((role) => {
      console.log(`- ${role.name} (тип: ${role.type})`);
    });

    // Проверяем наличие роли админа
    const adminRole = roles.find(role => role.type === 'admin');
    
    if (!adminRole) {
      console.log('\n⚠️  Роль администратора не найдена!');
      
      // Спрашиваем, создать ли роль
      rl.question('Создать роль администратора? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          const newAdminRole = await strapi.entityService.create('plugin::users-permissions.role', {
            data: {
              name: 'Administrator',
              description: 'System administrator with full access',
              type: 'admin'
            }
          });
          
          console.log('✅ Роль администратора создана!');
          askUserSelection(users, newAdminRole.id);
        } else {
          console.log('Операция отменена');
          rl.close();
          process.exit(0);
        }
      });
    } else {
      askUserSelection(users, adminRole.id);
    }

    async function askUserSelection(users, adminRoleId) {
      rl.question('\nВведите номер пользователя, которого хотите сделать администратором (или 0 для отмены): ', async (answer) => {
        const userIndex = parseInt(answer) - 1;
        
        if (answer === '0') {
          console.log('Операция отменена');
          rl.close();
          process.exit(0);
        }
        
        if (isNaN(userIndex) || userIndex < 0 || userIndex >= users.length) {
          console.log('Неверный номер пользователя');
          rl.close();
          process.exit(1);
        }

        const selectedUser = users[userIndex];

        try {
          // Обновляем пользователя
          await strapi.entityService.update('plugin::users-permissions.user', selectedUser.id, {
            data: {
              role: adminRoleId
            }
          });

          console.log(`\n✅ Пользователь ${selectedUser.username} теперь администратор!`);
          console.log('\nТеперь вы можете:');
          console.log('1. Войти в систему под этим пользователем');
          console.log('2. Увидеть кнопку "Администрирование" в верхнем меню');
          
        } catch (error) {
          console.error('Ошибка при обновлении пользователя:', error);
        }
        
        rl.close();
        process.exit(0);
      });
    }

  } catch (error) {
    console.error('Ошибка:', error.message);
    console.error('Убедитесь, что:');
    console.error('1. Вы находитесь в директории backend');
    console.error('2. База данных запущена');
    console.error('3. Установлены все зависимости (npm install)');
    rl.close();
    process.exit(1);
  }
}

// Запускаем функцию
makeAdmin().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});