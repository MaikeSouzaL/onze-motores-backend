import express from 'express';
import { getEmpresa, saveEmpresa } from '../controllers/empresaController.js';

const router = express.Router();

router.get('/:uid', getEmpresa);
router.post('/', saveEmpresa);

export default router;
