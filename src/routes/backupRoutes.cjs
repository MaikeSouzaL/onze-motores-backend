const express = require('express');
const router = express.Router();
const { backupService } = require('../services/backup.service.cjs');

/**
 * Rota para executar backup manual
 * POST /api/admin/backup/execute
 */
router.post('/execute', async (req, res) => {
  try {
    console.log('📥 Requisição de backup manual recebida');

    const result = await backupService.executeBackup();

    res.json({
      success: true,
      message: 'Backup executado com sucesso!',
      data: {
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        size: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Erro ao executar backup manual:', error);
    res.status(500).json({
      success: false,
      error: 'Falha ao executar backup',
      message: error.message,
    });
  }
});

/**
 * Rota para testar configuração do backup
 * GET /api/admin/backup/test
 */
router.get('/test', async (req, res) => {
  try {
    // Verificar se credenciais estão configuradas
    const hasCredentials = !!(
      backupService.driveConfig.clientId &&
      backupService.driveConfig.clientSecret &&
      backupService.driveConfig.refreshToken
    );

    // Tentar obter access token
    let tokenValid = false;
    let tokenError = null;

    if (hasCredentials) {
      try {
        await backupService.getAccessToken();
        tokenValid = true;
      } catch (error) {
        tokenError = error.message;
      }
    }

    res.json({
      success: true,
      config: {
        hasCredentials,
        tokenValid,
        tokenError,
        backupDir: backupService.backupDir,
        mongoUri: backupService.mongoConfig.uri.replace(/\/\/.*@/, '//<credentials>@'), // Ocultar senha
        database: backupService.mongoConfig.database,
        driveFolderId: backupService.driveConfig.folderId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Falha ao testar configuração',
      message: error.message,
    });
  }
});

/**
 * Rota para obter status do último backup
 * GET /api/admin/backup/status
 */
router.get('/status', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    // Listar arquivos de backup locais
    let localBackups = [];
    try {
      const files = await fs.readdir(backupService.backupDir);
      
      for (const file of files) {
        const filePath = path.join(backupService.backupDir, file);
        const stats = await fs.stat(filePath);
        
        localBackups.push({
          name: file,
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          created: stats.mtime.toISOString(),
          age: `${Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60))}h atrás`,
        });
      }

      // Ordenar por data (mais recente primeiro)
      localBackups.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
      console.error('Erro ao listar backups locais:', error.message);
    }

    res.json({
      success: true,
      status: {
        isRunning: backupService.isRunning,
        schedulerActive: true,
        schedule: 'Diário às 3:00 AM',
        localBackups: localBackups.slice(0, 10), // Mostrar últimos 10
        totalLocalBackups: localBackups.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Falha ao obter status',
      message: error.message,
    });
  }
});

module.exports = router;
