import express from 'express';
import {
  exportMotorsToCSV,
  exportMotorsBackup,
  exportMotorsReport,
  exportMotorsStats
} from '../controllers/exportController.js';

const router = express.Router();

// CSV Export
router.get('/motors/csv', exportMotorsToCSV);

// Backup completo (JSON)
router.get('/motors/backup', exportMotorsBackup);

// Relatório customizado
router.post('/motors/report', exportMotorsReport);

// Estatísticas
router.get('/motors/stats', exportMotorsStats);

export default router;
