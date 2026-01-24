import express from 'express';
import { getUsers } from '../controllers/adminController.js';

const router = express.Router();

router.get('/users', getUsers); // TODO: Middleware de proteção admin

export default router;
