import { Router } from 'express';
import {
  addFuelPurchase,
  recordPayment,
  getLedger,
  getAllTransactions
} from '../controllers/ledgerController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/purchase', addFuelPurchase);
router.post('/payment', recordPayment);
router.get('/', getLedger);
router.get('/all-transactions', authorizeRole(['admin']), getAllTransactions);

export default router;
