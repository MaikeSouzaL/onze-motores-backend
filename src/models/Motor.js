import mongoose from "mongoose";

const motorSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true }, // ID do usuário dono (vinculado ao User)

    // Dados Principais da Placa
    marca: { type: String, trim: true },
    modelo: { type: String, trim: true },
    potencia: { type: String, trim: true },
    rotacao: { type: String, trim: true }, // RPM
    voltagem: { type: String, trim: true },
    frequencia: { type: String, trim: true }, // Hz
    fase: { type: String, trim: true }, // Monofásico, Trifásico
    amperagem: { type: String, trim: true },
    ip: { type: String, trim: true }, // Índice de Proteção

    // Dados de Bobinagem
    pacote: { type: String, trim: true },
    diametro: { type: String, trim: true },
    canal: { type: String, trim: true }, // Número de ranhuras
    area: { type: String, trim: true },

    condutorPorRanhura: { type: String, trim: true }, // Fios por canal
    gruposPorFase: { type: String, trim: true },
    bobinasPorGrupo: { type: String, trim: true },
    passe: { type: String, trim: true }, // Ex: 1-4-8
    espiras: { type: String, trim: true },
    bitolaFio: { type: String, trim: true }, // AWG
    ligacao: { type: String, trim: true }, // Estrela, Triângulo, Série, Paralelo

    // Enrolamento Auxiliar (para monofásicos)
    possuiAuxiliar: { type: Boolean, default: false },
    auxiliar: {
      passe: { type: String, trim: true },
      espiras: { type: String, trim: true },
      fio: { type: String, trim: true },
      capacitor: { type: String, trim: true },
    },

    // Multimídia
    fotoPlacaUrl: { type: String }, // URL da imagem da placa
    fotosMotorUrls: [{ type: String }], // Array de URLs de outras fotos
    servicoImagem: { type: String }, // Imagem do serviço/desenho
    
    // PDF do Motor (armazenado no Google Drive)
    pdfMotorUrl: { type: String }, // URL do PDF do motor
    pdfMotorId: { type: String }, // ID do arquivo no Google Drive (para facilitar exclusão)
    pdfMotorName: { type: String }, // Nome original do arquivo PDF (para exibição no app)

    // Esquema de Ligação (Canvas)
    temEsquema: { type: Boolean, default: false },
    esquemaLigacao: {
      paths: [{ type: Object }], // Caminhos SVG/Canvas
      textos: [{ type: Object }], // Textos inseridos
      symbols: [{ type: Object }], // Símbolos inseridos

      // Configurações avançadas do esquema
      statorConfig: { type: Object }, // Configuração do estator
      coilConfig: { type: Object }, // Gabarito de bobinas retas
      arcCoilConfig: { type: Object }, // Gabarito de bobinas em arco (Meia Lua)
      legendConfig: { type: Object }, // Legenda técnica
      polosConfig: { type: Object }, // Configuração de polos
      canvasSize: { type: Object }, // Dimensões do canvas

      timestamp: { type: String },
      version: { type: String },
      backgroundColor: { type: String },
    },

    // Metadados
    observacoes: { type: String },
    versao: { type: Number, default: 1 },
    totalFotos: { type: Number, default: 0 },

    // Tags para busca/filtro
    tags: [{ type: String }],
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
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

// Índices compostos para busca
motorSchema.index({ uid: 1, marca: 1 });
motorSchema.index({ uid: 1, modelo: 1 });

const Motor = mongoose.model("Motor", motorSchema);

export default Motor;
