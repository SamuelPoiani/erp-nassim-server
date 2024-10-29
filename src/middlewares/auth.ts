import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usersTable, usersRolesTable, rolesTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Update Request type to include user role
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        roleId: number | null;
      }
    }
  }
}

// JWT utilities
export const generateToken = (payload: { id: number; email: string }) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!) as { id: number; email: string };
};

// New middleware to check role
export const checkRole = (minimumRoleId: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = await db
        .select({
          roleId: usersRolesTable.roleId
        })
        .from(usersRolesTable)
        .where(eq(usersRolesTable.userId, req.user!.id));

      // Check if user has a role and if their roleId is high enough
      // Higher numbers (3:CEO, 2:admin) have more permissions than lower numbers (1:staff)
      if (!userRole.length || userRole[0].roleId === null || userRole[0].roleId < minimumRoleId) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Modified authenticateUser to handle null roleId
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No valid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyToken(token);

      // Check if user exists and get their role
      const user = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          roleId: usersRolesTable.roleId
        })
        .from(usersTable)
        .leftJoin(usersRolesTable, eq(usersTable.id, usersRolesTable.userId))
        .where(eq(usersTable.id, decoded.id));

      if (!user.length) {
        res.status(401).json({ message: 'User no longer exists' });
        return;
      }

      // Now this assignment will work because the types match
      req.user = {
        id: user[0].id,
        email: user[0].email,
        roleId: user[0].roleId
      };
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
  } catch (error) {
    next(error);
  }
};
