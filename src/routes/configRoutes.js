import express from 'express';
import { getAppConfig, updateAppConfig } from '../controllers/configController.js';

const router = express.Router();

router.get('/', getAppConfig);
router.post('/', updateAppConfig); // TODO: Adicionar middleware de adminAuth

export default router;
