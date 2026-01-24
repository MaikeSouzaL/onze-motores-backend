/**
 * Serviço Google Drive
 * Upload e delete de arquivos (imagens e PDFs)
 */

import { google } from "googleapis";
import { Readable } from "stream";

// ID da pasta no Google Drive
const FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID ||
  process.env.DRIVE_BACKUP_FOLDER_ID ||
  "";

function getPrivateKeyFromEnv(rawKey) {
  if (!rawKey) return undefined;
  // Normaliza quebras de linha quando vem de ENV com \n
  return rawKey.replace(/\\n/g, "\n");
}

/**
 * Criar cliente autenticado do Google Drive
 */
function getGoogleDriveClient() {
  // 1) Service Account (preferencial no backend)
  const saClientEmail =
    process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const saPrivateKey = getPrivateKeyFromEnv(
    process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_DRIVE_PRIVATE_KEY,
  );

  if (saClientEmail && saPrivateKey) {
    const auth = new google.auth.JWT({
      email: saClientEmail,
      key: saPrivateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  }

  // 2) OAuth2 (fallback) - usa credenciais do app (já existem no .env)
  const oauth2ClientId = process.env.DRIVE_CLIENT_ID;
  const oauth2ClientSecret = process.env.DRIVE_CLIENT_SECRET;
  const oauth2RefreshToken = process.env.DRIVE_REFRESH_TOKEN;

  if (oauth2ClientId && oauth2ClientSecret && oauth2RefreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      oauth2ClientId,
      oauth2ClientSecret,
    );

    oauth2Client.setCredentials({
      refresh_token: oauth2RefreshToken,
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  }

  throw new Error(
    "Credenciais do Google Drive ausentes. Configure Service Account (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY ou GOOGLE_DRIVE_CLIENT_EMAIL/GOOGLE_DRIVE_PRIVATE_KEY) ou OAuth2 (DRIVE_CLIENT_ID/DRIVE_CLIENT_SECRET/DRIVE_REFRESH_TOKEN).",
  );
}

/**
 * Upload de imagem para Google Drive
 * @param {string} imageBase64 - Imagem em base64
 * @param {string} fileName - Nome do arquivo
 * @returns {Promise<{url: string, fileId: string}>}
 */
export async function uploadImageToDrive(imageBase64, fileName) {
  try {
    const drive = getGoogleDriveClient();

    // Converter base64 para buffer
    const buffer = Buffer.from(imageBase64, "base64");
    const stream = Readable.from(buffer);

    // Detectar tipo MIME da imagem
    let mimeType = "image/jpeg";
    if (imageBase64.startsWith("/9j/")) mimeType = "image/jpeg";
    else if (imageBase64.startsWith("iVBOR")) mimeType = "image/png";
    else if (imageBase64.startsWith("R0lGOD")) mimeType = "image/gif";

    // Metadata do arquivo
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    };

    const media = {
      mimeType,
      body: stream,
    };

    // Upload
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = response.data.id;

    // Tornar arquivo público
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // URL pública
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

    console.log(`✅ Imagem enviada para Google Drive: ${fileName}`);

    return { url, fileId };
  } catch (error) {
    console.error("❌ Erro ao fazer upload de imagem:", error);
    throw new Error("Falha no upload da imagem: " + error.message);
  }
}

/**
 * Upload de PDF para Google Drive
 * @param {string} pdfBase64 - PDF em base64
 * @param {string} fileName - Nome do arquivo
 * @returns {Promise<{url: string, fileId: string}>}
 */
export async function uploadPdfToDrive(pdfBase64, fileName) {
  try {
    const drive = getGoogleDriveClient();

    // Converter base64 para buffer
    const buffer = Buffer.from(pdfBase64, "base64");
    const stream = Readable.from(buffer);

    // Metadata do arquivo
    const fileMetadata = {
      name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
      parents: [FOLDER_ID],
    };

    const media = {
      mimeType: "application/pdf",
      body: stream,
    };

    // Upload
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = response.data.id;

    // Tornar arquivo público
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // URL pública para download direto
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    console.log(`✅ PDF enviado para Google Drive: ${fileName}`);

    return { url, fileId };
  } catch (error) {
    console.error("❌ Erro ao fazer upload de PDF:", error);
    throw new Error("Falha no upload do PDF: " + error.message);
  }
}

/**
 * Deletar arquivo do Google Drive
 * @param {string} fileId - ID do arquivo no Google Drive
 * @returns {Promise<boolean>}
 */
export async function deleteFileFromDrive(fileId) {
  try {
    const drive = getGoogleDriveClient();

    await drive.files.delete({
      fileId,
    });

    console.log(`✅ Arquivo deletado do Google Drive: ${fileId}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao deletar arquivo:", error);
    throw new Error("Falha ao deletar arquivo: " + error.message);
  }
}

/**
 * Listar arquivos em uma pasta
 * @param {string} folderId - ID da pasta (opcional, usa FOLDER_ID se não informado)
 * @returns {Promise<Array>}
 */
export async function listFilesInFolder(folderId = FOLDER_ID) {
  try {
    const drive = getGoogleDriveClient();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType, size, createdTime, webViewLink)",
      pageSize: 100,
    });

    return response.data.files || [];
  } catch (error) {
    console.error("❌ Erro ao listar arquivos:", error);
    throw new Error("Falha ao listar arquivos: " + error.message);
  }
}
