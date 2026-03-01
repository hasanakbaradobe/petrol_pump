import { Router } from 'express';
import { login, createUser, getMe, getUsers, deleteUser, updateUser, verifyPassword } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/roleMiddleware';

const router = Router();

// Public route
router.post('/login', login);

// Protected routes
// Only admins can create new users
router.post('/register', authenticateJWT, authorizeRole(['admin']), createUser);

// Admin routes for managing users
router.get('/users', authenticateJWT, authorizeRole(['admin']), getUsers);
router.put('/users/:id', authenticateJWT, authorizeRole(['admin']), updateUser);
router.delete('/users/:id', authenticateJWT, authorizeRole(['admin']), deleteUser);

// Any authenticated user can get their own profile
router.get('/me', authenticateJWT, getMe);

// Verify current user's password
router.post('/verify-password', authenticateJWT, verifyPassword);

export default router;
