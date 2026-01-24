const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

/**
 * Serviço de Backup Automático do MongoDB para Google Drive
 * 
 * Executa backup diário do banco de dados e salva no Google Drive
 */

class BackupService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.backupDir = path.join(__dirname, '../../backups');
    this.isRunning = false;
    
    // Configurações do Google Drive (mesmas do app)
    this.driveConfig = {
      clientId: process.env.DRIVE_CLIENT_ID,
      clientSecret: process.env.DRIVE_CLIENT_SECRET,
      refreshToken: process.env.DRIVE_REFRESH_TOKEN,
      folderId: process.env.DRIVE_BACKUP_FOLDER_ID,
    };

    // Configurações do MongoDB
    this.mongoConfig = {
      uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
      database: process.env.MONGODB_DATABASE || 'onze-motores',
    };
  }

  /**
   * Obtém Access Token do Google Drive
   */
  async getAccessToken() {
    // Se já tem token válido, retorna
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const { clientId, clientSecret, refreshToken } = this.driveConfig;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Credenciais do Google Drive não configuradas');
    }

    try {
      console.log('🔑 Obtendo Access Token do Google Drive...');

      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Token expira em 1 hora, renovamos com 5 min de antecedência
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      console.log('✅ Access Token obtido com sucesso');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Erro ao obter access token:', error.message);
      if (error.response) {
        console.error('❌ Resposta do Google:', error.response.data);
      }
      throw new Error(`Falha na autenticação com Google Drive: ${error.message}`);
    }
  }

  /**
   * Cria o diretório de backups se não existir
   */
  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      console.log('📁 Criando diretório de backups...');
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * Executa o comando mongodump para criar o backup
   */
  async createMongoBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      console.log('📦 Criando backup do MongoDB...');
      console.log(`📦 Backup será salvo em: ${backupPath}`);

      // Comando mongodump com caminho completo
      // Use caminho completo para garantir que funcione com PM2
      const mongodumpPath = process.env.MONGODUMP_PATH || 'C:\\mongodb-database-tools\\bin\\mongodump.exe';
      const command = `"${mongodumpPath}" --uri="${this.mongoConfig.uri}/${this.mongoConfig.database}" --out="${backupPath}" --gzip`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erro ao executar mongodump:', error.message);
          console.error('stderr:', stderr);
          reject(error);
          return;
        }

        console.log('✅ Backup criado com sucesso');
        if (stdout) console.log('stdout:', stdout);
        resolve({ backupPath, backupName });
      });
    });
  }

  /**
   * Compacta o backup em um arquivo ZIP
   */
  async compressBackup(backupPath, backupName) {
    return new Promise((resolve, reject) => {
      const zipPath = `${backupPath}.zip`;
      
      console.log('🗜️ Compactando backup...');

      // Usar tar no Linux/Mac ou 7z/powershell no Windows
      const isWindows = process.platform === 'win32';
      
      let command;
      if (isWindows) {
        // PowerShell Compress-Archive
        command = `powershell Compress-Archive -Path "${backupPath}\\*" -DestinationPath "${zipPath}"`;
      } else {
        // tar no Linux/Mac
        command = `tar -czf "${zipPath}" -C "${this.backupDir}" "${backupName}"`;
      }

      exec(command, async (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erro ao compactar backup:', error.message);
          reject(error);
          return;
        }

        console.log('✅ Backup compactado com sucesso');
        
        // Remover diretório descompactado
        try {
          await fs.rm(backupPath, { recursive: true, force: true });
        } catch (err) {
          console.warn('⚠️ Erro ao remover diretório temporário:', err.message);
        }

        resolve(zipPath);
      });
    });
  }

  /**
   * Faz upload do backup para o Google Drive
   */
  async uploadToDrive(filePath, fileName) {
    try {
      console.log('☁️ Fazendo upload para Google Drive...');

      const accessToken = await this.getAccessToken();
      const { folderId } = this.driveConfig;

      // Ler arquivo
      const fileContent = await fs.readFile(filePath);
      const fileSize = fileContent.length;

      console.log(`📤 Tamanho do arquivo: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      // Metadata do arquivo
      const metadata = {
        name: fileName,
        parents: [folderId],
        description: `Backup automático do MongoDB - ${new Date().toLocaleString('pt-BR')}`,
      };

      // Criar boundary para multipart
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      // Montar corpo multipart
      const multipartBody = Buffer.concat([
        Buffer.from(delimiter),
        Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
        Buffer.from(JSON.stringify(metadata)),
        Buffer.from(delimiter),
        Buffer.from('Content-Type: application/zip\r\n\r\n'),
        fileContent,
        Buffer.from(closeDelimiter),
      ]);

      // Upload para Google Drive
      const response = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        multipartBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': multipartBody.length,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const fileId = response.data.id;
      const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

      console.log('✅ Upload concluído!');
      console.log('🔗 URL:', fileUrl);

      return {
        success: true,
        fileId,
        fileUrl,
        fileName,
        size: fileSize,
      };
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error.message);
      throw error;
    }
  }

  /**
   * Remove backups locais antigos (mantém últimos 7 dias)
   */
  async cleanupOldBackups() {
    try {
      console.log('🧹 Limpando backups locais antigos...');

      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        // Se arquivo tem mais de 7 dias, remove
        if (now - stats.mtimeMs > maxAge) {
          await fs.rm(filePath, { recursive: true, force: true });
          removedCount++;
          console.log(`🗑️ Removido local: ${file}`);
        }
      }

      console.log(`✅ Limpeza local concluída: ${removedCount} arquivo(s) removido(s)`);
    } catch (error) {
      console.error('⚠️ Erro ao limpar backups locais:', error.message);
    }
  }

  /**
   * Remove backups antigos do Google Drive (mantém últimos 7)
   */
  async cleanupOldDriveBackups() {
    try {
      console.log('🧹 Limpando backups antigos do Google Drive...');

      const accessToken = await this.getAccessToken();
      const { folderId } = this.driveConfig;

      // Listar todos os arquivos de backup na pasta
      const response = await axios.get(
        'https://www.googleapis.com/drive/v3/files',
        {
          params: {
            q: `'${folderId}' in parents and trashed=false and mimeType='application/zip'`,
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime desc',
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const files = response.data.files || [];
      console.log(`📋 Total de backups no Drive: ${files.length}`);

      // Manter apenas os últimos 7
      const MAX_BACKUPS = 7;
      const filesToDelete = files.slice(MAX_BACKUPS);

      if (filesToDelete.length === 0) {
        console.log('✅ Nenhum backup antigo para remover do Drive');
        return;
      }

      console.log(`🗑️ Removendo ${filesToDelete.length} backup(s) antigo(s) do Drive...`);

      // Deletar backups antigos
      for (const file of filesToDelete) {
        try {
          await axios.delete(
            `https://www.googleapis.com/drive/v3/files/${file.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          console.log(`🗑️ Removido do Drive: ${file.name} (${new Date(file.createdTime).toLocaleDateString('pt-BR')})`);
        } catch (error) {
          console.error(`⚠️ Erro ao deletar ${file.name}:`, error.message);
        }
      }

      console.log(`✅ Limpeza do Drive concluída: ${filesToDelete.length} arquivo(s) removido(s)`);
    } catch (error) {
      console.error('⚠️ Erro ao limpar backups do Drive:', error.message);
    }
  }

  /**
   * Executa o backup completo
   */
  async executeBackup() {
    if (this.isRunning) {
      console.log('⏭️ Backup já está em execução, pulando...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║   🔄 INICIANDO BACKUP AUTOMÁTICO DO MONGODB   ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}\n`);

      // 1. Criar diretório de backups
      await this.ensureBackupDir();

      // 2. Criar backup do MongoDB
      const { backupPath, backupName } = await this.createMongoBackup();

      // 3. Compactar backup
      const zipPath = await this.compressBackup(backupPath, backupName);
      const zipFileName = `${backupName}.zip`;

      // 4. Upload para Google Drive
      const uploadResult = await this.uploadToDrive(zipPath, zipFileName);

      // 5. Remover arquivo zip local
      await fs.unlink(zipPath);

      // 6. Limpar backups locais antigos (> 7 dias)
      await this.cleanupOldBackups();

      // 7. Limpar backups antigos do Google Drive (manter últimos 7)
      await this.cleanupOldDriveBackups();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║      ✅ BACKUP CONCLUÍDO COM SUCESSO!          ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log(`📊 Estatísticas:`);
      console.log(`   - Tamanho: ${(uploadResult.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Duração: ${duration}s`);
      console.log(`   - Arquivo: ${zipFileName}`);
      console.log(`   - Drive URL: ${uploadResult.fileUrl}\n`);

      return uploadResult;
    } catch (error) {
      console.error('\n╔════════════════════════════════════════════════╗');
      console.error('║        ❌ ERRO NO BACKUP AUTOMÁTICO!           ║');
      console.error('╚════════════════════════════════════════════════╝');
      console.error(`❌ Erro: ${error.message}`);
      console.error(`📋 Stack: ${error.stack}\n`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicia o agendamento de backups diários
   * Executa todos os dias às 3:00 AM
   */
  startScheduler() {
    console.log('⏰ Agendador de backups iniciado');
    console.log('📅 Backup será executado diariamente às 3:00 AM');

    // Executar todos os dias às 3:00 AM
    // Formato cron: minuto hora dia mês dia-da-semana
    // '0 3 * * *' = às 3:00 AM todos os dias
    cron.schedule('0 3 * * *', async () => {
      console.log('\n⏰ Horário de backup agendado!');
      await this.executeBackup();
    });

    // Também executar na inicialização (opcional, remova se não quiser)
    // console.log('🚀 Executando backup inicial...');
    // this.executeBackup().catch(err => console.error('Erro no backup inicial:', err));
  }

  /**
   * Para testes: executa backup imediatamente
   */
  async testBackup() {
    console.log('🧪 Executando backup de teste...');
    return await this.executeBackup();
  }
}

// Exportar instância única (singleton)
const backupService = new BackupService();

module.exports = {
  backupService,
  BackupService,
};
