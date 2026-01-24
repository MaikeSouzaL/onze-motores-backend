import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CoilTemplate from './src/models/CoilTemplate.js';

dotenv.config();

const coilTemplateData = {
  uid: "NxFjJvyKXKXlTQWgtrO759DQHnC2",
  nome: "Moto 4 polos",
  modeloMotor: "Awg",
  descricao: "Motor de bomba de água",
  tipoSalvamento: "completo",
  
  // Estrutura do Gabarito (MotorEsquemaLigacao)
  dados: {
    arcCoilConfig: {
      visible: true,
      coils: [
        {
          id: "1765197630297",
          centerX: 74.92521864907847,
          centerY: 277.83409856525367,
          radius: 92.74590168198915,
          startAngle: 47.165806606758416,
          endAngle: 127.39285786446364,
          rotation: 91.63131809938226,
          strokeWidth: 4,
          color: "#01293f",
          locked: true
        },
        {
          id: "1765197737130",
          centerX: 211.88671377388204,
          centerY: 276.9865944728334,
          radius: 136.92663927168502,
          startAngle: 26.651293360943345,
          endAngle: 101.54432412417226,
          rotation: -56.053675683245245,
          strokeWidth: 4,
          color: "#01293f",
          locked: true
        },
        {
          id: "1765197841846",
          centerX: 150.92539150745097,
          centerY: 248.47688161685483,
          radius: 142.6928241021351,
          startAngle: 67.51729424240443,
          endAngle: 123.85871796625112,
          rotation: 177.59472067254123,
          strokeWidth: 4,
          color: "#FF3B30",
          locked: true
        },
        {
          id: "1765197868884",
          centerX: 136.210374873395,
          centerY: 375.5931986202981,
          radius: 104.55807951615891,
          startAngle: 43.20561470745054,
          endAngle: 127.78339843244319,
          rotation: 4.67972697396371,
          strokeWidth: 4,
          color: "#FF3B30",
          locked: true
        },
        {
          id: "1765198104399",
          centerX: 123.64183989862899,
          centerY: 242.47788860410256,
          radius: 80.3740436865619,
          startAngle: 52.16513390609211,
          endAngle: 152.51599297630545,
          rotation: 125.15466468549874,
          strokeWidth: 4,
          color: "#8b5cf6",
          locked: true
        },
        {
          id: "1765198194505",
          centerX: 106.8864753577577,
          centerY: 344.5505651103355,
          radius: 61.822294448032515,
          startAngle: 59.03565122438717,
          endAngle: 160.1333557036545,
          rotation: 33.28022805890908,
          strokeWidth: 4,
          color: "#8b5cf6",
          locked: true
        },
        {
          id: "1765198316151",
          centerX: 175.11755437029404,
          centerY: 336.1624368431571,
          radius: 80,
          startAngle: 7.462621862985027,
          endAngle: 93.54835815194261,
          rotation: -4.408018209941332,
          strokeWidth: 4,
          color: "#8b5cf6",
          locked: true
        },
        {
          id: "1765198344896",
          centerX: 187.01947027992745,
          centerY: 252.06242762436108,
          radius: 92.01864182363282,
          startAngle: 82.0750226022919,
          endAngle: 172.8770150964184,
          rotation: 189.56263748235114,
          strokeWidth: 4,
          color: "#8b5cf6",
          visible: true
        }
      ]
    },
    legendConfig: {
      visible: false,
      marca: "",
      modelo: "",
      potencia: "",
      tensao: "",
      rpm: "",
      data: "08/12/2025"
    },
    statorConfig: {
      visible: true,
      slots: 24,
      radius: 150
    },
    paths: [],
    symbols: [],
    textos: []
  },

  isPublic: false
};

const seedCoilTemplate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Conectado ao MongoDB');

    // Tentar atualizar se existir pelo nome e uid, ou criar novo
    const result = await CoilTemplate.findOneAndUpdate(
      { uid: coilTemplateData.uid, nome: coilTemplateData.nome },
      coilTemplateData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('✅ CoilTemplate salvo com sucesso:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao salvar CoilTemplate:', error);
    process.exit(1);
  }
};

seedCoilTemplate();
