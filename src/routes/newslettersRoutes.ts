import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { newslettersTable } from '../db/schema';
import { authenticateUser, checkRole } from '../middlewares/auth';

const router = Router();

router.post('/subscribe', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    await db.insert(newslettersTable).values({ email });
    res.json({ message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    next(error);
  }
});

router.get('/', 
  authenticateUser,
  checkRole(2), // Requires admin role (roleId >= 2)
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscriptions = await db
        .select({
          id: newslettersTable.id,
          email: newslettersTable.email,
          createdAt: newslettersTable.createdAt,
          updatedAt: newslettersTable.updatedAt
        })
        .from(newslettersTable);
      
      res.json(subscriptions);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
