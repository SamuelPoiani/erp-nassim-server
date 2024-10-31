import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { authorsTable } from '../db/schema';
import { authenticateUser } from '../middlewares/auth';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authors = await db.select().from(authorsTable);
    res.json(authors);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const author = await db.select().from(authorsTable).where(eq(authorsTable.id, parseInt(id)));
    if (!author.length) {
      res.status(404).json({ message: 'Author not found' });
      return;
    }
    res.json(author[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
