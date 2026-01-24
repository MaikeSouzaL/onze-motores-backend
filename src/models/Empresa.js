import mongoose from 'mongoose';

const empresaSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true }, // 1:1 com Usuário
  
  nome: { type: String, trim: true }, // Razão Social
  nomeFantasia: { type: String, trim: true },
  cnpj: { type: String, trim: true },
  
  // Contato
  email: { type: String, trim: true, lowercase: true },
  telefone: { type: String, trim: true },
  
  // Endereço
  endereco: { type: String, trim: true },
  numero: { type: String, trim: true },
  bairro: { type: String, trim: true },
  cidade: { type: String, trim: true },
  cep: { type: String, trim: true },
  uf: { type: String, trim: true, uppercase: true, maxLength: 2 },
  
  // Visual
  logo: { type: String }, // URL da logo
  
  // Financeiro (para recibos/PIX)
  chavePix: { type: String, trim: true },
  nomeBanco: { type: String, trim: true },
  tipoChavePix: { type: String, trim: true },
  
}, {
  timestamps: true,
});

const Empresa = mongoose.model('Empresa', empresaSchema);

export default Empresa;
