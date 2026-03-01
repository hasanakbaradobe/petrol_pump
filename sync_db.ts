import sequelize from './server/config/database';
import { User, Fuel, Party, Transaction, LedgerEntry, Inventory } from './server/models';

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    // Disable foreign keys
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Synced.');
    
    // Enable foreign keys
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('Done.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

syncDB();
