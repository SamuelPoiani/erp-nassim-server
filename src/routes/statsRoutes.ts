import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { postsTable, newslettersTable, usersTable } from '../db/schema';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get posts count
    const postsCount = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(postsTable);

    // Get newsletter subscribers count
    const newsletterCount = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(newslettersTable);

    // Get users count
    const usersCount = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(usersTable);

    res.json({
      stats: {
        totalPosts: postsCount[0].count,
        totalNewsletterSubscribers: newsletterCount[0].count,
        totalUsers: usersCount[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
