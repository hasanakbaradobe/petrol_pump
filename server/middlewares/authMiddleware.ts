import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    [key: string]: any;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here', (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
      }
      
      req.user = decoded as { id: number; role: string };
      next();
    });
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }
};
