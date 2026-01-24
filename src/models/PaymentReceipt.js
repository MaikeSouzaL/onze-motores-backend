import mongoose from 'mongoose';

const paymentReceiptSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  
  planType: { type: String, enum: ['monthly', 'annual'], required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true }, // em centavos
  amountFormatted: { type: String, required: true },
  
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  stripeSessionId: { type: String },
  
  paymentDate: { type: Date, required: true },
  receiptNumber: { type: String, required: true },

}, {
  timestamps: true,
});

const PaymentReceipt = mongoose.model('PaymentReceipt', paymentReceiptSchema);

export default PaymentReceipt;
