import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Transaction, Inventory, LedgerEntry } from '../models';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    const message = error.name === 'SequelizeConnectionError' 
      ? 'Database connection error. Please try again later.' 
      : 'Internal server error during login';
    res.status(500).json({ success: false, message, error: error.message });
  }
};

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const userId = (req as any).user.id;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    res.json({ success: true, message: 'Password verified' });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || 'operator', // Default to operator if not specified
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.name === 'SequelizeDatabaseError') {
      console.error('Database Error Details:', error.parent || error.original);
    }
    res.status(500).json({ success: false, message: 'Internal server error while creating user', error: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    // req.user is populated by the authenticateJWT middleware
    const userId = (req as any).user.id;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or token invalid' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { username, password, role } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser && existingUser.id !== Number(userId)) {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }
      user.username = username;
    }

    if (password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }

    if (role) {
      user.role = role;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the user has any transactions, inventory records, or ledger entries
    const txCount = await Transaction.count({ where: { user_id: userId } });
    const invCount = await Inventory.count({ where: { user_id: userId } });
    const ledgerCount = await LedgerEntry.count({ where: { user_id: userId } });

    if (txCount > 0 || invCount > 0 || ledgerCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete user because they have associated transactions or history. Please change their password to prevent login.' 
      });
    }

    await user.destroy();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
