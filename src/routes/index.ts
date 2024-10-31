import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import blogRoutes from './blogRoutes';
import authorRoutes from './authorsRoutes';
import newsletterRoutes from './newslettersRoutes';
import generateContentRoutes from './generateContent';
import statsRoutes from './statsRoutes';

const router = Router();

router.use('/auth/user', authRoutes);
router.use('/users', userRoutes);
router.use('/blog', blogRoutes);
router.use('/blog/author', authorRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/generate', generateContentRoutes);
router.use('/stats', statsRoutes);

export default router;
