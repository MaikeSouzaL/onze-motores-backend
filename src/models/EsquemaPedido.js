import mongoose from 'mongoose';

const esquemaPedidoSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  
  motorDados: { type: Object, required: true }, // Dados do motor para o qual se pede o esquema
  observacoes: { type: String },
  status: { 
    type: String, 
    enum: ['pendente', 'em_analise', 'concluido', 'rejeitado'],
    default: 'pendente' 
  },
  resposta: { type: String }, // Link ou texto da resposta
  
}, {
  timestamps: true,
});

const EsquemaPedido = mongoose.model('EsquemaPedido', esquemaPedidoSchema);

export default EsquemaPedido;
