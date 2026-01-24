import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Motor from './src/models/Motor.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedFile = path.join(__dirname, 'seed.txt');

const parseSeedFile = (content) => {
  const lines = content.split('\n').map(l => l.trim());
  const paths = [];
  const symbols = [];
  
  // Extract Paths
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'path' && lines[i+2] === '(string)') {
        let color = "#000000";
        // Search backwards for 'color'
        for (let j = i - 1; j > Math.max(0, i - 20); j--) {
            if (lines[j] === 'color' && lines[j+2] === '(string)') {
                color = lines[j+1].replace(/"/g, '');
                break;
            }
        }
        
        const pathData = lines[i+1].replace(/"/g, '');
        paths.push({ path: pathData, color });
    }
  }
  
  // Extract Symbols
  for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'type' && lines[i+2] === '(string)') {
          const type = lines[i+1].replace(/"/g, '');
          if (['switch', 'run_cap', 'start_cap'].includes(type)) {
              let symbol = { type };
              const range = 20;
              const start = Math.max(0, i - range);
              const end = Math.min(lines.length, i + range);
              
              const extract = (key, typeLabel) => {
                  for (let k = start; k < end; k++) {
                      if (lines[k] === key && lines[k+2] === typeLabel) {
                          return lines[k+1].replace(/"/g, '');
                      }
                  }
                  return null;
              };
              
              symbol.x = parseFloat(extract('x', '(number)'));
              symbol.y = parseFloat(extract('y', '(number)'));
              symbol.size = parseFloat(extract('size', '(number)'));
              symbol.id = extract('id', '(string)');
              symbol.color = extract('color', '(string)');
              
              if (symbol.id && !symbols.find(s => s.id === symbol.id)) {
                  symbols.push(symbol);
              }
          }
      }
  }
  
  return { paths, symbols };
};

const seed = async () => {
  try {
    if (!fs.existsSync(seedFile)) {
        console.error('❌ seed.txt not found in backend directory');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    const content = fs.readFileSync(seedFile, 'utf-8');
    const { paths, symbols } = parseSeedFile(content);
    
    console.log(`📦 Parsed ${paths.length} paths and ${symbols.length} symbols.`);

    const motorData = {
        uid: "NxFjJvyKXKXlTQWgtrO759DQHnC2",
        marca: "Weg",
        modelo: "MOTOR MONOFASICO G56H 130x100",
        potencia: "3 CV",
        rotacao: "1750 RPM",
        voltagem: "110/220V",
        frequencia: "60",
        fase: "1",
        amperagem: "15/30A",
        
        pacote: "130mm",
        diametro: "100mm",
        canal: "32",
        area: "20mmm",
        
        gruposPorFase: "2",
        bobinasPorGrupo: "3",
        passe: "4-6-8",
        espiras: "10-15-20",
        bitolaFio: "2x17AWG",
        ligacao: "serie",
        
        possuiAuxiliar: true,
        auxiliar: {
            passe: "4-6-8",
            espiras: "7-10-20",
            fio: "2x22",
            capacitor: "516-630 110/ 60uf 250v"
        },
        
        fotoPlacaUrl: "https://drive.google.com/uc?export=view&id=19b2siv-cuh9SkWuwwMHMP0IsBydSXqWz",
        fotosMotorUrls: [
            "https://drive.google.com/uc?export=view&id=1zCXLeJmXnSWLFoC0A0U-CGSEWAW_HMMd"
        ],
        servicoImagem: "Google_Drive",
        temEsquema: true,
        versao: 1.1,
        totalFotos: 2,
        observacoes: "Importado do Firebase (ID original: motor_1765036197149)",
        
        esquemaLigacao: {
            paths: paths,
            symbols: symbols,
            textos: [],
            arcCoilConfig: { visible: false, coils: [] },
            coilConfig: { visible: false, coils: [] },
            legendConfig: { visible: false, data: "18/12/2025" },
            polosConfig: { 
                visible: true, 
                poles: 4, 
                color: "#000000",
                strokeWidth: 4,
                innerRadius: 130,
                middleRadius: 155,
                outerRadius: 180,
                phaseType: "mono",
                machineType: "motor",
                arcSweepDeg: 0,
                poleColors: ["#000000", "#ff3b30", "#ff3b30", "#000000", "#ff3b30", "#01293f", "#000000", "#ff3b30"]
            },
            statorConfig: { visible: false, slots: 24, radius: 150 },
            canvasSize: { width: 411.4285583496094, height: 568.7619018554688 },
            timestamp: "2025-12-18T16:43:55.290Z",
            version: "1.7",
            backgroundColor: "#ffffff"
        }
    };

    const motor = await Motor.create(motorData);
    console.log(`✅ Motor imported successfully! ID: ${motor._id}`);

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  }
};

seed();
