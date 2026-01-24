import express from 'express';
import { getPdfConfig, savePdfConfig } from '../controllers/pdfConfigController.js';

const router = express.Router();

router.get('/:uid', getPdfConfig);
router.post('/', savePdfConfig);

export default router;
