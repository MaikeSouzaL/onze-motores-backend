import express from 'express';
import {
  getMotors,
  createMotor,
  updateMotor,
  deleteMotor,
  countMotors,
  getMotorById,
  duplicateMotor,
  suggestSimilarMotors,
  getSimilarMotors,
  uploadMotorPdf,
  deleteMotorPdf,
} from '../controllers/motorController.js';

const router = express.Router();

router.get('/count', countMotors);
router.get('/', getMotors);
router.post('/', createMotor);
router.post('/suggest-similar', suggestSimilarMotors);
router.get('/:id', getMotorById);
router.get('/:id/similar', getSimilarMotors);
router.post('/:id/duplicate', duplicateMotor);
router.post('/:id/upload-pdf', uploadMotorPdf);
router.delete('/:id/pdf', deleteMotorPdf);
router.put('/:id', updateMotor);
router.delete('/:id', deleteMotor);

export default router;
