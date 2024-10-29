import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './userRoutes';
import blogRoutes from './blog';
import authorRoutes from './authors';
import newsletterRoutes from './newsletters';
import generateContentRoutes from './generateContent';
import statsRoutes from './stats';

const router = Router();

router.use('/auth/user', authRoutes);
router.use('/users', userRoutes);
router.use('/blog', blogRoutes);
router.use('/blog/author', authorRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/generate', generateContentRoutes);
router.use('/stats', statsRoutes);

export default router;
