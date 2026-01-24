import express from 'express';
import { savePDF, getUserPDFs, deletePDF, updatePDFMetadata, mergePDFs, generateMotorPDF } from '../controllers/pdfController.js';

const router = express.Router();

router.post('/', savePDF);
router.get('/:uid', getUserPDFs);
router.delete('/:id', deletePDF);
router.patch('/:id/metadata', updatePDFMetadata);
router.post('/merge', mergePDFs);
router.post('/generate-motor', generateMotorPDF);

export default router;