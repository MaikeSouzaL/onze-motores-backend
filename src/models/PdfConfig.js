import mongoose from 'mongoose';

const pdfConfigSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  
  mostrarLogoNoHeader: { type: Boolean, default: true },
  mostrarLogoNoFooter: { type: Boolean, default: false },

}, {
  timestamps: true,
});

const PdfConfig = mongoose.model('PdfConfig', pdfConfigSchema);

export default PdfConfig;
