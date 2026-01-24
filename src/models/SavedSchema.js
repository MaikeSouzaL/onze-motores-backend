import mongoose from 'mongoose';

// Sub-schemas para arrays aninhados
const symbolSchema = new mongoose.Schema({
  id: String,
  type: String,
  x: Number,
  y: Number,
  size: Number,
  color: String,
  label: String,
  rotation: Number,
}, { _id: false });

const pathSchema = new mongoose.Schema({
  path: String,
  color: String,
  strokeWidth: Number,
  dashArray: [Number],
}, { _id: false });

const textoSchema = new mongoose.Schema({
  id: String,
  texto: String,
  x: Number,
  y: Number,
  fontSize: Number,
  color: String,
  fontWeight: String,
}, { _id: false });

const savedSchemaSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true,
  },
  nome: {
    type: String,
    required: true,
    trim: true,
  },
  descricao: {
    type: String,
    trim: true,
    default: '',
  },
  // Dados completos do esquema
  schemaData: {
    paths: [pathSchema],
    textos: [textoSchema],
    symbols: [symbolSchema],
    statorConfig: {
      visible: Boolean,
      slots: Number,
      radius: Number,
    },
    coilConfig: {
      visible: Boolean,
      coils: [mongoose.Schema.Types.Mixed],
    },
    arcCoilConfig: {
      visible: Boolean,
      coils: [mongoose.Schema.Types.Mixed],
    },
    legendConfig: {
      visible: Boolean,
      modelo: String,
      marca: String,
      potencia: String,
      tensao: String,
      rpm: String,
      data: String,
    },
    polosConfig: {
      visible: Boolean,
      poles: Number,
      outerRadius: Number,
      innerRadius: Number,
      middleRadius: Number,
      arcSweepDeg: Number,
      strokeWidth: Number,
      color: String,
      phaseType: String,
      machineType: String,
      poleColors: [String],
    },
    canvasSize: {
      width: Number,
      height: Number,
    },
    timestamp: String,
    version: String,
  },
  // Miniatura do desenho (base64 ou URL)
  thumbnail: {
    type: String,
    default: '',
  },
  // Tags para facilitar busca
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  // Metadados
  modeloMotor: {
    type: String,
    trim: true,
    default: '',
  },
  marca: {
    type: String,
    trim: true,
    default: '',
  },
  potencia: {
    type: String,
    trim: true,
    default: '',
  },
  criadoEm: {
    type: Date,
    default: Date.now,
  },
  atualizadoEm: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Índices para melhorar performance de busca
savedSchemaSchema.index({ uid: 1, nome: 1 });
savedSchemaSchema.index({ uid: 1, criadoEm: -1 });
savedSchemaSchema.index({ uid: 1, tags: 1 });
savedSchemaSchema.index({ 'schemaData.legendConfig.modelo': 'text', nome: 'text', descricao: 'text' });

export default mongoose.model('SavedSchema', savedSchemaSchema);
