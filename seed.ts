import bcrypt from 'bcryptjs';
import { User } from './server/models';
import sequelize from './server/config/database';

async function seedAdmin() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // Ensure tables exist

    const adminExists = await User.findOne({ where: { role: 'admin' } });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('Default admin user created: username: admin, password: admin123');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

seedAdmin();
