import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import sequelize from './server/config/database';
import { User } from './server/models';
import bcrypt from 'bcryptjs';
import { errorHandler } from './server/middlewares/errorHandler';

import authRoutes from './server/routes/authRoutes';
import fuelRoutes from './server/routes/fuelRoutes';
import cashRoutes from './server/routes/cashRoutes';
import partyRoutes from './server/routes/partyRoutes';
import ledgerRoutes from './server/routes/ledgerRoutes';
import inventoryRoutes from './server/routes/inventoryRoutes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Global Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Production Middlewares
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP if it conflicts with React/Vite
    }));
    app.use(compression());
  }

  // API Routes
  app.get('/api/health', async (req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
    }
  });

  // Mount Feature Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/fuels', fuelRoutes);
  app.use('/api/cash', cashRoutes);
  app.use('/api/parties', partyRoutes);
  app.use('/api/ledger', ledgerRoutes);
  app.use('/api/inventory', inventoryRoutes);

  // Centralized Error Handler (should be placed after all API routes)
  app.use(errorHandler);

  // Database Connection and Server Start
  try {
    // Attempt to authenticate with the database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync models
    const isSqlite = sequelize.getDialect() === 'sqlite';
    if (isSqlite) {
      await sequelize.query('PRAGMA foreign_keys = OFF;');
    } else {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    }
    
    await sequelize.sync({ alter: true });
    
    if (isSqlite) {
      await sequelize.query('PRAGMA foreign_keys = ON;');
    } else {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    }
    console.log('Database models synchronized successfully.');

    // Seed default admin user if none exists
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin user created (username: admin, password: admin123)');
    }

  } catch (error) {
    console.warn('Unable to connect to the database. The server will still start, but DB features may fail:', error);
  }

  // Vite middleware for development (Full-stack setup)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.resolve(__dirname, 'dist');
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
