import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usersTable, usersRolesTable } from '../db/schema';
import { authenticateUser, checkRole } from '../middlewares/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const router = Router();

// Get all users (requires admin or higher)
router.get('/', 
  authenticateUser,
  checkRole(2), // Only admins and CEOs can list users
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          roleId: usersRolesTable.roleId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt
        })
        .from(usersTable)
        .leftJoin(usersRolesTable, eq(usersTable.id, usersRolesTable.userId));

      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

// Get single user by ID (requires admin or higher)
router.get('/:id',
  authenticateUser,
  checkRole(2),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          roleId: usersRolesTable.roleId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt
        })
        .from(usersTable)
        .leftJoin(usersRolesTable, eq(usersTable.id, usersRolesTable.userId))
        .where(eq(usersTable.id, parseInt(id)));

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

// Edit user (requires admin or higher)
router.put('/:id',
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, email, password, roleId } = req.body;

      // Get the target user's current role
      const targetUser = await db
        .select({
          id: usersTable.id,
          roleId: usersRolesTable.roleId
        })
        .from(usersTable)
        .leftJoin(usersRolesTable, eq(usersTable.id, usersRolesTable.userId))
        .where(eq(usersTable.id, parseInt(id)));

      if (!targetUser.length) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Check if the user is trying to update their own information
      const isSelfUpdate = req.user!.id === parseInt(id);

      // Security checks
      if (!isSelfUpdate) {
        // 1. Cannot edit users with higher or equal role
        if (targetUser[0].roleId! >= req.user!.roleId!) {
          res.status(403).json({ 
            message: 'Cannot edit users with equal or higher privileges than yourself' 
          });
          return;
        }

        // 2. Cannot set role higher than or equal to own role
        if (roleId && roleId >= req.user!.roleId!) {
          res.status(403).json({ 
            message: 'Cannot assign role equal to or higher than your own' 
          });
          return;
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (password) {
        const saltRounds = 10;
        updateData.hashedPassword = await bcrypt.hash(password, saltRounds);
      }
      updateData.updatedAt = new Date();

      // Update user in a transaction
      await db.transaction(async (tx) => {
        // Update user details
        if (Object.keys(updateData).length > 0) {
          await tx
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, parseInt(id)));
        }

        // Update role if provided and not a self-update
        if (roleId && !isSelfUpdate) {
          await tx
            .update(usersRolesTable)
            .set({ roleId })
            .where(eq(usersRolesTable.userId, parseInt(id)));
        }
      });

      // Get updated user data
      const updatedUser = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          roleId: usersRolesTable.roleId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt
        })
        .from(usersTable)
        .leftJoin(usersRolesTable, eq(usersTable.id, usersRolesTable.userId))
        .where(eq(usersTable.id, parseInt(id)));

      res.json({
        message: 'User updated successfully',
        user: updatedUser[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
