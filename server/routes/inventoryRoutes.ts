import { Router } from 'express';
import {
  setOpeningStock,
  getCurrentStock,
  getInventoryHistory,
  getAllInventoryHistory
} from '../controllers/inventoryController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/roleMiddleware';

const router = Router();

// Protect all routes with JWT
router.use(authenticateJWT);

// View current stock and warnings (Admin & Operator)
router.get('/stock', getCurrentStock);

// View history of stock movements for all fuels
router.get('/history', getAllInventoryHistory);

// View history of stock movements for a specific fuel (Admin & Operator)
router.get('/history/:fuel_id', getInventoryHistory);

// Set opening stock or manually adjust stock (Admin only)
router.post('/opening-stock', authorizeRole(['admin']), setOpeningStock);

export default router;
