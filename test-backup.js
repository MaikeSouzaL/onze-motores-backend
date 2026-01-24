/**
 * Script de Teste do Sistema de Backup
 * 
 * Testa a configuração e executa um backup de teste
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { backupService } = require('./src/services/backup.service.cjs');

async function runTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🧪 TESTE DO SISTEMA DE BACKUP AUTOMÁTICO      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Teste 1: Verificar configurações
  console.log('📋 TESTE 1: Verificar Configurações');
  console.log('─────────────────────────────────────');
  
  const hasClientId = !!backupService.driveConfig.clientId;
  const hasClientSecret = !!backupService.driveConfig.clientSecret;
  const hasRefreshToken = !!backupService.driveConfig.refreshToken;
  const hasFolderId = !!backupService.driveConfig.folderId;

  console.log(`✓ Client ID: ${hasClientId ? '✅ OK' : '❌ FALTANDO'}`);
  console.log(`✓ Client Secret: ${hasClientSecret ? '✅ OK' : '❌ FALTANDO'}`);
  console.log(`✓ Refresh Token: ${hasRefreshToken ? '✅ OK' : '❌ FALTANDO'}`);
  console.log(`✓ Folder ID: ${hasFolderId ? '✅ OK' : '❌ FALTANDO'}`);
  console.log(`✓ MongoDB URI: ${backupService.mongoConfig.uri}`);
  console.log(`✓ MongoDB Database: ${backupService.mongoConfig.database}`);
  
  if (!hasClientId || !hasClientSecret || !hasRefreshToken || !hasFolderId) {
    console.error('\n❌ ERRO: Configurações incompletas!');
    console.error('Configure as variáveis de ambiente no arquivo .env\n');
    process.exit(1);
  }

  // Teste 2: Verificar autenticação com Google Drive
  console.log('\n📋 TESTE 2: Autenticação com Google Drive');
  console.log('─────────────────────────────────────');
  
  try {
    const token = await backupService.getAccessToken();
    console.log('✅ Access Token obtido com sucesso!');
    console.log(`   Token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Erro ao obter Access Token:', error.message);
    console.error('\nDica: Verifique se o Refresh Token está válido.');
    console.error('Se necessário, regenere seguindo: REGENERAR_GOOGLE_DRIVE_TOKEN.md\n');
    process.exit(1);
  }

  // Teste 3: Verificar se mongodump está instalado
  console.log('\n📋 TESTE 3: Verificar MongoDB Tools');
  console.log('─────────────────────────────────────');
  
  const { exec } = await import('child_process');
  const checkMongodump = new Promise((resolve) => {
    exec('mongodump --version', (error, stdout) => {
      if (error) {
        console.error('❌ mongodump não encontrado!');
        console.error('   Instale MongoDB Database Tools:');
        console.error('   https://www.mongodb.com/try/download/database-tools\n');
        resolve(false);
      } else {
        console.log('✅ mongodump instalado:');
        console.log(`   ${stdout.trim()}`);
        resolve(true);
      }
    });
  });

  const hasMongodump = await checkMongodump;
  if (!hasMongodump) {
    console.error('\n⚠️ AVISO: Backup não poderá ser executado sem mongodump');
    console.error('Instale e tente novamente.\n');
    process.exit(1);
  }

  // Teste 4: Executar backup de teste
  console.log('\n📋 TESTE 4: Executar Backup de Teste');
  console.log('─────────────────────────────────────');
  console.log('⚠️ Este teste criará um backup real!');
  console.log('   Pressione Ctrl+C para cancelar em 5 segundos...\n');
  
  // Dar tempo para cancelar
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const result = await backupService.executeBackup();
    
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║      ✅ TODOS OS TESTES PASSARAM!                ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\n📊 Resultado do Backup de Teste:');
    console.log(`   - Arquivo: ${result.fileName}`);
    console.log(`   - Tamanho: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Drive ID: ${result.fileId}`);
    console.log(`   - URL: ${result.fileUrl}`);
    console.log('\n✅ O sistema de backup está funcionando corretamente!');
    console.log('✅ Backups automáticos serão executados diariamente às 3:00 AM\n');
    
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════╗');
    console.error('║         ❌ ERRO NO BACKUP DE TESTE!              ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error(`\n❌ Erro: ${error.message}`);
    console.error(`📋 Stack: ${error.stack}\n`);
    process.exit(1);
  }
}

// Executar testes
runTests().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
