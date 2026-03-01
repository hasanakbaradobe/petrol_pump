import sequelize from './server/config/database';
import { User } from './server/models';

async function test() {
  try {
    await sequelize.authenticate();
    const user = await User.create({
      username: 'testuser2',
      password: 'password123',
      role: 'operator'
    });
    console.log('User created:', user.toJSON());
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
