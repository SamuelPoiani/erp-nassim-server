import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { postsTable, authorsTable, usersTable } from '../db/schema';
import { authenticateUser } from '../middlewares/auth';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/posts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const posts = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        description: postsTable.description,
        content: postsTable.content,
        image: postsTable.image,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        author: {
          id: authorsTable.id,
          name: usersTable.name,
          description: authorsTable.description,
        }
      })
      .from(postsTable)
      .leftJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
      .leftJoin(usersTable, eq(authorsTable.userId, usersTable.id));
    
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        description: postsTable.description,
        content: postsTable.content,
        image: postsTable.image,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        author: {
          id: authorsTable.id,
          name: usersTable.name,
          description: authorsTable.description,
        }
      })
      .from(postsTable)
      .leftJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
      .leftJoin(usersTable, eq(authorsTable.userId, usersTable.id))
      .where(eq(postsTable.id, parseInt(id)));

    if (!post.length) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    res.json(post[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateUser, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if the authenticated user is an author
    const author = await db
      .select()
      .from(authorsTable)
      .where(eq(authorsTable.userId, req.user!.id));

    if (!author.length) {
      res.status(403).json({ message: 'Only authors can create posts' });
      return;
    }

    const { title, description, content, image } = req.body;

    // Validate required fields
    if (!title || !description || !content) {
      res.status(400).json({ message: 'Title, description, and content are required' });
      return;
    }

    // Create new post
    const newPost = await db.insert(postsTable).values({
      title,
      description,
      content,
      image: image || null,
      authorId: author[0].id,
    }).returning();

    res.status(201).json(newPost[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/edit/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, content, image } = req.body;

    // First, get the post and check if it exists
    const existingPost = await db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
      })
      .from(postsTable)
      .where(eq(postsTable.id, parseInt(id)));

    if (!existingPost.length) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Get the author details of the authenticated user
    const author = await db
      .select()
      .from(authorsTable)
      .where(eq(authorsTable.userId, req.user!.id));

    if (!author.length) {
      res.status(403).json({ message: 'Only authors can edit posts' });
      return;
    }

    // Check if the authenticated author owns this post
    if (existingPost[0].authorId !== author[0].id) {
      res.status(403).json({ message: 'You can only edit your own posts' });
      return;
    }

    // Validate required fields
    if (!title || !description || !content) {
      res.status(400).json({ message: 'Title, description, and content are required' });
      return;
    }

    // Update the post
    const updatedPost = await db
      .update(postsTable)
      .set({
        title,
        description,
        content,
        image: image || null,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, parseInt(id)))
      .returning();

    res.json(updatedPost[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
