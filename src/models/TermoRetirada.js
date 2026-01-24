/**
 * TermoRetirada - controla equipamentos deixados na oficina e prazo de retirada
 *
 * Regras:
 * - um termo pertence a um usuário (uid)
 * - dataRetirada é a data prevista de retirada (prazo)
 * - retiradoEm define quando foi retirado (ou null)
 */

import mongoose from "mongoose";

const TermoRetiradaSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },

    // Dados do formulário
    nomeCliente: { type: String, required: true },
    telefoneCliente: { type: String, required: true },
    nomeMotor: { type: String, required: true },
    servicoExecutado: { type: String, default: "" },
    defeitoEncontrado: { type: String, required: true },

    // Datas
    dataEntrada: { type: Date, required: true },
    dataRetirada: { type: Date, required: true, index: true },

    // Evidências
    fotos: [{ type: String }], // data URI (base64) ou URL futura
    // Chave de identificação única por termo gerado
    // Cada geração de termo recebe uma nova idempotencyKey única
    idempotencyKey: { type: String },
    // Miniatura (1ª foto) hospedada no Google Drive (upload feito pelo backend)
    // Usada para exibir na lista de Prazos de Retirada.
    thumbUrl: { type: String },
    thumbDriveFileId: { type: String },
    assinatura: { type: String },

    // Status
    retirado: { type: Boolean, default: false, index: true },
    retiradoEm: { type: Date },
    
    // Status do Serviço (o que aconteceu com o motor)
    statusServico: {
      type: String,
      enum: [
        'concluido',           // Serviço realizado, problema resolvido
        'sem_conserto',        // Não foi possível consertar
        'cliente_desistiu',    // Cliente não quis fazer o serviço
        'aguardando_pecas',    // Faltam peças para conclusão
        'apenas_orcamento',    // Cliente só queria orçamento
        'pendente'             // Ainda não definido (padrão)
      ],
      default: 'pendente',
    },
    
    // Rastreabilidade - Quem fez o quê
    criadoPor: {
      funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
      funcionarioNome: { type: String }, // Denormalizado para não perder histórico
    },
    retiradoPor: {
      funcionarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
      funcionarioNome: { type: String }, // Denormalizado para não perder histórico
    },
    
    // Motivo ao voltar para pendente
    motivoVoltaPendente: { type: String },

    // Observações futuras
    observacoes: { type: String },
  },
  { timestamps: true },
);

// Índice composto útil para listagem do usuário ordenada por prazo
TermoRetiradaSchema.index({ uid: 1, retirado: 1, dataRetirada: 1 });
// Índice para melhorar performance de buscas por idempotencyKey (não unique)
TermoRetiradaSchema.index({ uid: 1, idempotencyKey: 1 });

export default mongoose.model("TermoRetirada", TermoRetiradaSchema);
