import mongoose from "mongoose";

const savedPDFSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true }, // ID do usuário

    category: {
      type: String,
      enum: ["termo", "orcamento", "recibo", "laudo", "garantia"],
      required: true,
    },

    clientName: { type: String, required: true },
    clientPhone: { type: String },

    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true }, // Link do Google Drive
    driveFileId: { type: String }, // ID do arquivo no Google Drive (para deleção)

    metadata: {
      equipamento: String,
      defeito: String,
      valor: String,
      prazoRetirada: String,
      termoRetiradaId: String, // ID do termo de retirada associado
      clientPhone: String,
      observacoes: String,
      retirado: Boolean, // Flag para indicar se já foi retirado
      // Outros campos flexíveis
    },
  },
  {
    timestamps: true,
  }
);

const SavedPDF = mongoose.model("SavedPDF", savedPDFSchema);

export default SavedPDF;
