import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { newslettersTable } from '../db/schema';
import { authenticateUser, checkRole } from '../middlewares/auth';
import { eq } from 'drizzle-orm';

const router = Router();

const emailSchema = z.object({
  email: z.string().email()
});

router.post('/subscribe', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = emailSchema.parse(req.body);
    await db.insert(newslettersTable).values({ email });
    res.json({ message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
      res.status(409).json({ message: 'This email is already subscribed to the newsletter' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
});

router.get('/', 
  authenticateUser,
  checkRole(1),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const newsletters = await db.select().from(newslettersTable);
      res.json(newsletters);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/unsubscribe',
  authenticateUser,
  checkRole(2),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      
      const result = await db
        .delete(newslettersTable)
        .where(eq(newslettersTable.email, email))
        .returning();

      if (!result.length) {
        res.status(404).json({ message: 'Email not found in newsletter list' });
        return;
      }

      res.json({ message: 'Successfully unsubscribed from newsletter' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        next(error);
      }
    }
  }
);

export default router;