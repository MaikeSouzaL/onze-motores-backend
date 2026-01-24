import mongoose from 'mongoose';

const coilTemplateSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  
  nome: { type: String, required: true },
  dados: { type: Object, required: true }, // Dados técnicos do gabarito
  
  isPublic: { type: Boolean, default: false }, // Se é um template público (do sistema)

}, {
  timestamps: true,
});

const CoilTemplate = mongoose.model('CoilTemplate', coilTemplateSchema);

export default CoilTemplate;
