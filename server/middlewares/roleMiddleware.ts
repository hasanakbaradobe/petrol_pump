import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Insufficient permissions to access this resource' 
      });
    }
    next();
  };
};
