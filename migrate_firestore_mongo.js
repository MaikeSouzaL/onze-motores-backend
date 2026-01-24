import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import User from './src/models/User.js';
import Motor from './src/models/Motor.js';
import Empresa from './src/models/Empresa.js';

// Configurar ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// Inicializar Firebase Admin
// ATENÇÃO: Você precisa baixar sua chave de serviço do Firebase e salvar como serviceAccountKey.json
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Conectar MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onze-motores');
    console.log('🍃 MongoDB Conectado');
  } catch (error) {
    console.error('Erro ao conectar MongoDB:', error);
    process.exit(1);
  }
};

const migrateUsers = async () => {
  console.log('🔄 Migrando Usuários...');
  const snapshot = await db.collection('users').get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Converter timestamps se necessário
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    
    await User.findOneAndUpdate(
      { uid: data.uid },
      {
        uid: data.uid,
        email: data.email,
        name: data.name,
        photoUrl: data.photoURL,
        role: data.isAdmin ? 'admin' : 'user',
        createdAt
      },
      { upsert: true, new: true }
    );
    count++;
  }
  console.log(`✅ ${count} Usuários migrados.`);
};

const migrateEmpresas = async () => {
  console.log('🔄 Migrando Empresas...');
  const snapshot = await db.collection('empresas').get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    await Empresa.findOneAndUpdate(
      { uid: doc.id }, // ID do doc é o UID do usuário
      {
        uid: doc.id,
        nome: data.nome,
        nomeFantasia: data.nomeFantasia,
        cnpj: data.cnpj,
        email: data.email,
        telefone: data.telefone,
        endereco: data.endereco,
        numero: data.numero,
        bairro: data.bairro,
        cidade: data.cidade,
        cep: data.cep,
        logo: data.logo,
        chavePix: data.chavePix,
        nomeBanco: data.nomeBanco
      },
      { upsert: true }
    );
    count++;
  }
  console.log(`✅ ${count} Empresas migradas.`);
};

const migrateMotores = async () => {
  console.log('🔄 Migrando Motores...');
  const snapshot = await db.collection('motores').get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    await Motor.findOneAndUpdate(
      { _id: doc.id }, // Tenta manter o ID original se possível, ou usa query composta
      {
        uid: data.uid,
        marca: data.marca,
        modelo: data.modelo,
        potencia: data.potencia,
        rotacao: data.rotacao,
        voltagem: data.voltagem,
        frequencia: data.frequencia,
        fase: data.fase,
        amperagem: data.amperagem,
        // ... mapear outros campos
        observacoes: data.observacoes,
        createdAt: data.criadoEm ? new Date(data.criadoEm) : new Date(),
      },
      { upsert: true }
    );
    count++;
  }
  console.log(`✅ ${count} Motores migrados.`);
};

const runMigration = async () => {
  await connectDB();
  
  try {
    await migrateUsers();
    await migrateEmpresas();
    await migrateMotores();
    console.log('🚀 Migração completa!');
  } catch (error) {
    console.error('Erro na migração:', error);
  } finally {
    process.exit();
  }
};

runMigration();
