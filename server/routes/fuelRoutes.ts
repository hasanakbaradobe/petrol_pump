import { Router } from 'express';
import {
  getFuels,
  getFuel,
  createFuel,
  updateFuel,
  deleteFuel,
} from '../controllers/fuelController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/roleMiddleware';

const router = Router();

// Apply authentication middleware to all routes in this file
router.use(authenticateJWT);

// Routes accessible by both Admin and Operator
router.route('/')
  .get(getFuels)
  // Route accessible ONLY by Admin
  .post(authorizeRole(['admin']), createFuel);

router.route('/:id')
  .get(getFuel)
  // Routes accessible ONLY by Admin
  .put(authorizeRole(['admin']), updateFuel)
  .delete(authorizeRole(['admin']), deleteFuel);

export default router;
