import PaymentReceipt from '../models/PaymentReceipt.js';

/**
 * @desc    Listar recibos do usuário
 * @route   GET /api/payment-receipts
 */
export const getReceipts = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'UID obrigatório' });
    }

    const receipts = await PaymentReceipt.find({ uid }).sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Criar recibo (geralmente chamado via Webhook, mas exposto para casos manuais)
 * @route   POST /api/payment-receipts
 */
export const createReceipt = async (req, res) => {
  try {
    const receiptData = req.body;

    const receipt = await PaymentReceipt.create(receiptData);

    res.status(201).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
