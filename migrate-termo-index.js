/**
 * Script de migração para remover o índice unique do TermoRetirada
 * 
 * Execução:
 *   node migrate-termo-index.js
 * 
 * Este script remove o índice unique que impedia a criação de múltiplos termos
 * com mesma idempotencyKey, permitindo que cada termo seja independente.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, ".env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI não encontrado no .env");
  process.exit(1);
}

async function migrate() {
  try {
    console.log("🔄 Conectando ao MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("termoretirads");

    // Listar todos os índices atuais
    console.log("\n📋 Índices atuais:");
    const indexes = await collection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}:`, index.key, index.unique ? "(unique)" : "");
    });

    // Verificar se existe índice unique para uid + idempotencyKey
    const uniqueIndex = indexes.find(
      (idx) =>
        idx.unique &&
        idx.key.uid === 1 &&
        idx.key.idempotencyKey === 1
    );

    if (uniqueIndex) {
      console.log(`\n🔧 Removendo índice unique: ${uniqueIndex.name}`);
      await collection.dropIndex(uniqueIndex.name);
      console.log("✅ Índice unique removido com sucesso");

      // Criar novo índice não-unique para performance
      console.log("\n🔧 Criando novo índice não-unique...");
      await collection.createIndex({ uid: 1, idempotencyKey: 1 });
      console.log("✅ Novo índice criado com sucesso");
    } else {
      console.log("\n⚠️  Índice unique não encontrado (já foi removido ou não existe)");
      
      // Verificar se existe o índice não-unique
      const nonUniqueIndex = indexes.find(
        (idx) =>
          !idx.unique &&
          idx.key.uid === 1 &&
          idx.key.idempotencyKey === 1
      );
      
      if (!nonUniqueIndex) {
        console.log("🔧 Criando índice não-unique...");
        await collection.createIndex({ uid: 1, idempotencyKey: 1 });
        console.log("✅ Índice criado com sucesso");
      } else {
        console.log("✅ Índice não-unique já existe");
      }
    }

    // Listar índices finais
    console.log("\n📋 Índices após migração:");
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index) => {
      console.log(`  - ${index.name}:`, index.key, index.unique ? "(unique)" : "");
    });

    console.log("\n✅ Migração concluída com sucesso!");
    console.log("\n📌 Próximos passos:");
    console.log("   1. Reinicie o servidor backend para aplicar as mudanças");
    console.log("   2. Teste a criação de múltiplos termos com dados iguais");
    console.log("   3. Verifique que cada termo é criado independentemente");

  } catch (error) {
    console.error("\n❌ Erro na migração:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Desconectado do MongoDB");
  }
}

// Executar migração
migrate();
