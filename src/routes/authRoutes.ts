import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usersTable, usersRolesTable } from '../db/schema';
import { authenticateUser, checkRole } from '../middlewares/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateToken } from '../middlewares/auth';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  roleId: z.number().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

router.get('/', 
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Since we attached the user to req in authenticateUser middleware,
      // we can use it to fetch the complete user data
      const user = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.id));

      if (!user.length) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user[0]);
    } catch (error) {
      next(error);
    }
  }
);

/* router.get('/:id', 
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(id)));
      if (!user.length) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.json(user[0]);
    } catch (error) {
      next(error);
    }
  }
); */

router.post('/register', 
  authenticateUser, 
  checkRole(2), // Only admins (roleId >= 2) can create new users
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, roleId = 1 } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existingUser.length > 0) {
        res.status(409).json({ message: 'User with this email already exists' });
        return;
      }

      // Validate roleId
      if (roleId < 1 || roleId > 3) {
        res.status(400).json({ message: 'Invalid role ID' });
        return;
      }

      // Security check: Cannot create users with higher or equal privileges
      if (roleId >= req.user!.roleId!) {
        res.status(403).json({ 
          message: 'Cannot create users with equal or higher privileges than yourself' 
        });
        return;
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user in a transaction
      const newUser = await db.transaction(async (tx) => {
        // Insert user
        const [user] = await tx.insert(usersTable).values({
          name,
          email,
          hashedPassword: hashedPassword,
        }).returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          createdAt: usersTable.createdAt,
        });

        // Assign role
        await tx.insert(usersRolesTable).values({
          userId: user.id,
          roleId: roleId,
        });

        return user;
      });

      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        next(error);
      }
    }
  }
);

router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user with role
    const user = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        hashedPassword: usersTable.hashedPassword,
        roleId: usersRolesTable.roleId
      })
      .from(usersTable)
      .leftJoin(usersRolesTable, eq(usersTable.id, usersRolesTable.userId))
      .where(eq(usersTable.email, email));

    if (!user.length) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user[0].hashedPassword);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      id: user[0].id,
      email: user[0].email,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        roleId: user[0].roleId
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else {
      next(error);
    }
  }
});

export default router;
