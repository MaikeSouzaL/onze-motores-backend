import express from 'express';
import { getSignatureConfig, saveSignatureConfig } from '../controllers/signatureConfigController.js';

const router = express.Router();

router.get('/:uid', getSignatureConfig);
router.post('/', saveSignatureConfig);

export default router;
