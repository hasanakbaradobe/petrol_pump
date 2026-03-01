import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// We use SQLite for local development because remote databases often block external connections (ETIMEDOUT).
// When you deploy this code to your server, it will use the MySQL credentials below.
const useSqlite = process.env.NODE_ENV !== 'production' && process.env.FORCE_MYSQL !== 'true';

const sequelize = useSqlite
  ? new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: false,
    })
  : new Sequelize(
      process.env.DB_NAME || 'hasanakbar_db',
      process.env.DB_USER || 'hasanakbar',
      process.env.DB_PASSWORD || 'Letitbe0022',
      {
        host: process.env.DB_HOST || '34.34.254.244',
        port: Number(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

export default sequelize;
