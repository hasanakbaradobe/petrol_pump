import { Router } from 'express';
import { createSale, getSales } from '../controllers/cashController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// All cash counter routes require authentication
router.use(authenticateJWT);

// Create a new sale
router.post('/sale', createSale);

// Get sales (Admin sees all, Operator sees own)
router.get('/sales', getSales);

export default router;
