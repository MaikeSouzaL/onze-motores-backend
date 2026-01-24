import express from 'express';
import { getReceipts, createReceipt } from '../controllers/paymentReceiptController.js';

const router = express.Router();

router.get('/', getReceipts);
router.post('/', createReceipt);

export default router;
