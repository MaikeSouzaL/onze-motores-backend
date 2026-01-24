import mongoose from 'mongoose';

const signatureConfigSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  
  assinaturaUrl: { type: String }, // URL da imagem da assinatura
  nomeAssinatura: { type: String }, // Nome do responsável
  cargoAssinatura: { type: String }, // Cargo (ex: Técnico Responsável)
  mostrarEmDocumentos: { type: Boolean, default: true },

}, {
  timestamps: true,
});

const SignatureConfig = mongoose.model('SignatureConfig', signatureConfigSchema);

export default SignatureConfig;
