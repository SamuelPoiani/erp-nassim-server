import express, { Request, Response } from 'express';
import { callRpc } from '../services/amqp';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { urls, llm, length, custom_prompt, temperature } = req.body;
        const serviceName = 'news_generator';
        const methodName = 'generate';

        const params = [urls, llm, length, custom_prompt, temperature];
        const result = await callRpc(serviceName, methodName, params);
        res.json(result);
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

export default router;