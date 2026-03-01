import { Router } from 'express';
import {
  getParties,
  getParty,
  createParty,
  updateParty,
  deleteParty,
} from '../controllers/partyController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticateJWT);

router.route('/')
  .get(getParties)
  .post(authorizeRole(['admin']), createParty);

router.route('/:id')
  .get(getParty)
  .put(authorizeRole(['admin']), updateParty)
  .delete(authorizeRole(['admin']), deleteParty);

export default router;
