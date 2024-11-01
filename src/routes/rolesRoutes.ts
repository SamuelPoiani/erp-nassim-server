import { Router, Request, Response, NextFunction } from "express";
import { db } from '../db';
import { rolesTable } from '../db/schema';
import { authenticateUser, checkRole } from '../middlewares/auth';

const router = Router();

// Route to get all roles
router.get('/', authenticateUser, checkRole(1), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await db.select().from(rolesTable);
    res.json(roles);
  } catch (error) {
    next(error);
  }
});

export default router;