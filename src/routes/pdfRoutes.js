import express from 'express';
import { savePDF, getUserPDFs, deletePDF, updatePDFMetadata, mergePDFs, generateMotorPDF, renamePDFFile } from '../controllers/pdfController.js';

const router = express.Router();

router.post('/', savePDF);
router.get('/:uid', getUserPDFs);
router.delete('/:id', deletePDF);
router.patch('/:id/metadata', updatePDFMetadata);
router.patch('/:id/rename', renamePDFFile);
router.post('/merge', mergePDFs);
router.post('/generate-motor', generateMotorPDF);

export default router;