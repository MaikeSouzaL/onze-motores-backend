import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true }, // ID do usuário dono (vinculado ao User do Firebase)
    nome: { type: String, required: true, trim: true },
    telefone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    documento: { type: String, trim: true }, // CPF ou CNPJ
    endereco: {
      rua: String,
      numero: String,
      bairro: String,
      cidade: String,
      estado: String,
      cep: String,
    },
    fotos: [{ type: String }], // Array de URLs de fotos (RG, CPF, Fachada, etc.)
    observacoes: { type: String },
    contagemDocumentos: { type: Number, default: 0 }, // Para estatísticas (opcional)
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índice para busca rápida por nome dentro dos clientes do usuário
clientSchema.index({ uid: 1, nome: 1 });

const Client = mongoose.model("Client", clientSchema);

export default Client;
